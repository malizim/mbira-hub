# Welcome to Mbira Hub

**🎵 A Professional Mbira Learning Platform with Real-time Note Detection**

Mbira Hub is an innovative web application designed to help musicians learn and master the traditional African mbira instrument through real-time audio analysis, note detection, and interactive training sessions.

## 🌟 Key Features

### 🎼 Real-time Note Detection
- **Live Audio Analysis**: Detects musical notes in real-time as you play
- **Fullscreen Mode**: Immersive fullscreen note detection experience
- **Audio Calibration**: Optimize detection for your specific device and environment
- **Visual Feedback**: Real-time display of detected notes and frequencies

### 🎓 Instrument Training
- **Custom Training**: Train the system to recognize your specific mbira
- **Progressive Learning**: Step-by-step training for all 12 standard mbira notes
- **Visual Mbira Layout**: Interactive diagram showing note positions
- **Accuracy Testing**: Test your trained instrument's detection accuracy

### 👥 Session Management
- **Create Sessions**: Set up new learning sessions with custom names and passwords
- **Join Sessions**: Connect to existing sessions for collaborative learning
- **Session History**: Track and manage your learning sessions
- **Secure Access**: Password-protected sessions for privacy

### 📱 Mobile Optimized
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Touch-Friendly**: Optimized for touch interactions
- **Mobile Audio**: Full microphone access support on mobile browsers
- **Adaptive Layout**: Automatically adjusts to different screen sizes

## 🚀 Quick Start

### Prerequisites
- Modern web browser with microphone access
- Node.js 18+ (for development)
- Docker (for containerized deployment)

### Local Development
```bash
# Clone the repository
git clone https://github.com/malizim/mbira-hub.git
cd mbira-hub

# Install dependencies
npm install

# Set up environment
cp env.example .env

# Start development server
npm run dev
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the application
open https://localhost:9445
```

## 🌐 Live Demo

**Production URL**: [https://infinicore.co.zw:9445](https://infinicore.co.zw:9445)

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: SQLite with Prisma ORM
- **Real-time**: WebSockets for live audio processing
- **Audio Processing**: Web Audio API, FFT analysis
- **Styling**: Tailwind CSS
- **Deployment**: Docker, Google Cloud Platform

## 📚 Documentation

- [Installation Guide](Installation)
- [User Manual](User-Manual)
- [API Documentation](API-Documentation)
- [Deployment Guide](Deployment)
- [Troubleshooting](Troubleshooting)
- [Contributing](Contributing)

## 🎯 Use Cases

- **Music Education**: Learn traditional African mbira music
- **Research**: Study mbira note patterns and frequencies
- **Performance**: Practice with real-time feedback
- **Teaching**: Interactive lessons for students
- **Recording**: Capture and analyze mbira performances

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](Contributing) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Developed for **Texpo Steamon 2025** by **Infinicore Systems (Pvt) Ltd**
- Built with modern web technologies and traditional African music in mind
- Special thanks to the mbira community for inspiration and feedback

---

**Ready to start your mbira journey?** [Get Started Now](https://infinicore.co.zw:9445) 🎵
