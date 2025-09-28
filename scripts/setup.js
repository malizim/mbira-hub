#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('🎵 Setting up Mbira Recording Session...\n');

// Create necessary directories
const dirs = ['data', 'sessions', 'certs', 'static/img'];
dirs.forEach(dir => {
    const fullPath = path.join(projectRoot, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
    }
});

// Copy environment file
const envExample = path.join(projectRoot, 'env.example');
const envFile = path.join(projectRoot, '.env');
if (!fs.existsSync(envFile)) {
    fs.copyFileSync(envExample, envFile);
    console.log('✅ Created .env file from template');
}

// Generate self-signed certificate if not exists
const certPath = path.join(projectRoot, 'certs', 'cert.pem');
const keyPath = path.join(projectRoot, 'certs', 'key.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.log('🔐 Generating self-signed certificate...');
    try {
        execSync(`openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -subj "/CN=mbira-recording-session"`, { stdio: 'inherit' });
        console.log('✅ Generated self-signed certificate');
    } catch (error) {
        console.log('⚠️  Could not generate certificate (openssl not found). You can generate it manually later.');
    }
}

// Initialize Prisma
console.log('🗄️  Initializing database...');
try {
    execSync('npx prisma generate', { cwd: projectRoot, stdio: 'inherit' });
    execSync('npx prisma db push', { cwd: projectRoot, stdio: 'inherit' });
    console.log('✅ Database initialized');
} catch (error) {
    console.log('❌ Database initialization failed:', error.message);
    process.exit(1);
}

// Download background image if not exists
const bgImagePath = path.join(projectRoot, 'static/img/mbira_bg.png');
if (!fs.existsSync(bgImagePath)) {
    console.log('🖼️  Please add mbira_bg.png to static/img/ directory');
    console.log('   You can use the background image from the original application');
}

// Download logo if not exists
const logoPath = path.join(projectRoot, 'static/img/logo.jpeg');
if (!fs.existsSync(logoPath)) {
    console.log('🏷️  Please add logo.jpeg to static/img/ directory');
    console.log('   You can use the logo from the original application');
}

console.log('\n🎉 Setup complete!');
console.log('\n📋 Next steps:');
console.log('1. Add mbira_bg.png and logo.jpeg to static/img/');
console.log('2. Run: npm install');
console.log('3. Run: npm start');
console.log('4. Open: https://localhost:8443');
console.log('\n🔧 Configuration:');
console.log('- Edit .env file to customize settings');
console.log('- Database: SQLite at ./data/sessions.db');
console.log('- HTTPS: Self-signed certificate in ./certs/');
console.log('- Real-time WebSocket: Port 8766');
