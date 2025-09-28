// Real-time note detection for home page demo
let audioContext, analyser, microphone;
let isDetecting = false;
let noteSequence = [];
let lastDetectedNote = '';
let lastNoteTime = 0;
let lastMaxValue = 0;
const noteDebounceTime = 1000; // ms - increased to prevent sustained note repeats

// Note mapping for real-time detection
const NOTE_MAPPING = {
    'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
    'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
    'F5': 698.46, 'G5': 783.99, 'A5': 880.00
};

async function fetchSessions() {
    const r = await fetch('/api/sessions');
    const d = await r.json();
    const w = document.getElementById('sessions');
    w.innerHTML = '';
    
    if (d.sessions.length === 0) {
        w.innerHTML = '<div class="text-center text-slate-500 py-4">No sessions found</div>';
        return;
    }
    
    d.sessions.forEach(s => {
        const namePretty = s.name || s.id;
        const c = document.createElement('div');
        c.className = 'border rounded-xl p-3 flex items-center justify-between bg-white';
        const l = document.createElement('div');
        l.innerHTML = `
            <div class="font-semibold">${namePretty}</div>
            <div class="text-xs text-slate-500">
                ID: ${s.id}<br>
                Instruments: ${s.instruments.join(', ') || '—'} · Takes: ${s.takes}
                ${s.noteSequence && s.noteSequence.length > 0 ? ` · Notes: ${s.noteSequence.length}` : ''}
            </div>
        `;
        const rgt = document.createElement('div');
        rgt.innerHTML = `<a href="/session.html?sid=${s.id}" class="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">Open</a>`;
        c.append(l, rgt);
        w.appendChild(c);
    });
}

// Real-time note detection functions
async function startDetection() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 44100
            }
        });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 8192;
        analyser.smoothingTimeConstant = 0.3;
        microphone.connect(analyser);
        
        isDetecting = true;
        noteSequence = [];
        
        document.getElementById('startDetection').disabled = true;
        document.getElementById('stopDetection').disabled = false;
        document.getElementById('currentNote').textContent = 'Listening...';
        document.getElementById('currentFreq').textContent = '0 Hz';
        
        detectNotesRealtime();
    } catch (error) {
        alert('Microphone access required! Error: ' + error.message);
    }
}

function stopDetection() {
    isDetecting = false;
    if (audioContext) audioContext.close();
    
    document.getElementById('startDetection').disabled = false;
    document.getElementById('stopDetection').disabled = true;
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
    
    // Only process if we have a strong signal (increased threshold to reduce sensitivity)
    if (maxValue > 180) {
        const frequency = maxIndex * (sampleRate / 2) / bufferLength;
        const noteInfo = frequencyToNote(frequency);
        
        // Update current note display
        document.getElementById('currentNote').textContent = noteInfo.note;
        document.getElementById('currentFreq').textContent = frequency.toFixed(1) + ' Hz';
        
        if (noteInfo.inScale) {
            document.getElementById('currentNote').style.color = '#00ff88'; // Green
        } else {
            document.getElementById('currentNote').style.color = '#ffaa00'; // Orange
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
        }
        
        lastMaxValue = maxValue;
    } else {
        // No strong signal
        document.getElementById('currentFreq').textContent = 'Listening...';
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

function updateNoteSequenceDisplay() {
    const sequenceElement = document.getElementById('noteSequence');
    if (!sequenceElement) return;
    
    if (noteSequence.length === 0) {
        sequenceElement.innerHTML = 'Note sequence will appear here...';
        return;
    }
    
    const displayNotes = noteSequence.slice(-50);
    sequenceElement.innerHTML = displayNotes.join(' - ');
    sequenceElement.scrollLeft = sequenceElement.scrollWidth;
}

// Session management
document.getElementById('createBtn').addEventListener('click', async () => {
    const n = document.getElementById('newName').value.trim();
    const p = document.getElementById('newPassword').value;
    if (!n || !p) return alert('Please enter a name and password');
    
    const r = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, password: p })
    });
    const d = await r.json();
    if (d.ok) {
        location.href = `/session.html?sid=${d.id}`;
    } else {
        alert(d.error || 'Failed to create');
    }
});

