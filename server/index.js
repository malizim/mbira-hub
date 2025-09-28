import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { Server as IOServer } from 'socket.io';
import ffmpeg from 'fluent-ffmpeg';
import url from 'url';
import { WebSocketServer } from 'ws';
import { hashPassword, verifyPassword, generateToken, verifyToken, checkSessionAccess } from './auth.js';
import { createSession, getSession, getAllSessions, updateSession, deleteSession, addTake, deleteTake } from './database.js';
import { detectInstrument, detectNotesRealtime } from './detection.js';
import { generateMusicSheet } from './music-sheet.js';
import { InstrumentTraining } from './instrument-training.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Config
const DATA = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CERT_DIR = process.env.CERT_DIR || path.join(__dirname, '..', 'certs');
const PORT = Number(process.env.PORT || 8443);
const WS_PORT = Number(process.env.WS_PORT || 8766);

// Ensure dirs
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(path.join(__dirname, '..', 'web'), { recursive: true });
fs.mkdirSync(path.join(__dirname, '..', 'sessions'), { recursive: true });

// Static web
app.use('/', express.static(path.join(__dirname, '..', 'web')));
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

const upload = multer({ dest: path.join(DATA, '_tmp') });

// Helper functions
function clean(s) { 
    return (s || '').replace(/[^\w\- .]/g, '').trim(); 
}

function nextIndex(dir, prefix) {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    let max = 0;
    for (const f of files) {
        if (f.startsWith(prefix)) {
            const m = f.match(new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)\\.wav$'));
            if (m) max = Math.max(max, Number(m[1]));
        }
    }
    return max + 1;
}

// Real-time note detection state
const noteDetectionState = {
    isDetecting: false,
    currentNote: '',
    frequency: 0,
    noteSequence: [],
    noteCount: 0,
    duration: '00:00',
    startTime: null
};

// Instrument training system
const instrumentTraining = new InstrumentTraining();

// API Routes
app.post('/api/sessions', async (req, res) => {
    try {
        const { name = '', password = '' } = req.body || {};
        if (!name || !password) {
            return res.status(400).json({ error: 'Name and password are required' });
        }
        const sid = `${clean(name) || 'Session'}_${Date.now().toString(36)}`;
        const hashedPassword = hashPassword(password);
        
        await createSession({
            id: sid,
            name: clean(name) || sid,
            password: hashedPassword,
            instruments: [],
            takes: [],
            noteSequence: []
        });
        
        fs.mkdirSync(path.join(DATA, sid, 'recordings'), { recursive: true });
        res.json({ ok: true, id: sid });
    } catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    };
    res.json(health);
});

app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await getAllSessions();
        res.json({ ok: true, sessions });
    } catch (error) {
        console.error('Error getting sessions:', error);
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

app.get('/api/sessions/:sid', async (req, res) => {
    try {
        const s = await getSession(req.params.sid);
        if (!s) return res.status(404).json({ ok: false, error: 'not found' });
        res.json({ ok: true, session: s });
    } catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ error: 'Failed to get session' });
    }
});

// Real-time note detection endpoint
app.post('/api/sessions/:sid/detect-notes', async (req, res) => {
    try {
        const { audioBlob } = req.body;
        if (!audioBlob) {
            return res.status(400).json({ error: 'No audio data provided' });
        }
        
        const result = await detectNotesRealtime(audioBlob);
        res.json({ ok: true, ...result });
    } catch (error) {
        console.error('Real-time detection error:', error);
        res.status(500).json({ error: 'Detection failed' });
    }
});

// Music sheet generation endpoint
app.post('/api/sessions/:sid/music-sheet', async (req, res) => {
    try {
        const { noteSequence, format = 'pdf' } = req.body;
        if (!noteSequence || !Array.isArray(noteSequence)) {
            return res.status(400).json({ error: 'Note sequence required' });
        }
        
        const musicSheet = await generateMusicSheet(noteSequence, format);
        res.json({ ok: true, musicSheet });
    } catch (error) {
        console.error('Music sheet generation error:', error);
        res.status(500).json({ error: 'Failed to generate music sheet' });
    }
});

