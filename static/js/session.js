const sid = window.PAGE_SID;
const rawIdEl = document.getElementById('rawId');
const prettyEl = document.getElementById('prettyName');

function friendlyName(id) {
    const base = id.split('_')[0];
    return base.replace(/[-_]/g, ' ').replace(/\b\w/g, m => m.toUpperCase());
}

rawIdEl.textContent = sid;
prettyEl.textContent = friendlyName(sid);
if (window.PREFILL_INSTRUMENT) document.getElementById('instrumentName').value = window.PREFILL_INSTRUMENT;

let joined = false, mediaRecorder, chunks = [];
let currentMicId = localStorage.getItem('rs.micId') || null;
let currentOutId = localStorage.getItem('rs.outId') || null;
const playbackEl = document.getElementById('playback');

// Real-time note detection variables
let audioContext, analyser, microphone;
let isDetecting = false;
let noteSequence = [];
let currentNoteIndex = 0;
let playbackStartTime = 0;
let playbackInterval = null;
let lastDetectedNote = '';
let lastNoteTime = 0;
let lastMaxValue = 0;
const noteDebounceTime = 1000; // ms - increased to prevent sustained note repeats

// Audio level calibration for different devices
let audioLevelCalibration = {
    enabled: false,
    baselineLevel: 0,
    sensitivityMultiplier: 1.0,
    adaptiveThreshold: 60, // Lower default threshold for mobile devices
    maxThreshold: 200,
    minThreshold: 20,
    calibrationSamples: [],
    isCalibrating: false
};

// WebSocket connections
let socket;
let noteDetectionSocket;

const params = new URLSearchParams(location.search);
if (params.get('autojoin') === '1') { joined = true; }

const userInput = document.getElementById('userName');
const storedUser = localStorage.getItem('rs.userName');
if (storedUser) userInput.value = storedUser;
userInput.addEventListener('change', () => localStorage.setItem('rs.userName', userInput.value.trim()));

// Note mapping for real-time detection
const NOTE_MAPPING = {
    'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
    'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
    'F5': 698.46, 'G5': 783.99, 'A5': 880.00
};

async function getMicStream() {
    const c = { audio: currentMicId ? { deviceId: { exact: currentMicId } } : true };
    return await navigator.mediaDevices.getUserMedia(c);
}

async function populateDevices() {
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) {}
    const devs = await navigator.mediaDevices.enumerateDevices();
    const mics = devs.filter(d => d.kind === 'audioinput');
    const outs = devs.filter(d => d.kind === 'audiooutput');
    
    const micSel = document.getElementById('micSelect');
    micSel.innerHTML = '';
    mics.forEach(d => {
        const o = document.createElement('option');
        o.value = d.deviceId;
        o.textContent = d.label || 'Microphone';
        if (currentMicId && d.deviceId === currentMicId) o.selected = true;
        micSel.appendChild(o);
    });
    if (!currentMicId && mics[0]) currentMicId = mics[0].deviceId;
    
    const outSel = document.getElementById('outSelect');
    const outHelp = document.getElementById('outHelp');
    outSel.innerHTML = '';
    outs.forEach(d => {
        const o = document.createElement('option');
        o.value = d.deviceId;
        o.textContent = d.label || 'Output';
        if (currentOutId && d.deviceId === currentOutId) o.selected = true;
        outSel.appendChild(o);
    });
    if (!currentOutId && outs[0]) currentOutId = outs[0].deviceId;
    
    if (typeof playbackEl.setSinkId === 'function') {
        outHelp.textContent = 'Output device switching supported.';
        if (currentOutId) {
            try { await playbackEl.setSinkId(currentOutId); } catch (e) {}
        }
    } else {
        outHelp.textContent = 'Output device switching not supported in this browser.';
    }
    
    micSel.onchange = () => { currentMicId = micSel.value; localStorage.setItem('rs.micId', currentMicId); };
    outSel.onchange = async () => {
        currentOutId = outSel.value;
        localStorage.setItem('rs.outId', currentOutId);
        if (typeof playbackEl.setSinkId === 'function') {
            try { await playbackEl.setSinkId(currentOutId); } catch (e) { alert('Could not switch output: ' + e); }
        }
    };
}

let collapseState = {};