document.getElementById('joinBtn').addEventListener('click', async () => {
    const sessionId = document.getElementById('joinSessId').value.trim();
    const password = document.getElementById('joinPassword').value;
    if (!sessionId || !password) return alert('Please enter both session ID and password');
    
    const r = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
    });
    const d = await r.json();
    if (d.ok) {
        location.href = `/session.html?sid=${encodeURIComponent(sessionId)}`;
    } else {
        alert(d.error || 'Invalid password');
    }
});

document.getElementById('refreshBtn').addEventListener('click', fetchSessions);

// Instrument training functionality
let selectedInstrument = null;
let trainingSamples = [];
let isTraining = false;
let trainingMediaRecorder = null;
let trainingAudioContext = null;
let currentTineIndex = 0;
let currentSampleIndex = 0;
let currentTineSamples = [];
let currentTineAccuracy = [];
let trainingNotes = [
    { note: 'F3', description: 'F note (Bottom Middle - Longest)', position: 'bottom-middle' },
    { note: 'A3', description: 'A note (First Left from F3)', position: 'left-1' },
    { note: 'C4', description: 'C note (First Right from F3)', position: 'right-1' },
    { note: 'D4', description: 'D note (Second Right from F3)', position: 'right-2' },
    { note: 'E4', description: 'E note (Third Right from F3)', position: 'right-3' },
    { note: 'F4', description: 'F note (First Right from A3)', position: 'right-4' },
    { note: 'G4', description: 'G note (Second Right from A3)', position: 'right-5' },
    { note: 'A4', description: 'A note (Third Left from A3)', position: 'left-2' },
    { note: 'C5', description: 'C note (First Right from F4 - Top Row)', position: 'top-right-1' },
    { note: 'D5', description: 'D note (Second Right from A4 - Top Row)', position: 'top-right-2' },
    { note: 'E5', description: 'E note (Third Right from F4 - Top Row)', position: 'top-right-3' },
    { note: 'F5', description: 'F note (Top Middle - Shortest)', position: 'top-middle' }
];

// Mobile detection and optimization
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function applyMobileOptimizations() {
    if (isMobile()) {
        document.body.classList.add('mobile-device');
        
        // Optimize touch interactions
        document.querySelectorAll('.btn, .tine, button').forEach(element => {
            element.style.minHeight = '44px'; // iOS minimum touch target
            element.style.minWidth = '44px';
        });
        
        // Prevent zoom on input focus (iOS)
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.style.fontSize = '16px';
        });
        
        // Optimize modal scrolling
        document.querySelectorAll('.modal-content, .training-modal').forEach(element => {
            element.style.webkitOverflowScrolling = 'touch';
        });
    }
}

// Load instruments on page load
document.addEventListener('DOMContentLoaded', () => {
    loadInstruments();
    createMbiraLayout();
    applyMobileOptimizations();
});

// Reapply mobile optimizations on resize
window.addEventListener('resize', () => {
    applyMobileOptimizations();
});

// Create visual mbira layout
function createMbiraLayout() {
    const tinesContainer = document.querySelector('.tines-container');
    if (!tinesContainer) return;
    
    tinesContainer.innerHTML = '';
    
    // Create a more realistic mbira layout
    const mbiraLayout = [
        // Top row (shortest tines)
        ['F5'],
        // Second row
        ['C5', 'D5', 'E5'],
        // Third row  
        ['A4', 'F4', 'G4'],
        // Bottom row (longest tines)
        ['F3', 'A3', 'C4', 'D4', 'E4']
    ];
    
    mbiraLayout.forEach((row, rowIndex) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'flex justify-center gap-1 mb-1';
        
        row.forEach(noteName => {
            const noteIndex = trainingNotes.findIndex(note => note.note === noteName);
            if (noteIndex !== -1) {
                const note = trainingNotes[noteIndex];
                const tine = document.createElement('div');
                tine.className = 'tine bg-gray-300 p-1 rounded text-center text-xs font-mono cursor-pointer transition-all duration-200 hover:bg-gray-400';
                tine.id = `tine-${noteIndex}`;
                tine.textContent = note.note;
                tine.title = `${note.description} - ${note.position}`;
                
                // Make tines different sizes based on row
                if (rowIndex === 0) tine.className += ' w-8 h-6'; // Top row - shortest
                else if (rowIndex === 1) tine.className += ' w-10 h-8'; // Second row
                else if (rowIndex === 2) tine.className += ' w-12 h-10'; // Third row
                else tine.className += ' w-14 h-12'; // Bottom row - longest
                
                rowDiv.appendChild(tine);
            }
        });
        
        tinesContainer.appendChild(rowDiv);
    });
}