// Instrument training endpoints
app.get('/api/instruments', (req, res) => {
    try {
        const instruments = instrumentTraining.listTrainedInstruments();
        res.json({ ok: true, instruments });
    } catch (error) {
        console.error('Error listing instruments:', error);
        res.status(500).json({ error: 'Failed to list instruments' });
    }
});

app.post('/api/instruments/:name/train', upload.single('audio'), async (req, res) => {
    try {
        const instrumentName = req.params.name;
        const { sampleIndex, totalSamples, noteName } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        
        // Convert audio file to samples
        const audioData = fs.readFileSync(req.file.path);
        
        // Ensure buffer length is multiple of 4 for Float32Array
        const bufferLength = audioData.length;
        const paddedLength = Math.ceil(bufferLength / 4) * 4;
        const paddedBuffer = Buffer.alloc(paddedLength);
        audioData.copy(paddedBuffer);
        
        const samples = new Float32Array(paddedBuffer.buffer, 0, Math.floor(bufferLength / 4));
        
        // Analyze the sample
        const analysis = instrumentTraining.analyzeTrainingSample(samples);
        
        // Clean up temp file
        fs.unlink(req.file.path, () => {});
        
        res.json({ 
            ok: true, 
            analysis,
            sampleIndex: parseInt(sampleIndex),
            totalSamples: parseInt(totalSamples),
            noteName: noteName || instrumentTraining.frequencyToNote(analysis.frequency)
        });
    } catch (error) {
        console.error('Training analysis error:', error);
        res.status(500).json({ error: 'Failed to analyze training sample' });
    }
});

app.post('/api/instruments/:name/complete', async (req, res) => {
    try {
        const instrumentName = req.params.name;
        const { trainingSamples } = req.body;
        
        if (!trainingSamples || !Array.isArray(trainingSamples)) {
            return res.status(400).json({ error: 'Training samples required' });
        }
        
        const instrumentData = await instrumentTraining.trainInstrument(instrumentName, trainingSamples);
        
        if (instrumentData) {
            res.json({ ok: true, instrument: instrumentData });
        } else {
            res.status(500).json({ error: 'Failed to save instrument data' });
        }
    } catch (error) {
        console.error('Instrument training error:', error);
        res.status(500).json({ error: 'Failed to complete instrument training' });
    }
});

app.get('/api/instruments/:name', (req, res) => {
    try {
        const instrumentName = req.params.name;
        const instrumentData = instrumentTraining.loadInstrumentData(instrumentName);
        
        if (instrumentData) {
            res.json({ ok: true, instrument: instrumentData });
        } else {
            res.status(404).json({ error: 'Instrument not found' });
        }
    } catch (error) {
        console.error('Error loading instrument:', error);
        res.status(500).json({ error: 'Failed to load instrument' });
    }
});

app.delete('/api/instruments/:name', (req, res) => {
    try {
        const instrumentName = req.params.name;
        const deleted = instrumentTraining.deleteInstrument(instrumentName);
        
        if (deleted) {
            res.json({ ok: true });
        } else {
            res.status(404).json({ error: 'Instrument not found' });
        }
    } catch (error) {
        console.error('Error deleting instrument:', error);
        res.status(500).json({ error: 'Failed to delete instrument' });
    }
});

app.post('/api/instruments/:name/detect', upload.single('audio'), async (req, res) => {
    try {
        const instrumentName = req.params.name;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        
        // Convert audio file to samples
        const audioData = fs.readFileSync(req.file.path);
        const samples = new Float32Array(audioData.buffer);
        
        // Detect note using trained instrument
        const detection = instrumentTraining.detectNoteWithInstrument(samples, instrumentName);
        
        // Clean up temp file
        fs.unlink(req.file.path, () => {});
        
        res.json({ ok: true, detection });
    } catch (error) {
        console.error('Instrument detection error:', error);
        res.status(500).json({ error: 'Failed to detect note' });
    }
});

