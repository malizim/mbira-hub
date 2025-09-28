# Mbira Recording Session - Deployment Guide

This guide covers multiple deployment options for the Mbira Recording Session application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Shell Script Installation](#shell-script-installation)
3. [Docker Compose Deployment](#docker-compose-deployment)
4. [Manual Installation](#manual-installation)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

## Prerequisites

### System Requirements

- **OS**: Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 5GB free space
- **CPU**: 2+ cores recommended
- **Network**: Ports 80, 443, 8443, 8766 available

### Required Software

#### For Shell Script Installation:
- Root access (sudo)
- Internet connection
- Package manager (apt, yum, or dnf)

#### For Docker Deployment:
- Docker 20.10+
- Docker Compose 2.0+
- Internet connection

## Shell Script Installation

### Quick Start

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/your-repo/mbira-recording-session/main/install.sh | sudo bash
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/mbira-recording-session.git
cd mbira-recording-session

# Make the script executable
chmod +x install.sh

# Run the installation
sudo ./install.sh
```

### What the Script Does

1. **System Check**: Verifies OS compatibility and resources
2. **Dependencies**: Installs Node.js 20, FFmpeg, and other requirements
3. **User Creation**: Creates dedicated service user and group
4. **Application Setup**: Installs application to `/opt/mbira-recording-session`
5. **SSL Certificates**: Generates self-signed certificates
6. **Systemd Service**: Creates and enables system service
7. **Nginx Configuration**: Sets up reverse proxy with SSL
8. **Firewall**: Configures basic firewall rules
9. **Service Start**: Starts all services

### Post-Installation

After installation, the application will be available at:
- **URL**: https://localhost
- **Service**: `systemctl status mbira-recording-session`
- **Logs**: `journalctl -u mbira-recording-session -f`

## Docker Compose Deployment

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-repo/mbira-recording-session.git
cd mbira-recording-session

# Make the deployment script executable
chmod +x docker-deploy.sh

# Deploy the application
./docker-deploy.sh deploy
```

### Available Commands

```bash
# Deploy application
./docker-deploy.sh deploy

# Update application
./docker-deploy.sh update

# Stop services
./docker-deploy.sh stop

# Start services
./docker-deploy.sh start

# Restart services
./docker-deploy.sh restart

# View logs
./docker-deploy.sh logs

# Check status
./docker-deploy.sh status

# Cleanup old containers
./docker-deploy.sh cleanup
```

### Manual Docker Compose

```bash
# Build and start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after changes
docker compose up -d --build
```

### Docker Services

The Docker Compose setup includes:

- **mbira-app**: Main application container
- **nginx**: Reverse proxy with SSL termination
- **redis**: Session storage and caching

## Manual Installation

### 1. Install Dependencies

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install -y nodejs npm ffmpeg nginx openssl
```

#### CentOS/RHEL:
```bash
sudo yum install -y nodejs npm ffmpeg nginx openssl
```

### 2. Install Application

```bash
# Create application directory
sudo mkdir -p /opt/mbira-recording-session
cd /opt/mbira-recording-session

# Copy application files
sudo cp -r /path/to/mbira-recording-session/* .

# Install dependencies
sudo npm install --production

# Create service user
sudo useradd -r -s /bin/false mbira
sudo chown -R mbira:mbira /opt/mbira-recording-session
```

### 3. Configure SSL

```bash
# Create certificates directory
sudo mkdir -p /opt/mbira-recording-session/certs

# Generate self-signed certificate
sudo openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Set permissions
sudo chown mbira:mbira certs/*
sudo chmod 600 certs/key.pem
sudo chmod 644 certs/cert.pem
```

### 4. Create Systemd Service

```bash
sudo tee /etc/systemd/system/mbira-recording-session.service > /dev/null <<EOF
[Unit]
Description=Mbira Recording Session
After=network.target

[Service]
Type=simple
User=mbira
Group=mbira
WorkingDirectory=/opt/mbira-recording-session
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8443
Environment=WS_PORT=8766

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mbira-recording-session
sudo systemctl start mbira-recording-session
```

### 5. Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/mbira-recording-session > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;
    
    ssl_certificate /opt/mbira-recording-session/certs/cert.pem;
    ssl_certificate_key /opt/mbira-recording-session/certs/key.pem;
    
    location / {
        proxy_pass https://localhost:8443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_ssl_verify off;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/mbira-recording-session /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node.js environment |
| `PORT` | `8443` | Application port |
| `WS_PORT` | `8766` | WebSocket port |
| `DATA_DIR` | `./data` | Data directory path |

### SSL Certificates

#### Self-Signed (Default)
The installation scripts automatically generate self-signed certificates for development/testing.

#### Production SSL
For production, replace the certificates with valid ones:

```bash
# Copy your certificates
sudo cp your-cert.pem /opt/mbira-recording-session/certs/cert.pem
sudo cp your-key.pem /opt/mbira-recording-session/certs/key.pem

# Set permissions
sudo chown mbira:mbira /opt/mbira-recording-session/certs/*
sudo chmod 644 /opt/mbira-recording-session/certs/cert.pem
sudo chmod 600 /opt/mbira-recording-session/certs/key.pem

# Restart services
sudo systemctl restart mbira-recording-session nginx
```

### Firewall Configuration

#### UFW (Ubuntu/Debian)
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Firewall-cmd (CentOS/RHEL)
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check service status
sudo systemctl status mbira-recording-session

# View logs
sudo journalctl -u mbira-recording-session -f

# Check port availability
sudo netstat -tlnp | grep :8443
```

#### 2. SSL Certificate Issues

```bash
# Verify certificate
openssl x509 -in /opt/mbira-recording-session/certs/cert.pem -text -noout

# Regenerate certificate
sudo rm /opt/mbira-recording-session/certs/*
sudo openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

#### 3. Permission Issues

```bash
# Fix ownership
sudo chown -R mbira:mbira /opt/mbira-recording-session

# Fix permissions
sudo chmod 755 /opt/mbira-recording-session
sudo chmod 600 /opt/mbira-recording-session/certs/key.pem
```

#### 4. Port Conflicts

```bash
# Check what's using the port
sudo lsof -i :8443

# Kill process if needed
sudo kill -9 <PID>
```

### Docker Issues

#### 1. Container Won't Start

```bash
# Check container logs
docker compose logs mbira-app

# Check container status
docker compose ps

# Rebuild container
docker compose up -d --build
```

#### 2. Volume Mount Issues

```bash
# Check volume mounts
docker compose exec mbira-app ls -la /app/data

# Fix permissions
sudo chown -R 1001:1001 data/
```

### Log Locations

#### Shell Script Installation
- **Application**: `journalctl -u mbira-recording-session -f`
- **Nginx**: `journalctl -u nginx -f`
- **System**: `/var/log/syslog`

#### Docker Installation
- **Application**: `docker compose logs mbira-app`
- **Nginx**: `docker compose logs nginx`
- **All Services**: `docker compose logs`

## Maintenance

### Updates

#### Shell Script Installation
```bash
# Stop service
sudo systemctl stop mbira-recording-session

# Update application files
sudo cp -r /path/to/updated/files/* /opt/mbira-recording-session/

# Update dependencies
cd /opt/mbira-recording-session
sudo -u mbira npm install --production

# Start service
sudo systemctl start mbira-recording-session
```

#### Docker Installation
```bash
# Update application
./docker-deploy.sh update

# Or manually
git pull
docker compose up -d --build
```

### Backups

#### Data Backup
```bash
# Create backup
sudo tar -czf mbira-backup-$(date +%Y%m%d).tar.gz /opt/mbira-recording-session/data

# Restore backup
sudo tar -xzf mbira-backup-20240101.tar.gz -C /
```

#### Docker Backup
```bash
# Backup volumes
docker run --rm -v mbira-recording-session_redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v mbira-recording-session_redis-data:/data -v $(pwd):/backup alpine tar xzf /backup/redis-backup.tar.gz -C /data
```

### Monitoring

#### Health Checks
```bash
# Application health
curl -k https://localhost/health

# Service status
sudo systemctl status mbira-recording-session

# Docker status
docker compose ps
```

#### Performance Monitoring
```bash
# Resource usage
htop

# Disk usage
df -h

# Memory usage
free -h
```

### Uninstallation

#### Shell Script Installation
```bash
# Stop and disable service
sudo systemctl stop mbira-recording-session
sudo systemctl disable mbira-recording-session

# Remove files
sudo rm -rf /opt/mbira-recording-session
sudo rm /etc/systemd/system/mbira-recording-session.service
sudo rm /etc/nginx/sites-available/mbira-recording-session
sudo rm /etc/nginx/sites-enabled/mbira-recording-session

# Remove user
sudo userdel mbira
sudo groupdel mbira

# Reload systemd
sudo systemctl daemon-reload
sudo systemctl reload nginx
```

#### Docker Installation
```bash
# Stop and remove containers
docker compose down

# Remove volumes
docker volume rm mbira-recording-session_redis-data

# Remove images
docker rmi mbira-recording-session_mbira-app

# Clean up
docker system prune -f
```

## Support

For additional support:

1. Check the logs for error messages
2. Verify all prerequisites are met
3. Ensure ports are available
4. Check firewall configuration
5. Verify SSL certificates

For more help, please refer to the project documentation or create an issue on GitHub.