// Update mbira layout highlighting
function updateMbiraHighlighting(currentIndex, nextIndex) {
    // Clear all highlights
    document.querySelectorAll('.tine').forEach(tine => {
        tine.classList.remove('bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500');
        tine.classList.add('bg-gray-300');
    });
    
    // Highlight current tine
    if (currentIndex >= 0 && currentIndex < trainingNotes.length) {
        const currentTine = document.getElementById(`tine-${currentIndex}`);
        if (currentTine) {
            currentTine.classList.remove('bg-gray-300');
            currentTine.classList.add('bg-blue-500', 'text-white');
        }
    }
    
    // Highlight next tine
    if (nextIndex >= 0 && nextIndex < trainingNotes.length) {
        const nextTine = document.getElementById(`tine-${nextIndex}`);
        if (nextTine) {
            nextTine.classList.remove('bg-gray-300');
            nextTine.classList.add('bg-yellow-500', 'text-white');
        }
    }
}

// Instrument training event listeners
document.getElementById('trainNewInstrument').addEventListener('click', () => {
    document.getElementById('trainingModal').classList.remove('hidden');
    document.getElementById('trainingModal').classList.add('flex');
});

document.getElementById('closeTraining').addEventListener('click', () => {
    document.getElementById('trainingModal').classList.add('hidden');
    document.getElementById('trainingModal').classList.remove('flex');
    stopTraining();
});

document.getElementById('refreshInstruments').addEventListener('click', loadInstruments);

document.getElementById('startTraining').addEventListener('click', startTraining);
document.getElementById('stopTraining').addEventListener('click', stopTraining);

// Load trained instruments
async function loadInstruments() {
    try {
        const response = await fetch('/api/instruments');
        const data = await response.json();
        
        if (data.ok) {
            displayInstruments(data.instruments);
        } else {
            console.error('Failed to load instruments:', data.error);
        }
    } catch (error) {
        console.error('Error loading instruments:', error);
    }
}

// Display instruments list
function displayInstruments(instruments) {
    const instrumentList = document.getElementById('instrumentList');
    
    if (instruments.length === 0) {
        instrumentList.innerHTML = '<div class="text-sm text-slate-500">No trained instruments yet</div>';
        return;
    }
    
    instrumentList.innerHTML = instruments.map(instrument => `
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded border">
            <div>
                <div class="font-medium">${instrument.name}</div>
                <div class="text-sm text-slate-500">
                    ${instrument.sampleCount} samples • ${Math.round(instrument.confidence * 100)}% confidence
                </div>
                <div class="text-xs text-slate-400">
                    Trained: ${new Date(instrument.trainedAt).toLocaleDateString()}
                </div>
            </div>
            <div class="flex space-x-2">
                <button onclick="selectInstrument('${instrument.name}')" 
                        class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                    Select
                </button>
                <button onclick="deleteInstrument('${instrument.name}')" 
                        class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                    Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Select instrument for testing
function selectInstrument(instrumentName) {
    selectedInstrument = instrumentName;
    document.getElementById('testInstrument').disabled = false;
    document.getElementById('testInstrument').textContent = `Test ${instrumentName}`;
}

// Delete instrument
async function deleteInstrument(instrumentName) {
    if (!confirm(`Delete instrument "${instrumentName}"?`)) return;
    
    try {
        const response = await fetch(`/api/instruments/${encodeURIComponent(instrumentName)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadInstruments();
            if (selectedInstrument === instrumentName) {
                selectedInstrument = null;
                document.getElementById('testInstrument').disabled = true;
                document.getElementById('testInstrument').textContent = 'Test Selected Instrument';
            }
        } else {
            alert('Failed to delete instrument');
        }
    } catch (error) {
        console.error('Error deleting instrument:', error);
        alert('Error deleting instrument');
    }
}

