// Professional Mini-DAW for Mbira Hub
class MbiraDAW {
    constructor() {
        this.sessionId = this.getSessionIdFromURL();
        this.tracks = [];
        this.isPlaying = false;
        this.isRecording = false;
        this.currentTime = 0;
        this.totalTime = 0;
        this.playheadPosition = 0;
        this.audioContext = null;
        this.mediaRecorder = null;
        this.recordingChunks = [];
        this.waveforms = new Map();
        
        this.init();
    }
    
    getSessionIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('sid') || 'default';
    }
    
    async init() {
        console.log('Initializing Mbira DAW...');
        
        // Load session data
        await this.loadSession();
        
        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize UI
        this.updateUI();
        
        console.log('DAW initialized successfully');
    }
    
    async loadSession() {
        try {
            const response = await fetch(`/api/sessions/${this.sessionId}`);
            const data = await response.json();
            
            if (data.session) {
                document.getElementById('sessionName').textContent = data.session.name || this.sessionId;
                this.tracks = data.session.takes || [];
                this.renderTracks();
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    }
    
    setupEventListeners() {
        // Transport controls
        document.getElementById('playBtn').addEventListener('click', () => this.togglePlayback());
        document.getElementById('stopBtn').addEventListener('click', () => this.stop());
        document.getElementById('recordBtn').addEventListener('click', () => this.toggleRecording());
        document.getElementById('addTrackBtn').addEventListener('click', () => this.addTrack());
        
        // EQ sliders
        document.getElementById('bassSlider').addEventListener('input', () => this.updateEQSettings());
        document.getElementById('midSlider').addEventListener('input', () => this.updateEQSettings());
        document.getElementById('trebleSlider').addEventListener('input', () => this.updateEQSettings());
        
        // Source selection
        document.getElementById('sourceMicrophone').addEventListener('click', () => this.selectSource('microphone'));
        document.getElementById('sourceLineIn').addEventListener('click', () => this.selectSource('line-in'));
    }
    
    renderTracks() {
        const container = document.getElementById('tracksContainer');
        container.innerHTML = '';
        
        this.tracks.forEach((track, index) => {
            const trackElement = this.createTrackElement(track, index);
            container.appendChild(trackElement);
        });
    }
    
    createTrackElement(track, index) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track';
        trackDiv.innerHTML = `
            <div class="track-header">
                <div class="flex items-center space-x-3">
                    <div class="track-mute" data-track="${index}">M</div>
                    <div class="track-solo" data-track="${index}">S</div>
                    <div class="text-white font-medium">${track.instrument || 'Track ' + (index + 1)}</div>
                    <div class="text-slate-400 text-sm">${track.user || 'Unknown'}</div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="eq-band">EQ</div>
                    <div class="track-volume">
                        <input type="range" min="0" max="100" value="80" class="w-full">
                    </div>
                    <div class="track-pan">
                        <input type="range" min="-100" max="100" value="0" class="w-full">
                    </div>
                    <button class="text-red-400 hover:text-red-300" onclick="daw.deleteTrack(${index})">🗑</button>
                </div>
            </div>
            <div class="track-content">
                <div class="waveform-container" id="waveform-${index}"></div>
                <div class="flex items-center space-x-2 mt-2">
                    <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700" onclick="daw.playTrack(${index})">▶ Play</button>
                    <button class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700" onclick="daw.overdubTrack(${index})">🎤 Overdub</button>
                    <button class="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700" onclick="daw.generateMusicSheet(${index})">📄 Sheet</button>
                </div>
            </div>
        `;
        
        // Initialize waveform
        this.initWaveform(index, track.file);
        
        return trackDiv;
    }
    
    async initWaveform(trackIndex, audioFile) {
        try {
            const container = document.getElementById(`waveform-${trackIndex}`);
            if (!container) return;
            
            // Create waveform with WaveSurfer.js
            const wavesurfer = WaveSurfer.create({
                container: container,
                waveColor: '#3b82f6',
                progressColor: '#10b981',
                cursorColor: '#f59e0b',
                barWidth: 2,
                barRadius: 3,
                responsive: true,
                height: 60,
                normalize: true,
                backend: 'MediaElement'
            });
            
            // Load audio file
            if (audioFile) {
                const audioUrl = `/api/sessions/${this.sessionId}/recordings/${audioFile}`;
                await wavesurfer.load(audioUrl);
            }
            
            this.waveforms.set(trackIndex, wavesurfer);
            
        } catch (error) {
            console.error('Failed to initialize waveform:', error);
        }
    }
    
    async togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }
    
    async play() {
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.isPlaying = true;
            document.getElementById('playBtn').textContent = '⏸';
            
            // Play all waveforms
            for (const [index, wavesurfer] of this.waveforms) {
                if (wavesurfer) {
                    await wavesurfer.play();
                }
            }
            
            this.startPlayheadAnimation();
            
        } catch (error) {
            console.error('Playback error:', error);
            this.isPlaying = false;
            document.getElementById('playBtn').textContent = '▶';
        }
    }
    
    pause() {
        this.isPlaying = false;
        document.getElementById('playBtn').textContent = '▶';
        
        // Pause all waveforms
        for (const [index, wavesurfer] of this.waveforms) {
            if (wavesurfer) {
                wavesurfer.pause();
            }
        }
        
        this.stopPlayheadAnimation();
    }
    
    stop() {
        this.isPlaying = false;
        this.currentTime = 0;
        this.playheadPosition = 0;
        
        document.getElementById('playBtn').textContent = '▶';
        document.getElementById('currentTime').textContent = '0:00';
        document.getElementById('playhead').style.left = '0%';
        
        // Stop all waveforms
        for (const [index, wavesurfer] of this.waveforms) {
            if (wavesurfer) {
                wavesurfer.stop();
            }
        }
        
        this.stopPlayheadAnimation();
    }
    
    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }
    
    async startRecording() {
        try {
            const instrument = document.getElementById('instrumentName').value.trim() || 'unknown';
            const user = document.getElementById('userName').value.trim() || 'unknown';
            const mode = document.getElementById('recordingMode').value;
            
            // Get audio stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 48000,
                    codec: 'opus',
                    channelCount: 1,
                    latency: 0.01,
                    volume: 1.0
                }
            });
            
            // Setup MediaRecorder
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
            }
            
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
            this.recordingChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordingChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                await this.processRecording(instrument, user, mode);
            };
            
            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update UI
            document.getElementById('recordBtn').classList.add('recording');
            document.getElementById('recordBtn').textContent = '⏹';
            
            console.log('Recording started');
            
        } catch (error) {
            console.error('Recording error:', error);
            alert('Failed to start recording: ' + error.message);
        }
    }
    
    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Update UI
            document.getElementById('recordBtn').classList.remove('recording');
            document.getElementById('recordBtn').textContent = '⏺';
            
            // Stop all tracks
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            console.log('Recording stopped');
        }
    }
    
    async processRecording(instrument, user, mode) {
        try {
            const blob = new Blob(this.recordingChunks, { type: 'audio/webm' });
            const formData = new FormData();
            
            formData.append('audio', blob, 'recording.webm');
            formData.append('instrument', instrument);
            formData.append('user', user);
            formData.append('mode', mode);
            
            const response = await fetch(`/api/sessions/${this.sessionId}/upload`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.ok) {
                console.log('Recording uploaded successfully');
                await this.loadSession(); // Reload tracks
            } else {
                throw new Error(result.error || 'Upload failed');
            }
            
        } catch (error) {
            console.error('Processing error:', error);
            alert('Failed to process recording: ' + error.message);
        }
    }
    
    async addTrack() {
        const instrument = document.getElementById('instrumentName').value.trim() || 'New Track';
        const user = document.getElementById('userName').value.trim() || 'User';
        
        // Create empty track
        const newTrack = {
            instrument: instrument,
            user: user,
            file: null,
            type: 'empty'
        };
        
        this.tracks.push(newTrack);
        this.renderTracks();
    }
    
    async deleteTrack(index) {
        if (confirm('Are you sure you want to delete this track?')) {
            this.tracks.splice(index, 1);
            this.renderTracks();
        }
    }
    
    async playTrack(index) {
        const wavesurfer = this.waveforms.get(index);
        if (wavesurfer) {
            await wavesurfer.play();
        }
    }
    
    async overdubTrack(index) {
        // Start recording for overdub
        await this.startRecording();
    }
    
    async generateMusicSheet(index) {
        const track = this.tracks[index];
        if (track && track.noteSequence) {
            // Generate music sheet for this track
            const response = await fetch(`/api/sessions/${this.sessionId}/music-sheet/${index}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ trackIndex: index })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `music-sheet-${track.instrument}-${index}.pdf`;
                a.click();
            }
        }
    }
    
    updateEQSettings() {
        const bass = document.getElementById('bassSlider').value;
        const mid = document.getElementById('midSlider').value;
        const treble = document.getElementById('trebleSlider').value;
        
        console.log('EQ Settings:', { bass, mid, treble });
        // Apply EQ to audio context
    }
    
    selectSource(source) {
        console.log('Selected audio source:', source);
        // Update source selection UI
        document.querySelectorAll('[id^="source"]').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-slate-200', 'text-slate-700');
        });
        
        document.getElementById(`source${source.charAt(0).toUpperCase() + source.slice(1).replace('-', '')}`)
            .classList.add('bg-blue-600', 'text-white');
    }
    
    startPlayheadAnimation() {
        this.playheadInterval = setInterval(() => {
            if (this.isPlaying) {
                this.currentTime += 0.1;
                this.updatePlayhead();
            }
        }, 100);
    }
    
    stopPlayheadAnimation() {
        if (this.playheadInterval) {
            clearInterval(this.playheadInterval);
            this.playheadInterval = null;
        }
    }
    
    updatePlayhead() {
        const progress = this.totalTime > 0 ? (this.currentTime / this.totalTime) * 100 : 0;
        document.getElementById('playhead').style.left = `${progress}%`;
        document.getElementById('currentTime').textContent = this.formatTime(this.currentTime);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateUI() {
        // Update any UI elements that need refreshing
    }
}

// Initialize DAW when page loads
let daw;
document.addEventListener('DOMContentLoaded', () => {
    daw = new MbiraDAW();
});
