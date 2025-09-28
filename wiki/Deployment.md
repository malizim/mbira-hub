# Deployment Guide

This guide covers various deployment options for Mbira Hub, from local development to production cloud deployment.

## 🏠 Local Development

### Prerequisites
- Node.js 18+
- npm 8+
- Git

### Quick Start
```bash
# Clone repository
git clone https://github.com/malizim/mbira-hub.git
cd mbira-hub

# Install dependencies
npm install

# Setup environment
cp env.example .env

# Start development server
npm run dev
```

**Access**: `https://localhost:3000`

## 🐳 Docker Deployment

### Single Container
```bash
# Build image
docker build -t mbira-hub .

# Run container
docker run -d \
  --name mbira-hub \
  -p 9445:8445 \
  -p 9767:8767 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/certs:/app/certs \
  mbira-hub
```

### Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Access**: `https://localhost:9445`

## ☁️ Google Cloud Platform

### Prerequisites
- Google Cloud account
- `gcloud` CLI installed
- Project with billing enabled

### Quick Deployment
```bash
# Clone repository
git clone https://github.com/malizim/mbira-hub.git
cd mbira-hub

# Setup firewall rules
./setup-gcloud-firewall.sh

# Deploy to GCloud
./deploy-to-gcloud.sh
```

### Manual GCloud Setup

#### Step 1: Create VM Instance
```bash
# Create instance
gcloud compute instances create mbira-hub \
  --zone=us-central1-c \
  --machine-type=e2-medium \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --tags=mbira-hub
```

#### Step 2: Configure Firewall
```bash
# Allow HTTPS traffic
gcloud compute firewall-rules create mbira-https \
  --allow tcp:9445 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mbira-hub

# Allow WebSocket traffic
gcloud compute firewall-rules create mbira-websocket \
  --allow tcp:9767 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mbira-hub

# Allow SSH
gcloud compute firewall-rules create mbira-ssh \
  --allow tcp:22 \
  --source-ranges 0.0.0.0/0 \
  --target-tags mbira-hub
```

#### Step 3: Deploy Application
```bash
# SSH into instance
gcloud compute ssh mbira-hub --zone=us-central1-c

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clone and setup application
git clone https://github.com/malizim/mbira-hub.git
cd mbira-hub

# Setup environment
cp env.example .env
nano .env  # Configure your settings

# Start application
docker-compose up -d
```

## 🔒 SSL Certificate Setup

### Let's Encrypt (Recommended)

#### Automatic Setup
```bash
# Run SSL setup script
./setup-ssl.sh your-domain.com
```

#### Manual Setup
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to application
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/key.pem
sudo chown $USER:$USER ./certs/*.pem

# Setup auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Self-Signed Certificates (Development)
```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## 🌐 Domain Configuration

### DNS Setup
1. **Point your domain** to your server's IP address
2. **Create A record**: `your-domain.com` → `server-ip`
3. **Create CNAME record**: `www.your-domain.com` → `your-domain.com`

### Nginx Configuration (Optional)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass https://localhost:9445;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass https://localhost:9445;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🔧 Environment Configuration

### Production Environment Variables
```env
# Application
NODE_ENV=production
PORT=8445
WS_PORT=8767

# Database
DATABASE_URL=file:/app/data/sessions.db

# Security
JWT_SECRET=your-super-secret-jwt-key-here
MASTER_PASSWORD=your-master-password

# Domain
DOMAIN=your-domain.com

# Data Directories
DATA_DIR=/app/data
CERT_DIR=/app/certs

# SSL
SSL_CERT_PATH=/app/certs/cert.pem
SSL_KEY_PATH=/app/certs/key.pem
```

### Development Environment Variables
```env
# Application
NODE_ENV=development
PORT=3000
WS_PORT=3001

# Database
DATABASE_URL=file:./data/sessions.db

# Security
JWT_SECRET=dev-secret-key
MASTER_PASSWORD=dev-password

# Domain
DOMAIN=localhost

# Data Directories
DATA_DIR=./data
CERT_DIR=./certs
```

## 📊 Monitoring and Logs

### Application Logs
```bash
# Docker logs
docker-compose logs -f mbira-app

# System logs
journalctl -u mbira-hub -f

# Application logs
tail -f /var/log/mbira-hub/app.log
```

### Health Monitoring
```bash
# Check application health
curl -k https://your-domain.com/health

# Check database
docker exec mbira-hub sqlite3 /app/data/sessions.db ".tables"

# Check SSL certificate
openssl x509 -in certs/cert.pem -text -noout
```

### Performance Monitoring
```bash
# Container resource usage
docker stats mbira-hub

# Disk usage
df -h
du -sh /app/data

# Memory usage
free -h
```

## 🔄 Updates and Maintenance

### Application Updates
```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart application
docker-compose restart
```

### Database Maintenance
```bash
# Backup database
cp data/sessions.db data/sessions.db.backup

# Optimize database
docker exec mbira-hub sqlite3 /app/data/sessions.db "VACUUM;"

# Check database integrity
docker exec mbira-hub sqlite3 /app/data/sessions.db "PRAGMA integrity_check;"
```

### SSL Certificate Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew

# Update application certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./certs/key.pem
docker-compose restart
```

## 🚨 Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose logs mbira-app

# Check port conflicts
lsof -i :9445

# Check environment variables
docker-compose config
```

#### SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in certs/cert.pem -dates -noout

# Test SSL connection
openssl s_client -connect your-domain.com:9445

# Check certificate chain
openssl s_client -connect your-domain.com:9445 -showcerts
```

#### Database Issues
```bash
# Check database file permissions
ls -la data/sessions.db

# Repair database
docker exec mbira-hub sqlite3 /app/data/sessions.db ".recover" | sqlite3 data/sessions.db.new
```

### Performance Issues

#### High Memory Usage
```bash
# Check memory usage
docker stats mbira-hub

# Restart container
docker-compose restart mbira-hub

# Check for memory leaks
docker exec mbira-hub ps aux --sort=-%mem
```

#### Slow Response Times
```bash
# Check CPU usage
docker stats mbira-hub

# Check network latency
ping your-domain.com

# Check SSL handshake time
openssl s_client -connect your-domain.com:9445 -servername your-domain.com
```

## 📈 Scaling

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Deploy multiple instances
- Use shared database (PostgreSQL, MySQL)
- Implement session affinity

### Vertical Scaling
- Increase VM resources
- Optimize application code
- Use CDN for static assets
- Implement caching

## 🔐 Security Considerations

### Application Security
- Use strong JWT secrets
- Implement rate limiting
- Validate all inputs
- Use HTTPS only
- Regular security updates

### Infrastructure Security
- Firewall configuration
- Regular OS updates
- SSL certificate monitoring
- Access logging
- Backup encryption

---

**Need help with deployment?** Check the [Troubleshooting Guide](Troubleshooting) or create an issue on GitHub.
