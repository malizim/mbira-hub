import VF from 'vexflow';
import jsPDF from 'jspdf';

/**
 * Generate music sheet from note sequence
 */
export async function generateMusicSheet(noteSequence, format = 'pdf') {
    try {
        if (!Array.isArray(noteSequence) || noteSequence.length === 0) {
            // Return a simple text representation for empty sequences
            return {
                type: 'text',
                data: 'No notes recorded yet. Start playing to generate a music sheet!',
                filename: 'empty-sheet.txt'
            };
        }

        if (format === 'pdf') {
            return await generatePDFMusicSheet(noteSequence);
        } else if (format === 'svg') {
            return await generateSVGMusicSheet(noteSequence);
        } else {
            throw new Error('Unsupported format. Use "pdf" or "svg"');
        }
    } catch (error) {
        console.error('Music sheet generation error:', error);
        throw error;
    }
}

/**
 * Generate PDF music sheet
 */
async function generatePDFMusicSheet(noteSequence) {
    const { div, renderer } = createVexFlowRenderer();
    
    // Create a new score
    const score = VF.EasyScore({ throwOnError: true });
    const system = VF.System({ x: 50, y: 50, width: 700 });
    
    // Convert note sequence to VexFlow notation
    const voice = score.voice(score.notes(convertNotesToVexFlow(noteSequence), { time: "4/4" }));
    
    // Add time signature
    const timeSig = new VF.TimeSignature("4/4");
    system.addStave({
        voices: [voice]
    }).addTimeSignature(timeSig);
    
    // Render the score
    renderer.draw();
    
    // Convert to PDF
    const svgElement = div.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svgElement);
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = 'data:image/svg+xml;base64,' + btoa(svgData);
    
    pdf.addImage(imgData, 'SVG', 10, 10, 190, 120);
    
    return {
        type: 'pdf',
        data: pdf.output('datauristring'),
        filename: `mbira-sheet-${Date.now()}.pdf`
    };
}

/**
 * Generate SVG music sheet
 */
async function generateSVGMusicSheet(noteSequence) {
    const { div, renderer } = createVexFlowRenderer();
    
    const score = VF.EasyScore({ throwOnError: true });
    const system = VF.System({ x: 50, y: 50, width: 700 });
    
    const voice = score.voice(score.notes(convertNotesToVexFlow(noteSequence), { time: "4/4" }));
    
    const timeSig = new VF.TimeSignature("4/4");
    system.addStave({
        voices: [voice]
    }).addTimeSignature(timeSig);
    
    renderer.draw();
    
    const svgElement = div.querySelector('svg');
    const svgData = new XMLSerializer().serializeToString(svgElement);
    
    return {
        type: 'svg',
        data: svgData,
        filename: `mbira-sheet-${Date.now()}.svg`
    };
}

/**
 * Create VexFlow renderer
 */
function createVexFlowRenderer() {
    const div = document.createElement('div');
    div.style.width = '800px';
    div.style.height = '200px';
    
    const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
    renderer.resize(800, 200);
    
    return { div, renderer };
}

/**
 * Convert note sequence to VexFlow notation
 */
function convertNotesToVexFlow(noteSequence) {
    const notes = [];
    let currentMeasure = [];
    let measureCount = 0;
    
    // Group notes into measures (4 beats per measure)
    for (let i = 0; i < noteSequence.length; i++) {
        const note = noteSequence[i];
        
        if (currentMeasure.length >= 4) {
            // Add measure to notes
            notes.push(currentMeasure.join(' '));
            currentMeasure = [];
            measureCount++;
        }
        
        // Convert note to VexFlow format
        const vexNote = convertSingleNote(note);
        currentMeasure.push(vexNote);
    }
    
    // Add remaining notes
    if (currentMeasure.length > 0) {
        // Pad with rests if needed
        while (currentMeasure.length < 4) {
            currentMeasure.push('r1');
        }
        notes.push(currentMeasure.join(' '));
    }
    
    return notes;
}

/**
 * Convert single note to VexFlow format
 */
function convertSingleNote(note) {
    // Map note names to VexFlow format
    const noteMap = {
        'F3': 'f/4', 'G3': 'g/4', 'A3': 'a/4',
        'C4': 'c/5', 'D4': 'd/5', 'E4': 'e/5',
        'F4': 'f/5', 'G4': 'g/5', 'A4': 'a/5',
        'C5': 'c/6', 'D5': 'd/6', 'E5': 'e/6',
        'F5': 'f/6', 'G5': 'g/6', 'A5': 'a/6'
    };
    
    return noteMap[note] || 'r1'; // Default to rest if note not found
}

/**
 * Generate simple text-based music sheet
 */
export function generateTextMusicSheet(noteSequence) {
    const lines = [];
    lines.push('MBIRA MUSIC SHEET');
    lines.push('================');
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Total Notes: ${noteSequence.length}`);
    lines.push('');
    lines.push('NOTATION:');
    lines.push('---------');
    
    // Group notes into measures
    const measures = [];
    for (let i = 0; i < noteSequence.length; i += 4) {
        const measure = noteSequence.slice(i, i + 4);
        measures.push(measure);
    }
    
    measures.forEach((measure, index) => {
        const measureNum = (index + 1).toString().padStart(2, '0');
        const notes = measure.map(note => note.padEnd(3, ' ')).join(' | ');
        lines.push(`Measure ${measureNum}: | ${notes} |`);
    });
    
    lines.push('');
    lines.push('LEGEND:');
    lines.push('-------');
    lines.push('F3, G3, A3 = Low octave');
    lines.push('C4, D4, E4, F4, G4, A4 = Middle octave');
    lines.push('C5, D5, E5, F5, G5, A5 = High octave');
    
    return lines.join('\n');
}

/**
 * Generate MIDI-like representation
 */
export function generateMIDIRepresentation(noteSequence) {
    const midiNotes = noteSequence.map(note => {
        const midiMap = {
            'F3': 53, 'G3': 55, 'A3': 57,
            'C4': 60, 'D4': 62, 'E4': 64,
            'F4': 65, 'G4': 67, 'A4': 69,
            'C5': 72, 'D5': 74, 'E5': 76,
            'F5': 77, 'G5': 79, 'A5': 81
        };
        return midiMap[note] || 60; // Default to C4
    });
    
    return {
        notes: midiNotes,
        duration: noteSequence.length * 0.5, // 0.5 seconds per note
        tempo: 120,
        timeSignature: '4/4'
    };
}