async function refreshSession() {
    const r = await fetch(`/api/sessions/${sid}`);
    const s = await r.json();
    if (s.error) return;
    
    const ul = document.getElementById('instrumentList');
    ul.innerHTML = '';
    (s.session.instruments || []).forEach(i => {
        const li = document.createElement('li');
        li.textContent = i;
        ul.appendChild(li);
    });
    
    const tl = document.getElementById('takesList');
    tl.innerHTML = '';
    const takes = s.session.takes || [];
    const byName = Object.fromEntries(takes.map(t => [t.file, t]));
    const children = {};
    takes.forEach(t => {
        (t.parents || []).forEach(p => {
            children[p] = children[p] || [];
            children[p].push(t.file);
        });
    });

    function renderRow(file, indent = 0, container) {
        const t = byName[file];
        if (!t) return;
        const row = document.createElement('div');
        row.className = 'take-row ' + (indent ? ('take-indent-' + Math.min(indent, 2)) : '');
        const meta = document.createElement('div');
        meta.className = 'take-meta';
        const who = t.user ? `${t.user} — ` : '';
        const label = `${who}${t.instrument} — ${t.file}`;
        const kids = children[file] || [];
        let chev = null;
        if (kids.length) {
            chev = document.createElement('span');
            chev.className = 'chev' + (collapseState[file] ? ' off' : '');
            chev.textContent = collapseState[file] ? '▸' : '▾';
            chev.title = collapseState[file] ? 'Expand children' : 'Collapse children';
            chev.onclick = () => { collapseState[file] = !collapseState[file]; refreshSession(); };
            meta.appendChild(chev);
        }
        const text = document.createElement('span');
        text.textContent = label;
        meta.appendChild(text);
        const controls = document.createElement('div');
        controls.className = 'audio-wrap';
        const audio = document.createElement('audio');
        audio.className = 'take-audio';
        audio.controls = true;
        audio.src = `/api/sessions/${sid}/recordings/${encodeURIComponent(t.file)}`;
        
        // Add synchronized playback highlighting
        audio.addEventListener('play', () => startSynchronizedPlayback(t.noteSequence || [], audio));
        audio.addEventListener('pause', () => stopSynchronizedPlayback());
        audio.addEventListener('ended', () => stopSynchronizedPlayback());
        
        const del = document.createElement('button');
        del.className = 'btn-del';
        del.textContent = 'Delete';
        del.onclick = async () => {
            if (!confirm('Delete this recording?')) return;
            const rr = await fetch(`/api/sessions/${sid}/recordings/${encodeURIComponent(t.file)}`, { method: 'DELETE' });
            const dd = await rr.json();
            if (dd.ok) refreshSession(); else alert(dd.error || 'Delete failed');
        };
        controls.append(audio, del);
        row.append(meta, controls);
        container.appendChild(row);

        if (kids.length && !collapseState[file]) {
            const wrap = document.createElement('div');
            wrap.className = 'take-children';
            container.appendChild(wrap);
            kids.forEach(cf => renderRow(cf, indent + 1, wrap));
        }
    }

    const roots = takes.filter(t => (!t.parents || t.parents.length === 0)).map(t => t.file);
    roots.forEach(f => renderRow(f, 0, tl));

    // Build the selection list for mixing
    const mw = document.getElementById('mixSelect');
    mw.innerHTML = '';
    takes.forEach(t => {
        const lab = document.createElement('label');
        lab.className = 'block text-sm';
        lab.innerHTML = `<input type="checkbox" value="${t.file}" class="mr-2"> ${t.user ? t.user + ' — ' : ''}${t.instrument} — ${t.file}`;
        mw.appendChild(lab);
    });
}

// Synchronized playback highlighting
function startSynchronizedPlayback(notes, audioElement) {
    if (!notes || notes.length === 0) return;
    
    noteSequence = notes;
    currentNoteIndex = 0;
    playbackStartTime = audioElement.currentTime;
    
    // Update note sequence display with highlighting
    updateNoteSequenceDisplay(true);
    
    playbackInterval = setInterval(() => {
        const currentTime = audioElement.currentTime - playbackStartTime;
        const noteIndex = Math.floor(currentTime * 2); // Assuming 0.5 seconds per note
        
        if (noteIndex !== currentNoteIndex && noteIndex < noteSequence.length) {
            currentNoteIndex = noteIndex;
            updateNoteSequenceDisplay(true);
        }
    }, 100);
}