// Update training UI
function updateTrainingUI() {
    const currentNote = trainingNotes[currentTineIndex];
    const nextNote = trainingNotes[currentTineIndex + 1];
    
    // Update step indicator
    document.getElementById('currentStep').textContent = `${currentTineIndex + 1}/${trainingNotes.length}`;
    
    // Update current note (both large and small displays)
    document.getElementById('currentNote').textContent = currentNote.note;
    document.getElementById('noteDescription').textContent = currentNote.description;
    document.getElementById('currentNoteSmall').textContent = currentNote.note;
    document.getElementById('noteDescriptionSmall').textContent = currentNote.description;
    
    // Update sample progress
    const samplesNeeded = Math.max(0, 4 - currentTineSamples.length);
    document.getElementById('sampleProgress').textContent = `Sample ${currentTineSamples.length + 1}/4 (${samplesNeeded} more needed)`;
    
    // Update next tine preview
    if (nextNote) {
        document.getElementById('nextTinePreview').textContent = `${nextNote.note} - ${nextNote.description}`;
    } else {
        document.getElementById('nextTinePreview').textContent = 'Training Complete!';
    }
    
    // Update mbira highlighting
    updateMbiraHighlighting(currentTineIndex, currentTineIndex + 1);
    
    // Clear frequency display
    document.getElementById('frequencyDisplay').textContent = '-- Hz';
    document.getElementById('frequencyValidation').innerHTML = '';
}

// Validate frequency and provide feedback
function validateFrequency(frequency, expectedNote) {
    const validationDiv = document.getElementById('frequencyValidation');
    
    // Expected frequency ranges for each note (approximate)
    const expectedFrequencies = {
        'F3': 174.61, 'G3': 196.00, 'A3': 220.00,
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
        'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
        'F5': 698.46
    };
    
    const expectedFreq = expectedFrequencies[expectedNote];
    if (!expectedFreq) return true;
    
    // Calculate accuracy percentage
    const diff = Math.abs(frequency - expectedFreq);
    const accuracy = Math.max(0, 100 - (diff / expectedFreq) * 100);
    
    if (accuracy >= 95) {
        validationDiv.innerHTML = `<span class="text-green-600">✓ Excellent! ${accuracy.toFixed(1)}% accurate</span>`;
        return true;
    } else if (accuracy >= 85) {
        validationDiv.innerHTML = `<span class="text-yellow-600">⚠ Good: ${accuracy.toFixed(1)}% accurate (need 95%)</span>`;
        return false;
    } else {
        validationDiv.innerHTML = `<span class="text-red-600">❌ Too far off: ${accuracy.toFixed(1)}% accurate (expected ~${expectedFreq}Hz, got ${frequency.toFixed(1)}Hz). Please try again.</span>`;
        return false;
    }
}

// Start training process
async function startTraining() {
    const instrumentName = document.getElementById('instrumentName').value.trim();
    if (!instrumentName) {
        alert('Please enter an instrument name');
        return;
    }
    
    isTraining = true;
    trainingSamples = [];
    currentTineIndex = 0;
    currentSampleIndex = 0;
    
    // Update button states with visual feedback
    const startBtn = document.getElementById('startTraining');
    const stopBtn = document.getElementById('stopTraining');
    
    startBtn.disabled = true;
    startBtn.classList.add('opacity-50', 'cursor-not-allowed');
    stopBtn.disabled = false;
    stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    
    // Show training details
    document.getElementById('trainingDetails').classList.remove('hidden');
    document.getElementById('trainingProgress').innerHTML = '';
    
    // Update UI for current tine
    updateTrainingUI();
    
    document.getElementById('trainingStatus').textContent = 'Starting training...';
    
    // Set up audio recording for training
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                sampleRate: 48000
            }
        });
        
        trainingAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        trainingMediaRecorder = new MediaRecorder(stream);
        
        trainingMediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                processTrainingSample(event.data, instrumentName);
            }
        };
        
        // Start guided training process
        startGuidedTraining(instrumentName);
        
    } catch (error) {
        console.error('Error starting training:', error);
        alert('Failed to access microphone for training');
        stopTraining();
    }
}

