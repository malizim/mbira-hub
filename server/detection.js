import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { fft } from 'fft-js';

// Mbira note frequencies (Hz) - matching the Python version
const MBIRA_NOTES_HZ = [
    174.61, 196.00, 220.00, 261.63, 293.66, 329.63, 349.23, 392.00,
    440.00, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00
];

// Note mapping for real-time detection
const NOTE_MAPPING = {
    'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
    'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
    'F5': 698.46, 'G5': 783.99, 'A5': 880.00
};

/**
 * Convert audio blob to WAV bytes using ffmpeg
 */
export async function blobToWavBytes(blob, targetRate = 48000) {
    const tempDir = path.join(process.env.DATA_DIR || './data', '_tmp');
    fs.mkdirSync(tempDir, { recursive: true });
    
    const inputPath = path.join(tempDir, `input_${Date.now()}.bin`);
    const outputPath = path.join(tempDir, `output_${Date.now()}.wav`);
    
    try {
        fs.writeFileSync(inputPath, blob);
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions(['-ac', '1', '-ar', targetRate.toString(), '-f', 'wav'])
                .on('end', resolve)
                .on('error', reject)
                .save(outputPath);
        });
        
        const wavData = fs.readFileSync(outputPath);
        return wavData;
    } finally {
        try {
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        } catch (e) {
            console.warn('Failed to clean up temp files:', e.message);
        }
    }
}

/**
 * Parse WAV file and extract audio samples
 */
export function wavBytesToMonoArray(wavBytes) {
    const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);
    
    if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3)) !== 'RIFF') {
        throw new Error('Invalid WAV file: Missing RIFF header');
    }
    
    let offset = 12;
    while (offset < wavBytes.length - 8) {
        const chunkId = String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
        const chunkSize = view.getUint32(offset + 4, true);
        
        if (chunkId === 'fmt ') {
            const audioFormat = view.getUint16(offset + 8, true);
            const numChannels = view.getUint16(offset + 10, true);
            const sampleRate = view.getUint32(offset + 12, true);
            const bitsPerSample = view.getUint16(offset + 22, true);
            
            if (audioFormat !== 1) {
                throw new Error('Only PCM format supported');
            }
            if (bitsPerSample !== 16) {
                throw new Error('Only 16-bit samples supported');
            }
            
            let dataOffset = offset + 8 + chunkSize;
            while (dataOffset < wavBytes.length - 8) {
                const dataChunkId = String.fromCharCode(view.getUint8(dataOffset), view.getUint8(dataOffset + 1), view.getUint8(dataOffset + 2), view.getUint8(dataOffset + 3));
                const dataChunkSize = view.getUint32(dataOffset + 4, true);
                
                if (dataChunkId === 'data') {
                    const samples = [];
                    const numSamples = dataChunkSize / (bitsPerSample / 8) / numChannels;
                    
                    for (let i = 0; i < numSamples; i++) {
                        const sampleOffset = dataOffset + 8 + (i * numChannels * (bitsPerSample / 8));
                        let sample = 0;
                        
                        for (let ch = 0; ch < numChannels; ch++) {
                            const channelOffset = sampleOffset + (ch * (bitsPerSample / 8));
                            const channelSample = view.getInt16(channelOffset, true);
                            sample += channelSample;
                        }
                        
                        samples.push((sample / numChannels) / 32768.0);
                    }
                    
                    return { samples, sampleRate };
                }
                
                dataOffset += 8 + dataChunkSize;
            }
            
            throw new Error('Data chunk not found');
        }
        
        offset += 8 + chunkSize;
    }
    
    throw new Error('fmt chunk not found');
}

/**
 * Detect mbira in audio samples using FFT analysis
 */
