import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Instrument training system
export class InstrumentTraining {
    constructor() {
        this.trainingDataPath = path.join(__dirname, '..', 'data', 'instruments');
        this.ensureTrainingDirectory();
    }

    ensureTrainingDirectory() {
        if (!fs.existsSync(this.trainingDataPath)) {
            fs.mkdirSync(this.trainingDataPath, { recursive: true });
        }
    }

    // Load instrument training data
    loadInstrumentData(instrumentName) {
        const filePath = path.join(this.trainingDataPath, `${instrumentName}.json`);
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading instrument data:', error);
        }
        return null;
    }

    // Save instrument training data
    saveInstrumentData(instrumentName, data) {
        const filePath = path.join(this.trainingDataPath, `${instrumentName}.json`);
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving instrument data:', error);
            return false;
        }
    }

    // Analyze audio sample for training (Advanced Python-style analysis)
    analyzeTrainingSample(audioData, sampleRate = 48000) {
        if (audioData.length < 512) {
            return null;
        }
        
        // Basic metrics
        const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length);
        const peak = Math.max(...audioData.map(Math.abs));
        
        // Advanced pitch detection using autocorrelation (like Python version)
        const frequency = this.detectPitchAutocorr(audioData, sampleRate);
        
        // MFCC features (simplified version of Python's librosa)
        const mfccFeatures = this.extractMFCC(audioData, sampleRate);
        
        // Spectral features
        const spectralFeatures = this.extractSpectralFeatures(audioData, sampleRate);
        
        // Zero crossing rate
        const zcr = this.calculateZeroCrossingRate(audioData);
        
        return {
            frequency,
            rms: rms,
            peak: peak,
            mfcc_mean: mfccFeatures,
            spectral_centroid: spectralFeatures.centroid,
            spectral_rolloff: spectralFeatures.rolloff,
            spectral_bandwidth: spectralFeatures.bandwidth,
            zero_crossing_rate: zcr,
            note_name: this.frequencyToNote(frequency),
            timestamp: Date.now()
        };
    }

    // Advanced pitch detection using autocorrelation (like Python version)
    detectPitchAutocorr(audioData, sampleRate) {
        // Use first portion where signal is strongest (like Python)
        const segmentLen = Math.min(audioData.length, Math.floor(0.8 * sampleRate));
        const segment = audioData.slice(0, segmentLen);
        
        // Apply Hanning window
        const windowed = segment.map((sample, i) => {
            const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (segmentLen - 1)));
            return sample * window;
        });
        
        // Autocorrelation
        const autocorr = this.autocorrelate(windowed);
        
        // Search range for mbira (100-1500 Hz)
        const minPeriod = Math.max(1, Math.floor(sampleRate / 1500));
        const maxPeriod = Math.min(autocorr.length - 1, Math.floor(sampleRate / 100));
        
        if (minPeriod >= maxPeriod) {
            return 0.0;
        }
        
        // Find peak
        let maxValue = 0;
        let peakIndex = minPeriod;
        
        for (let i = minPeriod; i < maxPeriod; i++) {
            if (autocorr[i] > maxValue) {
                maxValue = autocorr[i];
                peakIndex = i;
            }
        }
        
        return peakIndex > 0 ? sampleRate / peakIndex : 0.0;
    }
    
    // Autocorrelation function
    autocorrelate(signal) {
        const n = signal.length;
        const result = new Array(n);
        
        for (let lag = 0; lag < n; lag++) {
            let sum = 0;
            for (let i = 0; i < n - lag; i++) {
                sum += signal[i] * signal[i + lag];
            }
            result[lag] = sum;
        }
        
        return result;
    }
    
    // Extract MFCC features (simplified version of librosa)
    extractMFCC(audioData, sampleRate, nMFCC = 13) {
        // Simplified MFCC extraction
        const fftSize = 2048;
        const hopLength = 512;
        const nMel = 128;
        
        // Compute mel spectrogram
        const melSpec = this.computeMelSpectrogram(audioData, sampleRate, fftSize, hopLength, nMel);
        
        // Convert to dB
        const melDb = melSpec.map(row => 
            row.map(val => 20 * Math.log10(Math.max(val, 1e-10)))
        );
        
        // Compute MFCC (simplified DCT)
        const mfcc = [];
        for (let i = 0; i < nMFCC; i++) {
            let sum = 0;
            for (let j = 0; j < nMel; j++) {
                sum += melDb[j].reduce((a, b) => a + b, 0) / melDb[j].length * 
                       Math.cos(Math.PI * i * (j + 0.5) / nMel);
            }
            mfcc.push(sum);
        }
        
        return mfcc;
    }
    
    // Compute mel spectrogram
    computeMelSpectrogram(audioData, sampleRate, fftSize, hopLength, nMel) {
        // Simplified mel spectrogram computation
        const nFrames = Math.floor((audioData.length - fftSize) / hopLength) + 1;
        const melSpec = Array(nMel).fill().map(() => Array(nFrames).fill(0));
        
        for (let frame = 0; frame < nFrames; frame++) {
            const start = frame * hopLength;
            const frameData = audioData.slice(start, start + fftSize);
            
            // Apply window and compute magnitude spectrum
            const windowed = frameData.map((sample, i) => 
                sample * (0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1))))
            );
            
            const spectrum = this.computeFFT(windowed);
            
            // Map to mel scale (simplified)
            for (let mel = 0; mel < nMel; mel++) {
                const melFreq = this.hzToMel((mel + 1) * sampleRate / (2 * nMel));
                const bin = Math.floor(melFreq * fftSize / sampleRate);
                if (bin < spectrum.length) {
                    melSpec[mel][frame] = spectrum[bin];
                }
            }
        }
        
        return melSpec;
    }
    
    // Convert Hz to mel scale
    hzToMel(hz) {
        return 2595 * Math.log10(1 + hz / 700);
    }
    
    // Convert mel to Hz scale
    melToHz(mel) {
        return 700 * (Math.pow(10, mel / 2595) - 1);
    }
    
    // Compute FFT (simplified)
    computeFFT(signal) {
        const n = signal.length;
        const result = new Array(n / 2);
        
        for (let k = 0; k < n / 2; k++) {
            let real = 0;
            let imag = 0;
            
            for (let i = 0; i < n; i++) {
                const angle = -2 * Math.PI * k * i / n;
                real += signal[i] * Math.cos(angle);
                imag += signal[i] * Math.sin(angle);
            }
            
            result[k] = Math.sqrt(real * real + imag * imag);
        }
        
        return result;
    }
    
    // Extract spectral features
    extractSpectralFeatures(audioData, sampleRate) {
        const fftSize = 2048;
        const hopLength = 512;
        const nFrames = Math.floor((audioData.length - fftSize) / hopLength) + 1;
        
        let centroidSum = 0;
        let rolloffSum = 0;
        let bandwidthSum = 0;
        
        for (let frame = 0; frame < nFrames; frame++) {
            const start = frame * hopLength;
            const frameData = audioData.slice(start, start + fftSize);
            
            const spectrum = this.computeFFT(frameData);
            const freqs = spectrum.map((_, i) => i * sampleRate / fftSize);
            
            // Spectral centroid
            let weightedSum = 0;
            let magnitudeSum = 0;
            for (let i = 0; i < spectrum.length; i++) {
                weightedSum += freqs[i] * spectrum[i];
                magnitudeSum += spectrum[i];
            }
            centroidSum += magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
            
            // Spectral rolloff (95% of energy)
            let cumsum = 0;
            const threshold = 0.95 * spectrum.reduce((a, b) => a + b, 0);
            for (let i = 0; i < spectrum.length; i++) {
                cumsum += spectrum[i];
                if (cumsum >= threshold) {
                    rolloffSum += freqs[i];
                    break;
                }
            }
            
            // Spectral bandwidth (simplified)
            const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
            let bandwidth = 0;
            for (let i = 0; i < spectrum.length; i++) {
                bandwidth += Math.pow(freqs[i] - centroid, 2) * spectrum[i];
            }
            bandwidthSum += Math.sqrt(bandwidth / Math.max(magnitudeSum, 1e-10));
        }
        
        return {
            centroid: centroidSum / nFrames,
            rolloff: rolloffSum / nFrames,
            bandwidth: bandwidthSum / nFrames
        };
    }
    
    // Calculate zero crossing rate
    calculateZeroCrossingRate(audioData) {
        let crossings = 0;
        for (let i = 1; i < audioData.length; i++) {
            if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
                crossings++;
            }
        }
        return crossings / (audioData.length - 1);
    }

    // Train a new instrument
    async trainInstrument(instrumentName, trainingSamples) {
        const instrumentData = {
            name: instrumentName,
            trainedAt: new Date().toISOString(),
            samples: trainingSamples,
            frequencyMap: this.buildFrequencyMap(trainingSamples),
            confidence: this.calculateConfidence(trainingSamples)
        };

        const saved = this.saveInstrumentData(instrumentName, instrumentData);
        return saved ? instrumentData : null;
    }

    // Build frequency map from training samples (Advanced Python-style)
    buildFrequencyMap(samples) {
        const frequencyMap = {};
        
        // Group samples by note
        samples.forEach((sample, index) => {
            const note = sample.note_name || this.frequencyToNote(sample.frequency);
            if (note) {
                if (!frequencyMap[note]) {
                    frequencyMap[note] = {
                        samples: []
                    };
                }
                frequencyMap[note].samples.push(sample);
            }
        });

        // Calculate advanced statistics for each note
        Object.keys(frequencyMap).forEach(note => {
            const data = frequencyMap[note];
            const noteSamples = data.samples;
            
            if (noteSamples.length === 0) return;
            
            // Calculate frequency statistics
            const frequencies = noteSamples.map(s => s.frequency).filter(f => f > 0);
            const avgFreq = frequencies.length > 0 ? 
                frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length : 0;
            const freqStd = frequencies.length > 1 ? 
                Math.sqrt(frequencies.reduce((sum, f) => sum + Math.pow(f - avgFreq, 2), 0) / frequencies.length) : 0;
            
            // Calculate RMS statistics
            const rmsValues = noteSamples.map(s => s.rms);
            const avgRms = rmsValues.reduce((sum, r) => sum + r, 0) / rmsValues.length;
            
            // Calculate MFCC statistics if available
            let avgMfcc = null;
            if (noteSamples[0].mfcc_mean) {
                const mfccArrays = noteSamples.map(s => s.mfcc_mean).filter(m => m && m.length > 0);
                if (mfccArrays.length > 0) {
                    avgMfcc = Array(mfccArrays[0].length).fill(0);
                    mfccArrays.forEach(mfcc => {
                        mfcc.forEach((val, i) => {
                            avgMfcc[i] += val;
                        });
                    });
                    avgMfcc = avgMfcc.map(val => val / mfccArrays.length);
                }
            }
            
            // Calculate spectral statistics
            const spectralCentroids = noteSamples.map(s => s.spectral_centroid).filter(s => s > 0);
            const avgSpectralCentroid = spectralCentroids.length > 0 ?
                spectralCentroids.reduce((sum, s) => sum + s, 0) / spectralCentroids.length : 0;
            
            // Calculate confidence based on consistency
            const confidence = this.calculateConsistency(noteSamples);
            
            frequencyMap[note] = {
                frequency: avgFreq,
                freq_std: freqStd,
                avg_note: note,
                avg_rms: avgRms,
                sample_count: noteSamples.length,
                avg_mfcc: avgMfcc,
                avg_spectral_centroid: avgSpectralCentroid,
                confidence: confidence,
                recorded: new Date().toISOString()
            };
        });

        return frequencyMap;
    }

    // Calculate overall confidence
    calculateConfidence(samples) {
        if (samples.length === 0) return 0;
        
        const avgConfidence = samples.reduce((sum, s) => sum + s.confidence, 0) / samples.length;
        const consistency = this.calculateConsistency(samples);
        
        return (avgConfidence + consistency) / 2;
    }

    // Calculate frequency consistency across samples
    calculateConsistency(samples) {
        if (samples.length < 2) return 1;
        
        const frequencies = samples.map(s => s.frequency);
        const mean = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
        const variance = frequencies.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / frequencies.length;
        const stdDev = Math.sqrt(variance);
        
        // Lower standard deviation = higher consistency
        return Math.max(0, 1 - (stdDev / mean));
    }

    // Convert frequency to note name
    frequencyToNote(frequency) {
        const A4 = 440;
        const semitone = 12 * Math.log2(frequency / A4);
        const noteNumber = Math.round(semitone) + 69; // MIDI note number
        
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor((noteNumber - 12) / 12);
        const noteName = notes[noteNumber % 12];
        
        return `${noteName}${octave}`;
    }

    // Detect note using trained instrument (Advanced Python-style matching)
    detectNoteWithInstrument(audioData, instrumentName) {
        const instrumentData = this.loadInstrumentData(instrumentName);
        if (!instrumentData) {
            return { note: 'unknown', confidence: 0, error: 'Instrument not trained' };
        }

        const analysis = this.analyzeTrainingSample(audioData);
        if (!analysis) {
            return { note: 'unknown', confidence: 0, error: 'Analysis failed' };
        }
        
        const detectedNote = analysis.note_name || this.frequencyToNote(analysis.frequency);
        
        // Find best match using advanced similarity (like Python version)
        let bestMatch = null;
        let bestSimilarity = 0.0;
        
        Object.keys(instrumentData.frequencyMap).forEach(note => {
            const trainedData = instrumentData.frequencyMap[note];
            
            // Frequency-based similarity (main factor)
            const freqRatio = Math.min(analysis.frequency, trainedData.frequency) / 
                             Math.max(analysis.frequency, trainedData.frequency);
            const freqSimilarity = Math.pow(freqRatio, 2); // Square to emphasize close matches
            
            // Add spectral similarity if available
            let totalSimilarity = freqSimilarity;
            
            if (trainedData.avg_mfcc && analysis.mfcc_mean) {
                // MFCC cosine similarity (like Python version)
                const mfccSimilarity = this.cosineSimilarity(analysis.mfcc_mean, trainedData.avg_mfcc);
                
                // Combine frequency and spectral similarity (70% freq, 30% spectral)
                totalSimilarity = 0.7 * freqSimilarity + 0.3 * Math.max(0, mfccSimilarity);
            }
            
            if (totalSimilarity > bestSimilarity) {
                bestSimilarity = totalSimilarity;
                bestMatch = {
                    note: note,
                    trainedData: trainedData,
                    similarity: totalSimilarity
                };
            }
        });
        
        // Return match only if similarity is reasonable (like Python version)
        if (bestMatch && bestSimilarity > 0.8) {
            return {
                note: bestMatch.note,
                confidence: bestSimilarity * bestMatch.trainedData.confidence,
                frequency: analysis.frequency,
                expectedFrequency: bestMatch.trainedData.frequency,
                frequencyDiff: Math.abs(analysis.frequency - bestMatch.trainedData.frequency),
                similarity: bestSimilarity
            };
        }
        
        return {
            note: detectedNote,
            confidence: bestSimilarity * 0.5, // Lower confidence for poor matches
            frequency: analysis.frequency,
            similarity: bestSimilarity
        };
    }
    
    // Calculate cosine similarity between two vectors
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        
        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator > 0 ? dotProduct / denominator : 0;
    }

    // List all trained instruments
    listTrainedInstruments() {
        try {
            const files = fs.readdirSync(this.trainingDataPath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => {
                    const data = this.loadInstrumentData(file.replace('.json', ''));
                    return {
                        name: data.name,
                        trainedAt: data.trainedAt,
                        sampleCount: data.samples.length,
                        confidence: data.confidence,
                        notes: Object.keys(data.frequencyMap)
                    };
                });
        } catch (error) {
            console.error('Error listing instruments:', error);
            return [];
        }
    }

    // Delete trained instrument
    deleteInstrument(instrumentName) {
        const filePath = path.join(this.trainingDataPath, `${instrumentName}.json`);
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
        } catch (error) {
            console.error('Error deleting instrument:', error);
        }
        return false;
    }
}