// Start guided training process
function startGuidedTraining(instrumentName) {
    const trainingSteps = [
        { note: 'F3', description: 'Lowest F note (center bottom)' },
        { note: 'G3', description: 'G note' },
        { note: 'A3', description: 'A note' },
        { note: 'C4', description: 'C note' },
        { note: 'D4', description: 'D note' },
        { note: 'E4', description: 'E note' },
        { note: 'F4', description: 'F note (octave)' },
        { note: 'G4', description: 'G note (octave)' },
        { note: 'A4', description: 'A note (octave)' },
        { note: 'C5', description: 'C note (octave)' },
        { note: 'D5', description: 'D note (octave)' },
        { note: 'E5', description: 'E note (octave)' }
    ];
    
    let currentStep = 0;
    let currentNoteSamples = [];
    
    function nextStep() {
        if (currentStep >= trainingSteps.length) {
            completeTraining(instrumentName);
            return;
        }
        
        const step = trainingSteps[currentStep];
        currentNoteSamples = [];
        
        document.getElementById('trainingProgress').innerHTML = `
            <div class="text-center">
                <h4 class="font-semibold text-lg mb-2">Step ${currentStep + 1}/${trainingSteps.length}</h4>
                <div class="text-2xl font-bold text-green-600 mb-2">${step.note}</div>
                <div class="text-sm text-slate-600 mb-4">${step.description}</div>
                <div class="text-sm text-slate-500 mb-4">Record 4 samples of this note</div>
                <div id="sampleProgress" class="text-sm text-blue-600">Sample 1/4</div>
            </div>
        `;
        
        recordTrainingSample(step.note, 0, 4, currentNoteSamples, () => {
            currentStep++;
            setTimeout(nextStep, 1000);
        });
    }
    
    nextStep();
}

// Record a training sample
function recordTrainingSample(noteName, sampleIndex, totalSamples, samples, onComplete) {
    if (sampleIndex >= totalSamples) {
        onComplete();
        return;
    }
    
    document.getElementById('sampleProgress').textContent = `Sample ${sampleIndex + 1}/${totalSamples}`;
    document.getElementById('trainingStatus').textContent = `Recording ${noteName} - Sample ${sampleIndex + 1}`;
    
    // Record for 2 seconds
    trainingMediaRecorder.start();
    
    setTimeout(() => {
        trainingMediaRecorder.stop();
        
        // Wait for data to be processed
        setTimeout(() => {
            recordTrainingSample(noteName, sampleIndex + 1, totalSamples, samples, onComplete);
        }, 500);
    }, 2000);
}

// Process training sample
async function processTrainingSample(audioBlob, instrumentName) {
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('sampleIndex', trainingSamples.length);
        formData.append('totalSamples', '48'); // 12 notes × 4 samples each
        
        const response = await fetch(`/api/instruments/${encodeURIComponent(instrumentName)}/train`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.ok) {
            const analysis = data.analysis;
            
            // Update frequency display
            document.getElementById('frequencyDisplay').textContent = `${analysis.frequency.toFixed(1)} Hz`;
            
            // Validate frequency and calculate accuracy
            const currentNote = trainingNotes[currentTineIndex];
            const expectedFrequencies = {
                'F3': 174.61, 'G3': 196.00, 'A3': 220.00,
                'C4': 261.63, 'D4': 293.66, 'E4': 329.63,
                'F4': 349.23, 'G4': 392.00, 'A4': 440.00,
                'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
                'F5': 698.46
            };
            
            const expectedFreq = expectedFrequencies[currentNote.note];
            const diff = Math.abs(analysis.frequency - expectedFreq);
            const accuracy = Math.max(0, 100 - (diff / expectedFreq) * 100);
            
            // Store sample and accuracy
            currentTineSamples.push(analysis);
            currentTineAccuracy.push(accuracy);
            
            // Validate frequency
            const isValid = validateFrequency(analysis.frequency, currentNote.note);
            
            if (isValid) {
                // Good sample - check if we have enough good samples
                if (currentTineSamples.length >= 4) {
                    // Calculate average accuracy for this tine
                    const avgAccuracy = currentTineAccuracy.reduce((sum, acc) => sum + acc, 0) / currentTineAccuracy.length;
                    
                    if (avgAccuracy >= 95) {
                        // Move to next tine
                        trainingSamples.push(...currentTineSamples);
                        completeTraining(instrumentName);
                    } else {
                        // Need more accurate samples
                        document.getElementById('trainingStatus').textContent = 
                            `Good sample! Average accuracy: ${avgAccuracy.toFixed(1)}% (need 95%). Record more samples for ${currentNote.note}`;
                        currentSampleIndex++;
                        updateTrainingUI();
                    }
                } else {
                    // Need more samples
                    document.getElementById('trainingStatus').textContent = 
                        `Good sample! (${accuracy.toFixed(1)}% accurate) Record ${4 - currentTineSamples.length} more samples for ${currentNote.note}`;
                    currentSampleIndex++;
                    updateTrainingUI();
                }
            } else {
                // Poor sample - ask to retry
                document.getElementById('trainingStatus').textContent = 
                    `Sample not accurate enough (${accuracy.toFixed(1)}%). Please try again for ${currentNote.note}`;
                // Remove the poor sample
                currentTineSamples.pop();
                currentTineAccuracy.pop();
            }
        } else {
            document.getElementById('trainingStatus').textContent = 'Error analyzing sample: ' + data.error;
        }
    } catch (error) {
        console.error('Error processing training sample:', error);
        document.getElementById('trainingStatus').textContent = 'Error processing sample';
    }
}

