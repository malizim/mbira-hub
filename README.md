# 🎵 Mbira Hub v1.0

       
Professional mbira learning and recording platform with real-time note detection, synchronized playback highlighting, and music sheet generation.

**Developed for Texpo Steamon 2025 by Infinicore Systems (Pvt) Ltd**

<img width="298" height="300" alt="Inificore-Trans1" src="https://github.com/user-attachments/assets/88a7efe4-f7dd-4427-9e0e-337b5b9346ef" />

           
## ✨ Features

### Core Features (v2.5 Parity)
- **Session Management**: Create, join, and delete sessions with password protection
- **Admin Access**: Secure administrator access controls
- **Instrument Detection**: 10-second detection clips with auto-redirect
- **Layered Recording**: Record over existing takes with monitor playback
- **Auto-mix Creation**: Automatic mixdown when layering
- **File Organization**: Hierarchical take display with parent-child relationships

### Advanced Features (New)
- **Real-time Note Detection**: Live note detection and display during recording
- **Synchronized Playback**: Highlight current note during audio playback
- **Music Sheet Generation**: Generate PDF/SVG/text music sheets from note sequences
- **WebSocket Updates**: Real-time session synchronization
- **Enhanced UI**: Mbira-themed design with background and logo integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- FFmpeg (for audio processing)
- OpenSSL (for HTTPS certificates)

### Installation

1. **Clone and setup**:
```bash
cd mbira-hub
npm install
node scripts/setup.js
```

2. **Add visual assets**:
   - Copy `mbira_bg.png` to `static/img/`
   - Copy `logo.jpeg` to `static/img/`

3. **Start the application**:
```bash
npm start
```

4. **Access the application**:
   - Main app: https://localhost:8443
   - Real-time WebSocket: ws://localhost:8766

## 🎯 Usage

### Creating a Session
1. Enter session name and password
2. Click "Create" to generate a new session
3. Auto-redirect to session page

### Real-time Note Detection
1. Click "Start Detection" to begin live note detection
2. Play your mbira - notes will appear in real-time
3. Note sequence builds as you play
4. Click "Stop Detection" when finished

### Recording with Layering
1. Select existing takes to layer over (checkboxes)
2. Enable "Play selected takes while recording"
3. Click "Start Recording" - 5-second countdown begins
4. Selected takes play during recording (1s count-in)
5. New recording + auto-mix are created

### Music Sheet Generation
1. Record notes using real-time detection
2. Click "Generate PDF/SVG/Text" buttons
3. Download music sheet with proper notation

### Synchronized Playback
1. Play any recorded take
2. Current note highlights in the note sequence
3. Visual feedback shows which note is playing

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Server**: `server/index.js` - Main Express server
- **Authentication**: `server/auth.js` - Password-based auth with JWT
- **Database**: `server/database.js` - Prisma ORM with SQLite
- **Detection**: `server/detection.js` - FFT-based note detection
- **Music Sheets**: `server/music-sheet.js` - VexFlow notation generation

### Frontend (Vanilla JS)
- **Main Page**: `web/index.html` - Session list and creation
- **Session Page**: `web/session.html` - Recording interface
- **Real-time Detection**: `static/js/session.js` - Live note detection
- **Styling**: `static/css/styles.css` - Mbira-themed design

### Real-time Communication
- **Socket.IO**: Session updates and synchronization
- **WebSocket**: Real-time note detection streaming
- **Audio Processing**: WebRTC + FFmpeg for recording

## 🔧 Configuration

### Environment Variables (`.env`)
```bash
# Database
DATABASE_URL="file:./data/sessions.db"

# Server
PORT=8443
WS_PORT=8766
DATA_DIR="./data"
CERT_DIR="./certs"

# Authentication
JWT_SECRET="your-secret-key"
MASTER_PASSWORD="$session123"
```

### Audio Settings
- **Sample Rate**: 44.1kHz
- **Channels**: Mono
- **Format**: WAV output
- **Detection Range**: 80Hz - 1200Hz

## 📊 Note Detection

### Supported Notes
- **Low Octave**: F3, G3, A3
- **Middle Octave**: C4, D4, E4, F4, G4, A4  
- **High Octave**: C5, D5, E5, F5, G5, A5

### Detection Algorithm
1. **FFT Analysis**: 8192-point FFT on audio samples
2. **Peak Detection**: Find dominant frequency in 80-1200Hz range
3. **Note Mapping**: Map frequency to closest mbira note
4. **Confidence Scoring**: Rate detection confidence (0-1)
5. **Real-time Updates**: Stream results via WebSocket

## 🎼 Music Sheet Generation

### Supported Formats
- **PDF**: Professional notation with VexFlow
- **SVG**: Scalable vector graphics
- **Text**: ASCII notation for simple viewing

### Features
- **Time Signatures**: 4/4 default, configurable
- **Note Durations**: Quarter notes (0.5s per note)
- **Key Signatures**: Auto-detected from note sequence
- **Download**: Direct download links for generated sheets

## 🔒 Security

### Authentication
- **Session Passwords**: SHA256 hashed
- **Master Password**: `$session123` for admin access
- **JWT Tokens**: 24-hour expiration for session access
- **HTTPS**: Self-signed certificates for secure communication

### Data Protection
- **Local Storage**: All data stored locally
- **No Cloud**: No external data transmission
- **Privacy**: Microphone access only when recording

## 🚀 Deployment

### Production Setup
1. **Generate proper certificates**:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/key.pem -out certs/cert.pem \
  -subj "/CN=your-domain.com"
```

2. **Configure environment**:
```bash
NODE_ENV=production
JWT_SECRET=your-secure-secret
MASTER_PASSWORD=your-secure-password
```

3. **Start with PM2**:
```bash
npm install -g pm2
pm2 start server/index.js --name mbira-session
pm2 save
pm2 startup
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 8443 8766
CMD ["npm", "start"]
```

## 🐛 Troubleshooting

### Common Issues

**Microphone not working**:
- Check browser permissions
- Ensure HTTPS (required for microphone access)
- Try different browser

**Note detection inaccurate**:
- Check microphone quality
- Ensure mbira is tuned properly
- Adjust detection sensitivity in code

**Music sheet generation fails**:
- Check note sequence is not empty
- Ensure VexFlow dependencies are installed
- Check browser console for errors

**WebSocket connection fails**:
- Check firewall settings
- Ensure port 8766 is open
- Verify WebSocket URL in browser

### Debug Mode
```bash
NODE_ENV=development npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Rhythm Keepers**: Original concept and design
- **VexFlow**: Music notation rendering
- **Web Audio API**: Real-time audio processing
- **Socket.IO**: Real-time communication
- **Prisma**: Database ORM

---

**Version**: 3.0.0  
**Last Updated**: 2024  
**Maintainer**: Rhythm Keepers Team
