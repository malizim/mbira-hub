import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper functions for JSON serialization/deserialization
function serializeArray(arr) {
    return JSON.stringify(arr || []);
}

function deserializeArray(str) {
    try {
        return JSON.parse(str || '[]');
    } catch {
        return [];
    }
}

// Session operations
export async function createSession(sessionData) {
    const { id, name, password, instruments = [], takes = [], noteSequence = [] } = sessionData;
    
    return await prisma.session.create({
        data: {
            id,
            name,
            password,
            instruments: serializeArray(instruments),
            noteSequence: serializeArray(noteSequence),
            takes: {
                create: takes.map(take => ({
                    file: take.file,
                    instrument: take.instrument,
                    user: take.user,
                    parents: serializeArray(take.parents),
                    type: take.type,
                    noteSequence: serializeArray(take.noteSequence || [])
                }))
            }
        },
        include: {
            takes: true
        }
    });
}

export async function getSession(sessionId) {
    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
            takes: true
        }
    });
    
    if (!session) return null;
    
    // Convert back to expected format
    return {
        id: session.id,
        name: session.name,
        password: session.password,
        created: session.created.toISOString(),
        updated: session.updated.toISOString(),
        instruments: deserializeArray(session.instruments),
        noteSequence: deserializeArray(session.noteSequence),
        takes: session.takes.map(take => ({
            file: take.file,
            instrument: take.instrument,
            user: take.user,
            parents: deserializeArray(take.parents),
            type: take.type,
            noteSequence: deserializeArray(take.noteSequence)
        }))
    };
}

export async function getAllSessions() {
    const sessions = await prisma.session.findMany({
        include: {
            takes: true
        },
        orderBy: {
            updated: 'desc'
        }
    });
    
    return sessions.map(session => ({
        id: session.id,
        name: session.name,
        instruments: deserializeArray(session.instruments),
        noteSequence: deserializeArray(session.noteSequence),
        takes: session.takes.length
    }));
}

export async function updateSession(sessionId, updateData) {
    const { instruments, takes, noteSequence, ...otherData } = updateData;
    
    const updatePayload = {
        ...otherData,
        updated: new Date()
    };
    
    if (instruments !== undefined) {
        updatePayload.instruments = serializeArray(instruments);
    }
    
    if (noteSequence !== undefined) {
        updatePayload.noteSequence = serializeArray(noteSequence);
    }
    
    if (takes !== undefined) {
        // Delete existing takes and create new ones
        await prisma.take.deleteMany({
            where: { sessionId }
        });
        
        updatePayload.takes = {
            create: takes.map(take => ({
                file: take.file,
                instrument: take.instrument,
                user: take.user,
                parents: serializeArray(take.parents),
                type: take.type,
                noteSequence: serializeArray(take.noteSequence || [])
            }))
        };
    }
    
    return await prisma.session.update({
        where: { id: sessionId },
        data: updatePayload,
        include: {
            takes: true
        }
    });
}

export async function deleteSession(sessionId) {
    // Takes will be deleted automatically due to cascade
    return await prisma.session.delete({
        where: { id: sessionId }
    });
}

export async function addTake(sessionId, takeData) {
    const { file, instrument, user, parents = [], type, noteSequence = [] } = takeData;
    
    // Add the take
    const take = await prisma.take.create({
        data: {
            sessionId,
            file,
            instrument,
            user,
            parents: serializeArray(parents),
            type,
            noteSequence: serializeArray(noteSequence)
        }
    });
    
    // Update session instruments if needed
    const session = await prisma.session.findUnique({
        where: { id: sessionId }
    });
    
    if (session) {
        const instruments = deserializeArray(session.instruments);
        if (!instruments.includes(instrument)) {
            instruments.push(instrument);
            await prisma.session.update({
                where: { id: sessionId },
                data: {
                    instruments: serializeArray(instruments),
                    updated: new Date()
                }
            });
        }
    }
    
    return take;
}

export async function deleteTake(sessionId, fileName) {
    return await prisma.take.deleteMany({
        where: {
            sessionId,
            file: fileName
        }
    });
}

// Cleanup function
export async function disconnect() {
    await prisma.$disconnect();
}