// Complete training
async function completeTraining(instrumentName) {
    try {
        const response = await fetch(`/api/instruments/${encodeURIComponent(instrumentName)}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                trainingSamples: trainingSamples
            })
        });
        
        const data = await response.json();
        if (data.ok) {
            // Move to next tine
            currentTineIndex++;
            currentSampleIndex = 0;
            currentTineSamples = [];
            currentTineAccuracy = [];
            
            if (currentTineIndex < trainingNotes.length) {
                // Continue with next tine
                updateTrainingUI();
                const currentNote = trainingNotes[currentTineIndex];
                document.getElementById('trainingStatus').textContent = 
                    `✅ Completed ${trainingNotes[currentTineIndex - 1].note}! Now play ${currentNote.note} (${currentNote.description})`;
            } else {
                // Training complete
                document.getElementById('trainingStatus').textContent = 'Training completed successfully!';
                document.getElementById('nextTinePreview').textContent = 'All tines trained!';
                document.getElementById('trainingProgress').innerHTML = `
                    <div class="text-center text-green-600">
                        <div class="text-2xl font-bold mb-2">✅ Training Complete!</div>
                        <div class="text-sm">All ${trainingNotes.length} tines trained with 95%+ accuracy</div>
                        <div class="text-sm">Confidence: ${Math.round(data.instrument.confidence * 100)}%</div>
                    </div>
                `;
                loadInstruments(); // Refresh instrument list
            }
            
            // Refresh instruments list
            loadInstruments();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error completing training:', error);
        alert('Failed to complete training: ' + error.message);
    }
    
    stopTraining();
}

// Stop training
function stopTraining() {
    isTraining = false;
    
    if (trainingMediaRecorder && trainingMediaRecorder.state === 'recording') {
        trainingMediaRecorder.stop();
    }
    
    if (trainingAudioContext) {
        trainingAudioContext.close();
    }
    
    // Reset button states with visual feedback
    const startBtn = document.getElementById('startTraining');
    const stopBtn = document.getElementById('stopTraining');
    
    startBtn.disabled = false;
    startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    stopBtn.disabled = true;
    stopBtn.classList.add('opacity-50', 'cursor-not-allowed');
    
    // Reset training state
    currentTineIndex = 0;
    currentSampleIndex = 0;
    trainingSamples = [];
    currentTineSamples = [];
    currentTineAccuracy = [];
    
    // Hide training details
    document.getElementById('trainingDetails').classList.add('hidden');
    
    // Clear mbira highlighting
    document.querySelectorAll('.tine').forEach(tine => {
        tine.classList.remove('bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500');
        tine.classList.add('bg-gray-300');
    });
    
    document.getElementById('trainingStatus').textContent = 'Training stopped';
    document.getElementById('frequencyValidation').innerHTML = '';
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
            
            // Update button states
            const startBtn = document.getElementById('fullscreenStartDetection');
            const stopBtn = document.getElementById('fullscreenStopDetection');
            
            startBtn.disabled = true;
            startBtn.classList.add('opacity-50', 'cursor-not-allowed');
            stopBtn.disabled = false;
            stopBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            fullscreenNoteSequence = [];
            
            document.getElementById('fullscreenStartDetection').disabled = true;
            document.getElementById('fullscreenStopDetection').disabled = false;
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
    
    // Update button states
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
    
    // Only process if we have a strong signal (increased threshold to reduce sensitivity)
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

// Real-time detection event listeners
document.getElementById('startDetection').addEventListener('click', startDetection);
document.getElementById('stopDetection').addEventListener('click', stopDetection);

// Fullscreen event listeners
document.getElementById('fullscreenBtn').addEventListener('click', openFullscreen);
document.getElementById('exitFullscreen').addEventListener('click', closeFullscreen);
document.getElementById('fullscreenStartDetection').addEventListener('click', startFullscreenDetection);
document.getElementById('fullscreenStopDetection').addEventListener('click', stopFullscreenDetection);

// Initialize
fetchSessions();
