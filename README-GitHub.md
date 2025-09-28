# 🎵 Mbira Recording Session

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Mobile Ready](https://img.shields.io/badge/mobile-ready-green.svg)](https://github.com/malizim/mbira-recording-session)

A modern, real-time mbira recording application with advanced note detection, instrument training, and music sheet generation capabilities. Built with Node.js, featuring mobile-responsive design and comprehensive deployment options.

## ✨ Features

### 🎼 **Real-Time Note Detection**
- **Reduced Sensitivity**: Smart detection that only triggers on note attacks, not sustained notes
- **48kHz Professional Audio**: High-quality audio processing for accurate detection
- **Mobile Optimized**: Touch-friendly interface with automatic mobile detection
- **Fullscreen Mode**: Large display for live performances

### 🎓 **Advanced Instrument Training**
- **Guided Learning**: Step-by-step training for each mbira tine
- **95% Accuracy Requirement**: Ensures precise instrument calibration
- **Visual Mbira Layout**: Interactive diagram showing current and next tines
- **Frequency Validation**: Real-time feedback on note accuracy
- **Multi-Sample Recording**: 4 samples per tine for robust training

### 📱 **Mobile-Responsive Design**
- **Automatic Detection**: Adapts to mobile devices automatically
- **Touch Optimized**: 44px minimum touch targets for easy interaction
- **Responsive Layout**: Works perfectly on phones, tablets, and desktops
- **Smooth Scrolling**: Optimized for touch devices

### 🎵 **Music Sheet Generation**
- **Multiple Formats**: PDF, SVG, and Text output
- **Professional Quality**: Clean, readable music notation
- **Real-Time Updates**: Sheets update as you play
- **Download Ready**: Instant download of generated sheets

### 🔧 **Professional Features**
- **Layered Recording**: Record multiple takes and mix them
- **WebSocket Communication**: Real-time collaboration
- **SSL/HTTPS Support**: Secure connections
- **Health Monitoring**: Built-in health checks and monitoring
- **Comprehensive Logging**: Detailed logs for debugging

## 🚀 Quick Start

### Option 1: One-Line Installation (Recommended)
```bash
curl -fsSL https://raw.githubusercontent.com/malizim/mbira-recording-session/main/install.sh | sudo bash
```

### Option 2: Docker Deployment
```bash
git clone https://github.com/malizim/mbira-recording-session.git
cd mbira-recording-session
./docker-deploy.sh deploy
```

### Option 3: Manual Setup
```bash
git clone https://github.com/malizim/mbira-recording-session.git
cd mbira-recording-session
npm install
npm start
```

**Access the application at: https://localhost**

## 📖 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in minutes
- **[Deployment Guide](DEPLOYMENT.md)** - Comprehensive deployment options
- **[API Documentation](#api-reference)** - Available endpoints and usage

## 🛠️ Technology Stack

- **Backend**: Node.js 20+, Express.js
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: SQLite with Prisma ORM
- **Audio Processing**: Web Audio API, FFT analysis
- **Deployment**: Docker, Nginx, Systemd
- **Security**: SSL/TLS, JWT authentication

## 📱 Mobile Features

The application automatically detects mobile devices and provides:
- Touch-optimized interface
- Responsive design for all screen sizes
- Fullscreen note detection
- Smooth touch interactions
- Mobile-specific optimizations

## 🎯 Use Cases

- **Music Education**: Learn mbira with guided training
- **Performance Recording**: Record and analyze performances
- **Music Composition**: Generate sheet music from recordings
- **Collaboration**: Real-time sharing with other musicians
- **Mobile Practice**: Practice anywhere with your phone

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=8443
WS_PORT=8766
DATA_DIR=/app/data
```

### SSL Certificates
The application includes self-signed certificates for development. For production, replace with valid certificates.

## 📊 Monitoring

### Health Check
```bash
curl -k https://localhost/health
```

### Test Suite
```bash
./test-deployment.sh
```

## 🚀 Deployment Options

### Shell Script Installation
- Automatic system setup
- Systemd service management
- Nginx reverse proxy
- SSL certificate generation
- Firewall configuration

### Docker Compose
- Multi-container setup
- Easy scaling
- Volume persistence
- Health monitoring
- Easy updates

### Manual Installation
- Custom configuration
- Step-by-step setup
- Full control over environment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the mbira community
- Inspired by traditional African music
- Thanks to all contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/malizim/mbira-recording-session/issues)
- **Documentation**: [Wiki](https://github.com/malizim/mbira-recording-session/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/malizim/mbira-recording-session/discussions)

---

**Happy Recording! 🎵✨**