export function detectMbira(samples, sampleRate) {
    if (!samples || samples.length === 0 || !sampleRate) {
        return { isMbira: false, confidence: 0.0, peakHz: 0.0 };
    }
    
    const win = 4096;
    const hop = 2048;
    const fmin = 80.0;
    const fmax = 1200.0;
    
    const n = Math.max(1, Math.floor((samples.length - win) / hop));
    const window = new Array(win).fill(0).map((_, i) => 0.5 * (1 - Math.cos(2 * Math.PI * i / (win - 1))));
    
    let hits = 0;
    let total = 0;
    const peaks = [];
    
    for (let i = 0; i < n; i++) {
        const start = i * hop;
        const end = Math.min(start + win, samples.length);
        
        const segment = new Array(win).fill(0);
        for (let j = 0; j < end - start; j++) {
            segment[j] = samples[start + j] * window[j];
        }
        
        const fftResult = fft(segment);
        const magnitude = fftResult.map(complex => Math.sqrt(complex[0] * complex[0] + complex[1] * complex[1]));
        
        const frequencies = magnitude.map((_, k) => (k * sampleRate) / win);
        
        const validIndices = frequencies
            .map((freq, idx) => ({ freq, idx }))
            .filter(({ freq }) => freq >= fmin && freq <= fmax);
        
        if (validIndices.length === 0) continue;
        
        let maxMag = 0;
        let peakIdx = 0;
        for (const { idx } of validIndices) {
            if (magnitude[idx] > maxMag) {
                maxMag = magnitude[idx];
                peakIdx = idx;
            }
        }
        
        const peakFreq = frequencies[peakIdx];
        peaks.push(peakFreq);
        
        const minDistance = Math.min(...MBIRA_NOTES_HZ.map(note => Math.abs(note - peakFreq)));
        if (minDistance <= 30.0) {
            hits++;
        }
        total++;
    }
    
    const confidence = total > 0 ? hits / total : 0.0;
    const isMbira = confidence >= 0.55;
    const peakHz = peaks.length > 0 ? peaks.reduce((a, b) => a + b, 0) / peaks.length : 0.0;
    
    return { isMbira, confidence, peakHz };
}

/**
 * Real-time note detection for live audio streams
 */
export async function detectNotesRealtime(audioBlob) {
    try {
        const wavBytes = await blobToWavBytes(audioBlob, 44100);
        const { samples, sampleRate } = wavBytesToMonoArray(wavBytes);
        
        // Use a smaller window for real-time detection
        const win = 2048;
        const hop = 1024;
        const fmin = 80.0;
        const fmax = 1200.0;
        
        const n = Math.max(1, Math.floor((samples.length - win) / hop));
        const window = new Array(win).fill(0).map((_, i) => 0.5 * (1 - Math.cos(2 * Math.PI * i / (win - 1))));
        
        const notes = [];
        const frequencies = [];
        
        for (let i = 0; i < n; i++) {
            const start = i * hop;
            const end = Math.min(start + win, samples.length);
            
            const segment = new Array(win).fill(0);
            for (let j = 0; j < end - start; j++) {
                segment[j] = samples[start + j] * window[j];
            }
            
            const fftResult = fft(segment);
            const magnitude = fftResult.map(complex => Math.sqrt(complex[0] * complex[0] + complex[1] * complex[1]));
            
            const freqs = magnitude.map((_, k) => (k * sampleRate) / win);
            
            const validIndices = freqs
                .map((freq, idx) => ({ freq, idx }))
                .filter(({ freq }) => freq >= fmin && freq <= fmax);
            
            if (validIndices.length === 0) continue;
            
            let maxMag = 0;
            let peakIdx = 0;
            for (const { idx } of validIndices) {
                if (magnitude[idx] > maxMag) {
                    maxMag = magnitude[idx];
                    peakIdx = idx;
                }
            }
            
            const peakFreq = freqs[peakIdx];
            if (maxMag > 50) { // Threshold for note detection
                const noteInfo = frequencyToNote(peakFreq);
                if (noteInfo.note) {
                    notes.push(noteInfo.note);
                    frequencies.push(peakFreq);
                }
            }
        }
        
        return {
            notes,
            frequencies,
            noteCount: notes.length,
            duration: samples.length / sampleRate
        };
    } catch (error) {
        console.error('Real-time detection error:', error);
        return {
            notes: [],
            frequencies: [],
            noteCount: 0,
            duration: 0,
            error: error.message
        };
    }
}

/**
 * Convert frequency to note name
 */
function frequencyToNote(frequency) {
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
        inScale: closestDistance < 30,
        confidence: Math.max(0, 1 - (closestDistance / 50))
    };
}

/**
 * Main detection function - processes audio and returns results
 */
export async function detectInstrument(audioBlob) {
    try {
        const wavBytes = await blobToWavBytes(audioBlob, 44100);
        const { samples, sampleRate } = wavBytesToMonoArray(wavBytes);
        const { isMbira, confidence, peakHz } = detectMbira(samples, sampleRate);
        
        return {
            instrument: isMbira ? 'mbira' : 'unknown',
            confidence: Math.round(confidence * 1000) / 1000,
            peakHz: Math.round(peakHz * 100) / 100
        };
    } catch (error) {
        console.error('Detection error:', error);
        return {
            instrument: 'unknown',
            confidence: 0.0,
            peakHz: 0.0,
            error: error.message
        };
    }
}
