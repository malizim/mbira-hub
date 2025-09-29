# Audio Quality Enhancement Plan

## 🎵 Current Audio Implementation Analysis

### Current Issues Identified:

1. **Low Quality Audio Constraints**:
   - Basic `getUserMedia({ audio: true })` without quality specifications
   - No audio codec preferences specified
   - Default browser audio processing (echo cancellation, noise suppression enabled)

2. **Recording Format Limitations**:
   - **Input**: WebM format (browser default, often low quality)
   - **Output**: WAV 44.1kHz mono (good, but conversion from low-quality input)
   - **Processing**: FFmpeg conversion from WebM to WAV

3. **Audio Processing Issues**:
   - Browser's automatic gain control may reduce dynamic range
   - Echo cancellation can affect musical instrument detection
   - Noise suppression may filter out important harmonics

## 🚀 Proposed Audio Quality Improvements

### 1. Enhanced Audio Constraints

```javascript
// High-quality audio constraints
const HIGH_QUALITY_AUDIO_CONSTRAINTS = {
    audio: {
        // Disable browser audio processing for musical instruments
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        
        // Request high sample rate
        sampleRate: 48000,  // Higher than current 44100
        
        // Request specific audio codecs
        codec: 'opus',  // Better than default WebM codec
        
        // Channel configuration
        channelCount: 1,  // Mono for mbira
        
        // Latency optimization
        latency: 0.01,  // 10ms latency
        
        // Volume constraints
        volume: 1.0,
        
        // Device-specific constraints
        deviceId: { exact: selectedMicrophoneId }
    }
};
```

### 2. Alternative Audio Formats

**Current**: WebM → WAV (lossy conversion)
**Proposed**: 
- **Opus codec**: Better compression and quality than WebM
- **FLAC**: Lossless compression for archival
- **High-resolution WAV**: 48kHz/96kHz for better frequency resolution

### 3. Audio Processing Pipeline Improvements

```javascript
// Enhanced audio processing
const AUDIO_PROCESSING_CONFIG = {
    // Higher sample rates for better frequency resolution
    sampleRates: [48000, 96000],  // vs current 44100
    
    // Better FFT settings
    fftSize: 16384,  // vs current 8192 for better frequency resolution
    
    // Audio analysis improvements
    smoothingTimeConstant: 0.1,  // vs current 0.3 for more responsive detection
    
    // Dynamic range preservation
    preserveDynamicRange: true,
    
    // Harmonic analysis
    enableHarmonicAnalysis: true
};
```

## 🔧 Implementation Plan

### Phase 1: Enhanced Audio Constraints

1. **Update getUserMedia calls** with high-quality constraints
2. **Add codec preference detection**
3. **Implement fallback for unsupported browsers**

### Phase 2: Better Recording Formats

1. **Add Opus codec support**
2. **Implement FLAC recording option**
3. **Add high-resolution WAV support**

### Phase 3: Advanced Audio Processing

1. **Increase FFT size for better frequency resolution**
2. **Add harmonic analysis**
3. **Implement dynamic range compression**

## 📊 Expected Quality Improvements

- **Frequency Resolution**: 2x better with 48kHz vs 44.1kHz
- **Dynamic Range**: Preserved with disabled auto-gain
- **Harmonic Content**: Better preserved with disabled noise suppression
- **Latency**: Reduced with optimized constraints
- **File Size**: Better compression with Opus codec

## 🎯 Specific Code Changes Needed

### 1. Update Audio Constraints in main.js
### 2. Update Audio Constraints in session.js  
### 3. Add Codec Detection and Fallback
### 4. Update FFmpeg Processing Pipeline
### 5. Add Audio Quality Settings UI

Would you like me to implement these improvements?