// Upload with real-time note detection
app.post('/api/sessions/:sid/upload', upload.single('audio'), async (req, res) => {
    try {
        const sid = req.params.sid;
        const s = await getSession(sid);
        if (!s) return res.status(404).json({ ok: false, error: 'not found' });
        
        let instrument = clean(req.body.instrument || 'unknown');
        const user = clean(req.body.user || '');
        const layer_from = (req.body.layer_from || '').split(',').map(v => v.trim()).filter(Boolean);
        const noteSequence = req.body.noteSequence ? JSON.parse(req.body.noteSequence) : [];
        
        // Auto-detect instrument if not specified
        if (instrument === 'unknown' || !instrument) {
            const audioBlob = fs.readFileSync(req.file.path);
            const detection = await detectInstrument(audioBlob);
            instrument = detection.instrument;
            console.log(`Auto-detected instrument: ${instrument} (confidence: ${detection.confidence})`);
        }
        
        const recDir = path.join(DATA, sid, 'recordings');
        fs.mkdirSync(recDir, { recursive: true });
        const proj = clean(s.name) || sid;

        const recPrefix = `${proj} - ${instrument} - Recording `;
        const mixPrefix = `${proj} - ${instrument} - Mixed `;
        const soloName = `${recPrefix}${nextIndex(recDir, recPrefix)}.wav`;
        const soloPath = path.join(recDir, soloName);

        // Convert webm/ogg to wav 44.1k mono
        await new Promise((resolve, reject) => {
            ffmpeg(req.file.path).outputOptions(['-ar 44100', '-ac 1', '-f wav'])
                .on('end', resolve).on('error', reject).save(soloPath);
        }).catch(e => {
            console.error('ffmpeg convert error', e);
        });
        fs.unlink(req.file.path, () => {});

        const soloTake = { 
            file: soloName, 
            instrument, 
            user, 
            parents: layer_from, 
            type: 'solo',
            noteSequence: noteSequence
        };
        await addTake(sid, soloTake);

        // Update session with note sequence
        await updateSession(sid, { noteSequence: [...(s.noteSequence || []), ...noteSequence] });

        let mixTake = null;
        if (layer_from.length) {
            const mixName = `${mixPrefix}${nextIndex(recDir, mixPrefix)}.wav`;
            const mixPath = path.join(recDir, mixName);
            const parents = layer_from.map(f => path.join(recDir, f)).filter(p => fs.existsSync(p));
            if (parents.length) {
                await new Promise((resolve, reject) => {
                    const cmd = ffmpeg();
                    [...parents, soloPath].forEach(p => cmd.input(p));
                    
                    // Professional mixing with proper normalization and limiting
                    const mixFilter = [
                        `[0:a]volume=0.8[a0]`,
                        `[1:a]volume=0.8[a1]`,
                        `[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2[mix]`,
                        `[mix]alimiter=level_in=1:level_out=0.9:limit=0.9:attack=5:release=50[out]`
                    ];
                    
                    cmd.complexFilter(mixFilter)
                        .outputOptions([
                            '-map', '[out]',
                            '-ar', '44100',
                            '-ac', '1',
                            '-f', 'wav',
                            '-avoid_negative_ts', 'make_zero'
                        ])
                        .on('end', resolve)
                        .on('error', reject)
                        .save(mixPath);
                }).catch(e => console.error('ffmpeg mix error', e));
                if (fs.existsSync(mixPath)) {
                    mixTake = { 
                        file: mixName, 
                        instrument: 'mix', 
                        user, 
                        parents: [...layer_from, soloName], 
                        type: 'mix',
                        noteSequence: noteSequence
                    };
                    await addTake(sid, mixTake);
                }
            }
        }

        io.to(sid).emit('session:update', { sid, noteSequence });
        res.json({ ok: true, takes: [soloTake, ...(mixTake ? [mixTake] : [])] });
    } catch (error) {
        console.error('Error uploading take:', error);
        res.status(500).json({ error: 'Failed to upload take' });
    }
});