function stopSynchronizedPlayback() {
    if (playbackInterval) {
        clearInterval(playbackInterval);
        playbackInterval = null;
    }
    currentNoteIndex = 0;
    updateNoteSequenceDisplay(false);
}

function updateNoteSequenceDisplay(highlight = false) {
    const sequenceElement = document.getElementById('noteSequence');
    if (!sequenceElement) return;
    
    if (noteSequence.length === 0) {
        sequenceElement.innerHTML = 'No notes recorded';
        return;
    }
    
    const displayNotes = noteSequence.slice(-50);
    const html = displayNotes.map((note, index) => {
        const isCurrent = highlight && index === currentNoteIndex;
        const className = isCurrent ? 'bg-yellow-300 text-black px-1 rounded' : '';
        return `<span class="${className}">${note}</span>`;
    }).join(' - ');
    
    sequenceElement.innerHTML = html;
    sequenceElement.scrollLeft = sequenceElement.scrollWidth;
}

// Real-time note detection
async function startRealTimeDetection() {
    try {
        const stream = await getMicStream();
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0.3;
        microphone.connect(analyser);
        
        isDetecting = true;
        noteSequence = [];
        
        // Update button states with visual feedback
        const startBtn = document.getElementById('startDetection');
        const stopBtn = document.getElementById('stopDetection');
        
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        stopBtn.disabled = false;
        stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('currentNote').textContent = 'Listening...';
        document.getElementById('currentFreq').textContent = '0 Hz';
        
        detectNotesRealtime();
    } catch (error) {
        alert('Microphone access required! Error: ' + error.message);
    }
}

function stopRealTimeDetection() {
    isDetecting = false;
    if (audioContext) audioContext.close();
    
    // Update button states with visual feedback
    const startBtn = document.getElementById('startDetection');
    const stopBtn = document.getElementById('stopDetection');
    
    startBtn.disabled = false;
    startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    stopBtn.disabled = true;
    stopBtn.classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('currentNote').textContent = 'Stopped';
    document.getElementById('currentFreq').textContent = '0 Hz';
}

function detectNotesRealtime() {
    if (!isDetecting) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    let maxValue = 0;
    let maxIndex = 0;
    
    const sampleRate = audioContext.sampleRate;
    const minBin = Math.floor(80 * bufferLength / (sampleRate / 2));
    const maxBin = Math.floor(1200 * bufferLength / (sampleRate / 2));
    
    for (let i = minBin; i < maxBin && i < dataArray.length; i++) {
        if (dataArray[i] > maxValue) {
            maxValue = dataArray[i];
            maxIndex = i;
        }
    }
    
    // Use adaptive threshold based on device calibration
    const threshold = audioLevelCalibration.enabled ? audioLevelCalibration.adaptiveThreshold : 60;
    
    // Collect calibration samples if calibrating
    if (audioLevelCalibration.isCalibrating) {
        audioLevelCalibration.calibrationSamples.push(maxValue);
    }
    
    // Only process if we have a strong signal
    if (maxValue > threshold) {
        const frequency = maxIndex * (sampleRate / 2) / bufferLength;
        const noteInfo = frequencyToNote(frequency);
        
        const currentNoteEl = document.getElementById('currentNote');
        const currentFreqEl = document.getElementById('currentFreq');
        
        if (currentNoteEl) currentNoteEl.textContent = noteInfo.note;
        if (currentFreqEl) currentFreqEl.textContent = frequency.toFixed(1) + ' Hz';
        
        // Update audio level indicator
        const levelPercent = Math.min(100, (maxValue / 255) * 100);
        const levelBar = document.getElementById('audioLevelBar');
        const levelText = document.getElementById('audioLevelText');
        if (levelBar) {
            levelBar.style.width = levelPercent + '%';
            levelBar.className = levelPercent > 70 ? 'bg-green-500 h-2 rounded-full transition-all duration-100' : 
                                levelPercent > 40 ? 'bg-yellow-500 h-2 rounded-full transition-all duration-100' : 
                                'bg-red-500 h-2 rounded-full transition-all duration-100';
        }
        if (levelText) {
            levelText.textContent = Math.round(maxValue);
        }
        
        if (noteInfo.inScale) {
            if (currentNoteEl) currentNoteEl.style.color = '#00ff88'; // Green
        } else {
            if (currentNoteEl) currentNoteEl.style.color = '#ffaa00'; // Orange
        }
        
        // Only add to sequence if signal is increasing (note attack) or different note
        const now = Date.now();
        const isSignalIncrease = maxValue > lastMaxValue + 20; // Significant increase
        const isDifferentNote = noteInfo.note !== lastDetectedNote;
        const isTimeElapsed = (now - lastNoteTime) > noteDebounceTime;
        
        if ((isSignalIncrease || isDifferentNote) && isTimeElapsed) {
            noteSequence.push(noteInfo.note);
            updateNoteSequenceDisplay();
            lastDetectedNote = noteInfo.note;
            lastNoteTime = now;
            
            // Send to WebSocket for real-time sharing
            if (noteDetectionSocket && noteDetectionSocket.readyState === WebSocket.OPEN) {
                noteDetectionSocket.send(JSON.stringify({
                    type: 'note-detection',
                    note: noteInfo.note,
                    frequency: frequency,
                    sequence: noteSequence
                }));
            }
        }
        
        lastMaxValue = maxValue;
    } else {
        // No strong signal
        const currentFreqEl = document.getElementById('currentFreq');
        if (currentFreqEl) currentFreqEl.textContent = 'Listening...';
        lastMaxValue = 0;
    }
    
    requestAnimationFrame(detectNotesRealtime);
}

