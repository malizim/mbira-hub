// Audio Quality Enhancement Utilities

/**
 * Detect supported audio codecs and quality settings
 */
export function detectAudioCapabilities() {
    const capabilities = {
        codecs: [],
        sampleRates: [],
        channels: [],
        constraints: {}
    };
    
    // Test codec support
    const codecs = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus', 
        'audio/webm',
        'audio/mp4',
        'audio/wav'
    ];
    
    codecs.forEach(codec => {
        if (MediaRecorder.isTypeSupported(codec)) {
            capabilities.codecs.push(codec);
        }
    });
    
    // Test sample rates
    const sampleRates = [44100, 48000, 96000];
    sampleRates.forEach(rate => {
        capabilities.sampleRates.push(rate);
    });
    
    // Test channel configurations
    capabilities.channels = [1, 2]; // Mono and Stereo
    
    return capabilities;
}

/**
 * Get optimal audio constraints based on browser capabilities
 */
export function getOptimalAudioConstraints() {
    const capabilities = detectAudioCapabilities();
    
    const constraints = {
        audio: {
            // Disable browser audio processing for musical instruments
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            
            // Use highest supported sample rate
            sampleRate: Math.max(...capabilities.sampleRates),
            
            // Mono for mbira
            channelCount: 1,
            
            // Low latency
            latency: 0.01,
            
            // Full volume
            volume: 1.0
        }
    };
    
    return constraints;
}

/**
 * Get optimal MediaRecorder configuration
 */
export function getOptimalMediaRecorderConfig() {
    const capabilities = detectAudioCapabilities();
    
    // Prefer Opus codec for better quality
    let mimeType = 'audio/webm';
    if (capabilities.codecs.includes('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
    } else if (capabilities.codecs.includes('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
    } else if (capabilities.codecs.includes('audio/webm')) {
        mimeType = 'audio/webm';
    }
    
    return {
        mimeType: mimeType,
        audioBitsPerSecond: 128000  // Higher bitrate for better quality
    };
}

/**
 * Enhanced audio analysis with better frequency resolution
 */
export function createEnhancedAnalyser(audioContext) {
    const analyser = audioContext.createAnalyser();
    
    // Higher FFT size for better frequency resolution
    analyser.fftSize = 16384;  // vs standard 8192
    
    // More responsive detection
    analyser.smoothingTimeConstant = 0.1;  // vs standard 0.3
    
    // Better frequency analysis
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;
    
    return analyser;
}

/**
 * Audio quality settings UI
 */
export function createAudioQualitySettings() {
    const capabilities = detectAudioCapabilities();
    
    const settingsHTML = `
        <div class="audio-quality-settings">
            <h3>🎵 Audio Quality Settings</h3>
            <div class="setting-group">
                <label>Sample Rate:</label>
                <select id="sampleRateSelect">
                    ${capabilities.sampleRates.map(rate => 
                        `<option value="${rate}" ${rate === 48000 ? 'selected' : ''}>${rate} Hz</option>`
                    ).join('')}
                </select>
            </div>
            <div class="setting-group">
                <label>Audio Codec:</label>
                <select id="codecSelect">
                    ${capabilities.codecs.map(codec => 
                        `<option value="${codec}" ${codec.includes('opus') ? 'selected' : ''}>${codec}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="setting-group">
                <label>FFT Size:</label>
                <select id="fftSizeSelect">
                    <option value="8192">8192 (Standard)</option>
                    <option value="16384" selected>16384 (High Resolution)</option>
                    <option value="32768">32768 (Maximum)</option>
                </select>
            </div>
            <div class="setting-group">
                <label>Detection Sensitivity:</label>
                <input type="range" id="sensitivitySlider" min="0.1" max="0.9" step="0.1" value="0.1">
                <span id="sensitivityValue">0.1</span>
            </div>
        </div>
    `;
    
    return settingsHTML;
}

/**
 * Apply audio quality settings
 */
export function applyAudioQualitySettings(settings) {
    const audioSettings = {
        sampleRate: parseInt(settings.sampleRate) || 48000,
        codec: settings.codec || 'audio/webm;codecs=opus',
        fftSize: parseInt(settings.fftSize) || 16384,
        sensitivity: parseFloat(settings.sensitivity) || 0.1
    };
    
    // Store settings in localStorage
    localStorage.setItem('mbira-audio-settings', JSON.stringify(audioSettings));
    
    return audioSettings;
}

/**
 * Load saved audio quality settings
 */
export function loadAudioQualitySettings() {
    const saved = localStorage.getItem('mbira-audio-settings');
    if (saved) {
        return JSON.parse(saved);
    }
    
    // Default high-quality settings
    return {
        sampleRate: 48000,
        codec: 'audio/webm;codecs=opus',
        fftSize: 16384,
        sensitivity: 0.1
    };
}