// Other existing routes...
app.get('/api/sessions/:sid/recordings/:file', (req, res) => {
    const p = path.join(DATA, req.params.sid, 'recordings', req.params.file);
    if (!fs.existsSync(p)) return res.status(404).end();
    res.type('wav');
    fs.createReadStream(p).pipe(res);
});

app.post('/api/sessions/:sid/detect', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }
        
        const audioBlob = fs.readFileSync(req.file.path);
        const result = await detectInstrument(audioBlob);
        fs.unlink(req.file.path, () => {});
        res.json({ ok: true, ...result });
    } catch (error) {
        console.error('Detection error:', error);
        res.status(500).json({ error: 'Detection failed' });
    }
});

app.delete('/api/sessions/:sid/recordings/:file', async (req, res) => {
    try {
        const sid = req.params.sid;
        const s = await getSession(sid);
        if (!s) return res.status(404).json({ ok: false, error: 'not found' });
        
        const p = path.join(DATA, sid, 'recordings', req.params.file);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        
        await deleteTake(sid, req.params.file);
        io.to(sid).emit('session:update', { sid });
        res.json({ ok: true });
    } catch (error) {
        console.error('Error deleting recording:', error);
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});

// Authentication routes
app.post('/api/sessions/:sid/join', async (req, res) => {
    try {
        const sid = req.params.sid;
        const s = await getSession(sid);
        if (!s) return res.status(404).json({ error: 'Session not found' });
        
        const { password = '' } = req.body || {};
        const access = checkSessionAccess(password, s.password);
        
        if (!access.ok) {
            return res.status(403).json({ error: access.error });
        }
        
        const token = generateToken(sid, access.role);
        res.json({ ok: true, token, role: access.role });
    } catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ error: 'Failed to join session' });
    }
});

