# Installation Guide

This guide will help you install and set up Mbira Hub on your local machine or server.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Docker**: Optional, for containerized deployment

### Browser Requirements
- **Chrome**: Version 88+ (recommended)
- **Firefox**: Version 85+
- **Safari**: Version 14+
- **Edge**: Version 88+

### Hardware Requirements
- **Microphone**: Required for audio input
- **RAM**: Minimum 2GB, recommended 4GB+
- **Storage**: 500MB for application files

## 🚀 Installation Methods

### Method 1: Local Development Setup

#### Step 1: Clone the Repository
```bash
git clone https://github.com/malizim/mbira-hub.git
cd mbira-hub
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Environment Configuration
```bash
# Copy the example environment file
cp env.example .env

# Edit the environment file
nano .env
```

#### Step 4: Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Initialize the database
npx prisma db push
```

#### Step 5: Start the Application
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Method 2: Docker Deployment

#### Step 1: Clone and Navigate
```bash
git clone https://github.com/malizim/mbira-hub.git
cd mbira-hub
```

#### Step 2: Environment Setup
```bash
# Copy and configure environment
cp env.example .env
nano .env
```

#### Step 3: Docker Compose
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Method 3: Google Cloud Deployment

#### Step 1: Prerequisites
- Google Cloud account
- `gcloud` CLI installed
- Project with billing enabled

#### Step 2: Setup Scripts
```bash
# Make scripts executable
chmod +x setup-gcloud-firewall.sh
chmod +x deploy-to-gcloud.sh

# Configure firewall
./setup-gcloud-firewall.sh

# Deploy to GCloud
./deploy-to-gcloud.sh
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application Settings
NODE_ENV=production
PORT=8445
WS_PORT=8767

# Database
DATABASE_URL=file:/app/data/sessions.db

# Security
JWT_SECRET=your-secret-key-here
MASTER_PASSWORD=your-master-password

# Domain
DOMAIN=your-domain.com

# Data Directories
DATA_DIR=/app/data
CERT_DIR=/app/certs
```

### SSL Certificate Setup

#### Option 1: Let's Encrypt (Recommended)
```bash
# Run the SSL setup script
./setup-ssl.sh your-domain.com
```

#### Option 2: Self-Signed (Development)
```bash
# Generate self-signed certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## 🔧 Post-Installation

### Verify Installation

1. **Check Application Status**
   ```bash
   curl -k https://localhost:9445/health
   ```

2. **Test Audio Detection**
   - Open the application in your browser
   - Click "Start Detection" in the demo section
   - Allow microphone access when prompted

3. **Test Session Creation**
   - Create a new session
   - Verify it appears in the sessions list

### Browser Configuration

#### Chrome/Edge
1. Go to `chrome://settings/content/microphone`
2. Add your domain to allowed sites
3. Ensure microphone access is enabled

#### Firefox
1. Go to `about:preferences#privacy`
2. Click "Settings" next to Microphone
3. Add your domain to allowed sites

#### Safari
1. Go to Safari > Preferences > Websites
2. Select Microphone
3. Set your domain to "Allow"

## 🐛 Troubleshooting

### Common Issues

#### Microphone Not Working
- **Check browser permissions**: Ensure microphone access is allowed
- **Check HTTPS**: Microphone requires secure context (HTTPS)
- **Check browser compatibility**: Use supported browser versions

#### Database Errors
```bash
# Reset database
rm -f data/sessions.db
npx prisma db push
```

#### Port Conflicts
```bash
# Check what's using the port
lsof -i :9445

# Kill the process
kill -9 <PID>
```

#### Docker Issues
```bash
# Clean up containers
docker-compose down --remove-orphans

# Rebuild containers
docker-compose up --build -d
```

### Logs and Debugging

#### Application Logs
```bash
# Docker logs
docker-compose logs -f mbira-app

# Direct logs
npm run dev 2>&1 | tee app.log
```

#### Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for error messages
4. Check Network tab for failed requests

## 📞 Support

If you encounter issues:

1. **Check the logs** (see above)
2. **Review this guide** for common solutions
3. **Check browser compatibility**
4. **Create an issue** on GitHub with:
   - Error messages
   - Browser version
   - Operating system
   - Steps to reproduce

## 🔄 Updates

To update Mbira Hub:

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart application
npm restart
# or
docker-compose restart
```

---

**Next Steps**: [User Manual](User-Manual) | [API Documentation](API-Documentation)
