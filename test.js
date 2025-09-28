#!/usr/bin/env node

// Test script for Mbira Recording Session v3.0
// Verifies all components are working correctly

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🧪 Testing Mbira Recording Session v3.0...\n');

let testsPassed = 0;
let totalTests = 0;

function test(name, condition) {
    totalTests++;
    if (condition) {
        console.log(`✅ ${name}`);
        testsPassed++;
    } else {
        console.log(`❌ ${name}`);
    }
}

// Test 1: Check if all required files exist
console.log('📁 File Structure Tests:');
test('Package.json exists', fs.existsSync(path.join(__dirname, 'package.json')));
test('Main server file exists', fs.existsSync(path.join(__dirname, 'server/index.js')));
test('Database schema exists', fs.existsSync(path.join(__dirname, 'prisma/schema.prisma')));
test('Main HTML page exists', fs.existsSync(path.join(__dirname, 'web/index.html')));
test('Session HTML page exists', fs.existsSync(path.join(__dirname, 'web/session.html')));
test('Main JS file exists', fs.existsSync(path.join(__dirname, 'static/js/main.js')));
test('Session JS file exists', fs.existsSync(path.join(__dirname, 'static/js/session.js')));
test('CSS file exists', fs.existsSync(path.join(__dirname, 'static/css/styles.css')));
test('Environment template exists', fs.existsSync(path.join(__dirname, 'env.example')));

// Test 2: Check if directories exist
console.log('\n📂 Directory Structure Tests:');
test('Data directory exists', fs.existsSync(path.join(__dirname, 'data')));
test('Sessions directory exists', fs.existsSync(path.join(__dirname, 'sessions')));
test('Static directory exists', fs.existsSync(path.join(__dirname, 'static')));
test('Server directory exists', fs.existsSync(path.join(__dirname, 'server')));
test('Web directory exists', fs.existsSync(path.join(__dirname, 'web')));

// Test 3: Check if node_modules exists (if npm install was run)
console.log('\n📦 Dependency Tests:');
test('Node modules directory exists', fs.existsSync(path.join(__dirname, 'node_modules')));
test('Express dependency exists', fs.existsSync(path.join(__dirname, 'node_modules/express')));
test('Socket.io dependency exists', fs.existsSync(path.join(__dirname, 'node_modules/socket.io')));
test('Prisma dependency exists', fs.existsSync(path.join(__dirname, 'node_modules/@prisma/client')));

// Test 4: Check if .env file exists
console.log('\n🔧 Configuration Tests:');
test('Environment file exists', fs.existsSync(path.join(__dirname, '.env')));

// Test 5: Check if certificates exist
console.log('\n🔐 Security Tests:');
test('Certificate directory exists', fs.existsSync(path.join(__dirname, 'certs')));
test('Certificate file exists', fs.existsSync(path.join(__dirname, 'certs/cert.pem')));
test('Private key file exists', fs.existsSync(path.join(__dirname, 'certs/key.pem')));

// Test 6: Check if visual assets exist
console.log('\n🎨 Visual Assets Tests:');
test('Static img directory exists', fs.existsSync(path.join(__dirname, 'static/img')));
const hasBackground = fs.existsSync(path.join(__dirname, 'static/img/mbira_bg.png'));
const hasLogo = fs.existsSync(path.join(__dirname, 'static/img/logo.jpeg'));

if (hasBackground) {
    test('Background image exists', true);
} else {
    console.log('⚠️  Background image missing (mbira_bg.png)');
}

if (hasLogo) {
    test('Logo image exists', true);
} else {
    console.log('⚠️  Logo image missing (logo.jpeg)');
}

// Test 7: Check if database is initialized
console.log('\n🗄️  Database Tests:');
const dbExists = fs.existsSync(path.join(__dirname, 'data/sessions.db'));
test('Database file exists', dbExists);

// Test 8: Check if all required modules can be imported
console.log('\n🔌 Module Import Tests:');
try {
    const { detectInstrument } = await import('./server/detection.js');
    test('Detection module imports', typeof detectInstrument === 'function');
} catch (e) {
    test('Detection module imports', false);
}

try {
    const { hashPassword } = await import('./server/auth.js');
    test('Auth module imports', typeof hashPassword === 'function');
} catch (e) {
    test('Auth module imports', false);
}

try {
    const { createSession } = await import('./server/database.js');
    test('Database module imports', typeof createSession === 'function');
} catch (e) {
    test('Database module imports', false);
}

// Summary
console.log('\n📊 Test Summary:');
console.log(`   Tests Passed: ${testsPassed}/${totalTests}`);
console.log(`   Success Rate: ${Math.round((testsPassed / totalTests) * 100)}%`);

if (testsPassed === totalTests) {
    console.log('\n🎉 All tests passed! The application is ready to run.');
    console.log('\n🚀 To start the application:');
    console.log('   npm start');
    console.log('\n🌐 Then open: https://localhost:8443');
} else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    console.log('\n🔧 To fix common issues:');
    console.log('   npm install          # Install dependencies');
    console.log('   node scripts/setup.js # Run setup script');
    console.log('   ./deploy.sh          # Run full deployment');
}

console.log('\n📚 For more information, see README.md');