app.post('/api/sessions/:sid/delete', async (req, res) => {
    try {
        const sid = req.params.sid;
        const s = await getSession(sid);
        if (!s) return res.status(404).json({ error: 'Session not found' });
        
        const { password = '' } = req.body || {};
        const access = checkSessionAccess(password, s.password);
        
        if (!access.ok) {
            return res.status(403).json({ error: access.error });
        }
        
        const sessionDir = path.join(DATA, sid);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        await deleteSession(sid);
        
        res.json({ ok: true });
    } catch (error) {
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// Download entire session as ZIP
app.get('/api/sessions/:sid/download', async (req, res) => {
    try {
        const sid = req.params.sid;
        const s = await getSession(sid);
        if (!s) return res.status(404).json({ error: 'Session not found' });
        
        const sessionDir = path.join(DATA, sid, 'recordings');
        if (!fs.existsSync(sessionDir)) {
            return res.status(404).json({ error: 'No recordings found' });
        }
        
        const files = fs.readdirSync(sessionDir);
        if (files.length === 0) {
            return res.status(404).json({ error: 'No recordings found' });
        }
        
        // Create a simple text file with session info
        const sessionInfo = {
            name: s.name,
            created: s.created,
            instruments: s.instruments,
            noteSequence: s.noteSequence,
            takes: s.takes.map(t => ({
                file: t.file,
                instrument: t.instrument,
                user: t.user,
                type: t.type
            }))
        };
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${s.name || sid}-session.json"`);
        res.json(sessionInfo);
    } catch (error) {
        console.error('Error downloading session:', error);
        res.status(500).json({ error: 'Failed to download session' });
    }
});

app.post('/api/sessions/:sid/finish', async (req, res) => {
    try {
        const sid = req.params.sid;
        const s = await getSession(sid);
        if (!s) return res.status(404).json({ error: 'Session not found' });
        
        const { files } = req.body || {};
        const filesToMix = files || s.takes.map(t => t.file).filter(f => f);
        
        if (!filesToMix.length) {
            return res.status(400).json({ error: 'No takes to master' });
        }
        
        const recDir = path.join(DATA, sid, 'recordings');
        const projectName = clean(s.name) || sid;
        const wavPath = path.join(recDir, `${projectName}.wav`);
        const mp3Path = path.join(recDir, `${projectName}.mp3`);
        
        const filePaths = filesToMix.map(f => path.join(recDir, f)).filter(p => fs.existsSync(p));
        
        if (filePaths.length === 0) {
            return res.status(404).json({ error: 'No valid files found' });
        }
        
        const cmd = ffmpeg();
        filePaths.forEach(p => cmd.input(p));
        
        // Professional master mix with proper EQ and limiting
        const masterFilter = [
            `[0:a]volume=0.7[a0]`,
            `[1:a]volume=0.7[a1]`,
            `[a0][a1]amix=inputs=2:duration=longest:dropout_transition=2[mix]`,
            `[mix]aecho=0.8:0.88:60:0.4[echo]`,
            `[echo]alimiter=level_in=1:level_out=0.95:limit=0.95:attack=7:release=100[master]`
        ];
        
        cmd.complexFilter(masterFilter)
            .outputOptions([
                '-map', '[master]',
                '-ar', '44100',
                '-ac', '1',
                '-f', 'wav',
                '-avoid_negative_ts', 'make_zero'
            ])
            .save(wavPath)
            .on('end', () => {
                ffmpeg(wavPath)
                    .output(mp3Path)
                    .on('end', () => {
                        updateSession(sid, { updated: new Date().toISOString() });
                        res.json({ 
                            ok: true, 
                            wav: `/api/sessions/${sid}/recordings/${path.basename(wavPath)}`,
                            mp3: `/api/sessions/${sid}/recordings/${path.basename(mp3Path)}`
                        });
                    })
                    .on('error', (err) => {
                        console.error('MP3 conversion error:', err);
                        res.json({ 
                            ok: true, 
                            wav: `/api/sessions/${sid}/recordings/${path.basename(wavPath)}`
                        });
                    });
            })
            .on('error', (err) => {
                console.error('Mix error:', err);
                res.status(400).json({ error: 'Failed to create mix' });
            });
    } catch (error) {
        console.error('Error finishing session:', error);
        res.status(500).json({ error: 'Failed to finish session' });
    }
});

// WebSocket server for real-time note detection
const serverFactory = () => {
    const certPath = path.join(CERT_DIR, 'cert.pem');
    const keyPath = path.join(CERT_DIR, 'key.pem');
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        const server = https.createServer({ 
            cert: fs.readFileSync(certPath), 
            key: fs.readFileSync(keyPath) 
        }, app);
        const io = new IOServer(server, { cors: { origin: true, credentials: true } });
        return { server, io, https: true };
    } else {
        const server = http.createServer(app);
        const io = new IOServer(server, { cors: { origin: true, credentials: true } });
        return { server, io, https: false };
    }
};

const { server, io, https: usingHttps } = serverFactory();

// Socket.IO for session updates
io.on('connection', (socket) => {
    socket.on('join-session', (sid) => socket.join(sid));
    socket.on('note-detection', (data) => {
        socket.to(data.sessionId).emit('live-note', data);
    });
});

// WebSocket server for real-time note detection
const wss = new WebSocketServer({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('Real-time note detection client connected');
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'note-detection') {
                // Broadcast to all connected clients
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === 1) {
                        client.send(JSON.stringify({
                            type: 'live-note',
                            note: message.note,
                            frequency: message.frequency,
                            sequence: message.sequence,
                            timestamp: Date.now()
                        }));
                    }
                });
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('Real-time note detection client disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`🎵 Mbira Recording Session listening on ${usingHttps ? 'https' : 'http'}://0.0.0.0:${PORT}`);
    console.log(`🔗 Real-time WebSocket: ws://0.0.0.0:${WS_PORT}`);
    console.log('📁 Data dir:', DATA);
});
