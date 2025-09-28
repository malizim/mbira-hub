# 🎵 Mbira Recording Session - Quick Start Guide

Get your mbira recording session up and running in minutes!

## 🚀 Quick Deployment Options

### Option 1: Shell Script (Recommended for Production)

```bash
# One-line installation
curl -fsSL https://raw.githubusercontent.com/your-repo/mbira-recording-session/main/install.sh | sudo bash

# Or download and run manually
wget https://raw.githubusercontent.com/your-repo/mbira-recording-session/main/install.sh
chmod +x install.sh
sudo ./install.sh
```

**What it does:**
- Installs Node.js 20, FFmpeg, Nginx
- Creates systemd service
- Sets up SSL certificates
- Configures firewall
- Starts all services

**Access:** https://localhost

### Option 2: Docker Compose (Recommended for Development)

```bash
# Clone and deploy
git clone https://github.com/your-repo/mbira-recording-session.git
cd mbira-recording-session
./docker-deploy.sh deploy
```

**What it does:**
- Builds Docker containers
- Sets up Nginx reverse proxy
- Creates SSL certificates
- Starts all services

**Access:** https://localhost

### Option 3: Manual Installation

```bash
# Install dependencies
sudo apt update
sudo apt install -y nodejs npm ffmpeg nginx openssl

# Clone repository
git clone https://github.com/your-repo/mbira-recording-session.git
cd mbira-recording-session

# Install application
npm install
sudo cp -r . /opt/mbira-recording-session
sudo chown -R mbira:mbira /opt/mbira-recording-session

# Start application
npm start
```

## 🎯 Quick Commands

### Shell Script Installation
```bash
# Check status
sudo systemctl status mbira-recording-session

# View logs
sudo journalctl -u mbira-recording-session -f

# Restart service
sudo systemctl restart mbira-recording-session

# Stop service
sudo systemctl stop mbira-recording-session
```

### Docker Installation
```bash
# Check status
docker compose ps

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Stop services
docker compose down

# Update application
./docker-deploy.sh update
```

## 🧪 Test Your Installation

```bash
# Run the test suite
./test-deployment.sh

# Or use npm script
npm run deploy:test
```

## 🔧 Configuration

### Environment Variables
```bash
# Set in /opt/mbira-recording-session/.env (shell) or docker-compose.yml (Docker)
NODE_ENV=production
PORT=8443
WS_PORT=8766
DATA_DIR=/app/data
```

### SSL Certificates
```bash
# For production, replace self-signed certificates
sudo cp your-cert.pem /opt/mbira-recording-session/certs/cert.pem
sudo cp your-key.pem /opt/mbira-recording-session/certs/key.pem
sudo systemctl restart mbira-recording-session nginx
```

## 📱 Mobile Access

The application is fully mobile-responsive and will automatically detect and optimize for mobile devices.

**Mobile Features:**
- Touch-friendly interface
- Responsive design
- Optimized for small screens
- Full-screen note detection

## 🎵 Using the Application

1. **Create a Session**: Enter session name and password
2. **Record Audio**: Click "Start Recording" and play your mbira
3. **Real-time Detection**: See notes detected in real-time
4. **Generate Music Sheets**: Download PDF, SVG, or text formats
5. **Train Instruments**: Use the instrument training system

## 🆘 Troubleshooting

### Common Issues

**Service won't start:**
```bash
sudo journalctl -u mbira-recording-session -f
```

**Port conflicts:**
```bash
sudo lsof -i :8443
sudo kill -9 <PID>
```

**SSL issues:**
```bash
sudo openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

**Permission issues:**
```bash
sudo chown -R mbira:mbira /opt/mbira-recording-session
```

### Docker Issues

**Container won't start:**
```bash
docker compose logs mbira-app
```

**Volume issues:**
```bash
sudo chown -R 1001:1001 data/
```

## 📊 Monitoring

### Health Check
```bash
curl -k https://localhost/health
```

### Performance Monitoring
```bash
# System resources
htop

# Disk usage
df -h

# Memory usage
free -h
```

## 🔄 Updates

### Shell Script Installation
```bash
# Stop service
sudo systemctl stop mbira-recording-session

# Update files
sudo cp -r /path/to/updated/files/* /opt/mbira-recording-session/

# Update dependencies
cd /opt/mbira-recording-session
sudo -u mbira npm install --production

# Start service
sudo systemctl start mbira-recording-session
```

### Docker Installation
```bash
# Update application
./docker-deploy.sh update

# Or manually
git pull
docker compose up -d --build
```

## 🗑️ Uninstallation

### Shell Script Installation
```bash
sudo systemctl stop mbira-recording-session
sudo systemctl disable mbira-recording-session
sudo rm -rf /opt/mbira-recording-session
sudo rm /etc/systemd/system/mbira-recording-session.service
sudo rm /etc/nginx/sites-available/mbira-recording-session
sudo rm /etc/nginx/sites-enabled/mbira-recording-session
sudo systemctl daemon-reload
sudo systemctl reload nginx
```

### Docker Installation
```bash
docker compose down
docker volume rm mbira-recording-session_redis-data
docker rmi mbira-recording-session_mbira-app
docker system prune -f
```

## 📚 More Information

- **Full Documentation**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **API Reference**: Available at `/api/` endpoints
- **Health Check**: Available at `/health` endpoint
- **WebSocket**: Available at `ws://localhost:8766`

## 🆘 Support

If you encounter any issues:

1. Check the logs for error messages
2. Verify all prerequisites are met
3. Ensure ports are available
4. Check firewall configuration
5. Verify SSL certificates

For more help, please refer to the full documentation or create an issue on GitHub.

---

**Happy Recording! 🎵✨**