function frequencyToNote(frequency) {
    // Find closest expected note (same logic as Python)
    let closestNote = '';
    let closestDistance = Infinity;
    
    for (const [noteName, noteFreq] of Object.entries(NOTE_MAPPING)) {
        const distance = Math.abs(frequency - noteFreq);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestNote = noteName;
        }
    }
    
    return {
        note: closestNote,
        frequency: frequency,
        inScale: closestDistance < 30 // Within 30 Hz tolerance (same as Python)
    };
}

// Music sheet generation
async function generateMusicSheet(format) {
    try {
        if (!noteSequence || noteSequence.length === 0) {
            alert('No notes recorded yet. Start playing to generate a music sheet!');
            return;
        }
        
        const response = await fetch(`/api/sessions/${sid}/music-sheet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ noteSequence, format })
        });
        
        const result = await response.json();
        if (result.ok) {
            if (format === 'text') {
                // For text format, create a downloadable text file
                const blob = new Blob([result.musicSheet.data], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = result.musicSheet.filename;
                link.click();
                URL.revokeObjectURL(url);
            } else {
                // For PDF/SVG, use the data URL directly
                const link = document.createElement('a');
                link.href = result.musicSheet.data;
                link.download = result.musicSheet.filename;
                link.click();
            }
        } else {
            alert('Failed to generate music sheet: ' + result.error);
        }
    } catch (error) {
        console.error('Music sheet generation error:', error);
        alert('Failed to generate music sheet');
    }
}

// Fullscreen functionality
let isFullscreen = false;
let fullscreenAudioContext, fullscreenAnalyser, fullscreenMicrophone;
let fullscreenIsDetecting = false;
let fullscreenNoteSequence = [];
let fullscreenLastDetectedNote = '';
let fullscreenLastNoteTime = 0;
let fullscreenLastMaxValue = 0;

function startFullscreenDetection() {
    try {
        const stream = navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 48000
            }
        }).then(stream => {
            fullscreenAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            fullscreenAnalyser = fullscreenAudioContext.createAnalyser();
            fullscreenMicrophone = fullscreenAudioContext.createMediaStreamSource(stream);
            
            fullscreenAnalyser.fftSize = 8192;
            fullscreenAnalyser.smoothingTimeConstant = 0.3;
            fullscreenMicrophone.connect(fullscreenAnalyser);
            
            fullscreenIsDetecting = true;
            fullscreenNoteSequence = [];
            
            // Update button states with visual feedback
            const startBtn = document.getElementById('fullscreenStartDetection');
            const stopBtn = document.getElementById('fullscreenStopDetection');
            
            startBtn.disabled = true;
            startBtn.classList.add('opacity-50', 'cursor-not-allowed');
            stopBtn.disabled = false;
            stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            document.getElementById('fullscreenCurrentNote').textContent = 'Listening...';
            document.getElementById('fullscreenCurrentFreq').textContent = '0 Hz';
            
            detectNotesFullscreen();
        });
    } catch (error) {
        alert('Microphone access required! Error: ' + error.message);
    }
}

function stopFullscreenDetection() {
    fullscreenIsDetecting = false;
    if (fullscreenAudioContext) fullscreenAudioContext.close();
    
    // Update button states with visual feedback
    const startBtn = document.getElementById('fullscreenStartDetection');
    const stopBtn = document.getElementById('fullscreenStopDetection');
    
    startBtn.disabled = false;
    startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    stopBtn.disabled = true;
    stopBtn.classList.add('opacity-50', 'cursor-not-allowed');
    document.getElementById('fullscreenCurrentNote').textContent = 'Stopped';
    document.getElementById('fullscreenCurrentFreq').textContent = '0 Hz';
}

function detectNotesFullscreen() {
    if (!fullscreenIsDetecting) return;
    
    const bufferLength = fullscreenAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    fullscreenAnalyser.getByteFrequencyData(dataArray);
    
    let maxValue = 0;
    let maxIndex = 0;
    
    const sampleRate = fullscreenAudioContext.sampleRate;
    const minBin = Math.floor(80 * bufferLength / (sampleRate / 2));
    const maxBin = Math.floor(1200 * bufferLength / (sampleRate / 2));
    
    for (let i = minBin; i < maxBin && i < dataArray.length; i++) {
        if (dataArray[i] > maxValue) {
            maxValue = dataArray[i];
            maxIndex = i;
        }
    }
    
    // Only process if we have a strong signal (same threshold as Python)
    if (maxValue > 180) {
        const frequency = maxIndex * (sampleRate / 2) / bufferLength;
        const noteInfo = frequencyToNote(frequency);
        
        document.getElementById('fullscreenCurrentNote').textContent = noteInfo.note;
        document.getElementById('fullscreenCurrentFreq').textContent = frequency.toFixed(1) + ' Hz';
        
        if (noteInfo.inScale) {
            document.getElementById('fullscreenCurrentNote').style.color = '#00ff88'; // Green
        } else {
            document.getElementById('fullscreenCurrentNote').style.color = '#ffaa00'; // Orange
        }
        
        // Only add to sequence if signal is increasing (note attack) or different note
        const now = Date.now();
        const isSignalIncrease = maxValue > fullscreenLastMaxValue + 20; // Significant increase
        const isDifferentNote = noteInfo.note !== fullscreenLastDetectedNote;
        const isTimeElapsed = (now - fullscreenLastNoteTime) > noteDebounceTime;
        
        if ((isSignalIncrease || isDifferentNote) && isTimeElapsed) {
            fullscreenNoteSequence.push(noteInfo.note);
            updateFullscreenNoteSequenceDisplay();
            fullscreenLastDetectedNote = noteInfo.note;
            fullscreenLastNoteTime = now;
        }
        
        fullscreenLastMaxValue = maxValue;
    } else {
        // No strong signal
        document.getElementById('fullscreenCurrentFreq').textContent = 'Listening...';
        fullscreenLastMaxValue = 0;
    }
    
    requestAnimationFrame(detectNotesFullscreen);
}

function updateFullscreenNoteSequenceDisplay() {
    const sequenceElement = document.getElementById('fullscreenNoteSequence');
    if (!sequenceElement) return;
    
    if (fullscreenNoteSequence.length === 0) {
        sequenceElement.innerHTML = 'Note sequence will appear here...';
        return;
    }
    
    const displayNotes = fullscreenNoteSequence.slice(-50);
    sequenceElement.innerHTML = displayNotes.join(' - ');
    sequenceElement.scrollLeft = sequenceElement.scrollWidth;
}

function openFullscreen() {
    isFullscreen = true;
    document.getElementById('fullscreenModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeFullscreen() {
    isFullscreen = false;
    stopFullscreenDetection();
    document.getElementById('fullscreenModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Event listeners
document.getElementById('startDetection').addEventListener('click', startRealTimeDetection);
document.getElementById('stopDetection').addEventListener('click', stopRealTimeDetection);

// Fullscreen event listeners
document.getElementById('fullscreenBtn').addEventListener('click', openFullscreen);
document.getElementById('exitFullscreen').addEventListener('click', closeFullscreen);
document.getElementById('fullscreenStartDetection').addEventListener('click', startFullscreenDetection);
document.getElementById('fullscreenStopDetection').addEventListener('click', stopFullscreenDetection);

document.getElementById('generatePDF').addEventListener('click', () => generateMusicSheet('pdf'));
document.getElementById('generateSVG').addEventListener('click', () => generateMusicSheet('svg'));
document.getElementById('generateText').addEventListener('click', () => generateMusicSheet('text'));

document.getElementById('expandAll').addEventListener('click', () => {
    Object.keys(collapseState).forEach(k => collapseState[k] = false);
    refreshSession();
});

document.getElementById('collapseAll').addEventListener('click', () => {
    const keys = Object.keys(collapseState);
    keys.forEach(k => collapseState[k] = true);
    refreshSession();
});

document.getElementById('joinBtn').addEventListener('click', async () => {
    const password = document.getElementById('joinPassword').value;
    const r = await fetch(`/api/sessions/${sid}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const d = await r.json();
    if (d.ok) {
        joined = true;
        alert('Joined!');
        refreshSession();
    } else {
        alert(d.error || 'Join failed');
    }
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
    const pw = prompt('Enter session password or master password to delete:');
    if (!pw) return;
    const r = await fetch(`/api/sessions/${sid}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
    });
    const d = await r.json();
    if (d.ok) {
        location.href = '/';
    } else {
        alert(d.error || 'Delete failed');
    }
});

function getSelectedMixFiles() {
    return Array.from(document.querySelectorAll('#mixSelect input[type=checkbox]:checked')).map(c => c.value);
}

function layerFromLabel() {
    const files = getSelectedMixFiles();
    return files.join(',');
}

async function playMonitorsThen(cb) {
    const files = getSelectedMixFiles();
    if (!document.getElementById('monitorWhileRec').checked || files.length === 0) return cb();
    const aud = files.map(f => {
        const a = new Audio(`/api/sessions/${sid}/recordings/${encodeURIComponent(f)}`);
        a.crossOrigin = 'anonymous';
        a.preload = 'auto';
        return a;
    });
    setTimeout(() => { aud.forEach(a => { try { a.play(); } catch (e) {} }); cb(); }, 1000);
}

async function countdown(seconds) {
    const overlay = document.getElementById('recOverlay');
    const countNum = document.getElementById('countNum');
    const countBar = document.getElementById('countBar');
    const cancelBtn = document.getElementById('cancelCountdown');
    let cancelFlag = false;
    
    if (cancelBtn) {
        cancelBtn.onclick = () => { cancelFlag = true; overlay.style.display = 'none'; };
    }
    
    cancelFlag = false;
    if (overlay) overlay.style.display = 'flex';
    if (countBar) countBar.style.width = '0%';
    
    for (let s = seconds; s > 0; s--) {
        if (countNum) countNum.textContent = s;
        if (countBar) countBar.style.width = Math.round(((seconds - s + 1) / seconds) * 100) + '%';
        await new Promise(r => setTimeout(r, 1000));
        if (cancelFlag) return false;
    }
    if (overlay) overlay.style.display = 'none';
    return true;
}

async function startRecordingAfterCountdown() {
    if (!joined) { alert('Join the session first'); return; }
    const ok = await countdown(5);
    if (!ok) return;

    const files = Array.from(document.querySelectorAll('#mixSelect input[type=checkbox]:checked')).map(c => c.value);
    if (document.getElementById('monitorWhileRec')?.checked && files.length) {
        const aud = files.map(f => {
            const a = new Audio(`/api/sessions/${sid}/recordings/${encodeURIComponent(f)}`);
            a.preload = 'auto';
            return a;
        });
        setTimeout(() => aud.forEach(a => { try { a.play(); } catch (_) {} }), 700);
    }
    
    const instr = (document.getElementById('instrumentName').value.trim() || 'unknown');
    const user = (document.getElementById('userName').value.trim() || '');
    const layer_from = files.join(',');

    try {
        const stream = await getMicStream();
        chunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
        mediaRecorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const fd = new FormData();
            fd.append('audio', blob, 'take.webm');
            fd.append('instrument', instr);
            fd.append('user', user);
            if (layer_from) fd.append('layer_from', layer_from);
            fd.append('noteSequence', JSON.stringify(noteSequence));
            
            const r = await fetch(`/api/sessions/${sid}/upload`, { method: 'POST', body: fd });
            const d = await r.json();
            if (!d.ok) alert(d.error || 'Upload failed');
            await refreshSession();
        };
        mediaRecorder.start();
        document.getElementById('recStatus').textContent = 'Recording...';
        document.getElementById('startRec').disabled = true;
        document.getElementById('stopRec').disabled = false;
    } catch (e) { alert('Mic error: ' + e); }
}

document.getElementById('startRec').addEventListener('click', startRecordingAfterCountdown);

document.getElementById('stopRec').addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        document.getElementById('recStatus').textContent = 'Stopped.';
        document.getElementById('startRec').disabled = false;
        document.getElementById('stopRec').disabled = true;
    }
});

document.getElementById('mixBtn').addEventListener('click', async () => {
    const checks = Array.from(document.querySelectorAll('#mixSelect input[type=checkbox]:checked'));
    if (checks.length < 2) return alert('Select at least two takes');
    const files = checks.map(c => c.value);
    const r = await fetch(`/api/sessions/${sid}/mix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
    });
    const d = await r.json();
    if (d.ok) {
        document.getElementById('mixResult').innerHTML = `Created: <a class="text-blue-600 underline" href="/api/sessions/${sid}/recordings/${encodeURIComponent(d.file)}">${d.file}</a>`;
        refreshSession();
    } else {
        alert(d.error || 'Mix failed');
    }
});

