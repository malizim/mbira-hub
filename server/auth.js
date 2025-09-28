import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || '$session123';

// Hash password using SHA256 (matching LKG implementation)
export function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Verify password (matching LKG implementation)
export function verifyPassword(password, hashedPassword) {
    return hashPassword(password) === hashedPassword;
}

// Generate JWT token for session access
export function generateToken(sessionId, role = 'user') {
    return jwt.sign({ sessionId, role }, JWT_SECRET, { expiresIn: '24h' });
}

// Verify JWT token
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Authentication middleware
export function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
}

// Check if password matches session password or master password
export function checkSessionAccess(password, sessionPassword, isMaster = false) {
    if (isMaster && password === MASTER_PASSWORD) {
        return { ok: true, role: 'master' };
    }
    
    if (password && verifyPassword(password, sessionPassword)) {
        return { ok: true, role: 'user' };
    }
    
    return { ok: false, error: 'Invalid password' };
}