// Download session
document.getElementById('downloadSessionBtn').addEventListener('click', async () => {
    try {
        const response = await fetch(`/api/sessions/${sid}/download`);
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${sid}-session.json`;
            link.click();
            URL.revokeObjectURL(url);
        } else {
            const error = await response.json();
            alert('Failed to download session: ' + error.error);
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download session');
    }
});

document.getElementById('finishBtn').addEventListener('click', async () => {
    const files = Array.from(document.querySelectorAll('#mixSelect input[type=checkbox]:checked')).map(c => c.value);
    const r = await fetch(`/api/sessions/${sid}/finish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
    });
    const d = await r.json();
    if (!d.ok) return alert(d.error || 'Failed to create master');
    const links = [];
    if (d.wav) links.push(`<a class="text-blue-600 underline" href="${d.wav}">Download WAV</a>`);
    if (d.mp3) links.push(`<a class="text-blue-600 underline ml-3" href="${d.mp3}">Download MP3</a>`);
    document.getElementById('finishLinks').innerHTML = links.join('');
});

// Initialize WebSocket connections
function initWebSockets() {
    // Socket.IO for session updates
    socket = io();
    socket.on('session:update', (data) => {
        if (data.sid === sid) {
            refreshSession();
        }
    });
    
    // WebSocket for real-time note detection
    noteDetectionSocket = new WebSocket(`ws://${window.location.hostname}:8766`);
    noteDetectionSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'live-note') {
            // Update note display for viewers
            document.getElementById('currentNote').textContent = data.note;
            document.getElementById('currentFreq').textContent = data.frequency.toFixed(1) + ' Hz';
            noteSequence = data.sequence || [];
            updateNoteSequenceDisplay();
        }
    };
}

// Mobile detection and optimization
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function applyMobileOptimizations() {
    if (isMobile()) {
        document.body.classList.add('mobile-device');
        
        // Optimize touch interactions
        document.querySelectorAll('.btn, button').forEach(element => {
            element.style.minHeight = '44px'; // iOS minimum touch target
            element.style.minWidth = '44px';
        });
        
        // Prevent zoom on input focus (iOS)
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.style.fontSize = '16px';
        });
        
        // Optimize modal scrolling
        document.querySelectorAll('.modal-content').forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
        });
    }
}

// Apply mobile optimizations
applyMobileOptimizations();

// Reapply mobile optimizations on resize
window.addEventListener('resize', () => {
    applyMobileOptimizations();
});

populateDevices();
refreshSession();
initWebSockets();
