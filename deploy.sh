#!/bin/bash

# Mbira Recording Session v3.0 Deployment Script
# This script sets up the complete application with all features

set -e

echo "🎵 Deploying Mbira Recording Session v3.0..."
echo "=============================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please do not run as root for security reasons"
    exit 1
fi

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

# Check FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg is not installed. Please install FFmpeg first."
    echo "   Ubuntu/Debian: sudo apt install ffmpeg"
    echo "   CentOS/RHEL: sudo yum install ffmpeg"
    echo "   macOS: brew install ffmpeg"
    exit 1
fi

# Check OpenSSL
if ! command -v openssl &> /dev/null; then
    echo "❌ OpenSSL is not installed. Please install OpenSSL first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run setup script
echo "🔧 Running setup script..."
node scripts/setup.js

# Check if visual assets exist
if [ ! -f "static/img/mbira_bg.png" ]; then
    echo "⚠️  Warning: mbira_bg.png not found in static/img/"
    echo "   Please copy the background image from the original application"
fi

if [ ! -f "static/img/logo.jpeg" ]; then
    echo "⚠️  Warning: logo.jpeg not found in static/img/"
    echo "   Please copy the logo from the original application"
fi

# Generate production environment if needed
if [ ! -f ".env" ]; then
    echo "📝 Creating production environment file..."
    cp env.example .env
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/your-secret-key-change-in-production/$JWT_SECRET/" .env
    
    # Generate secure master password
    MASTER_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    sed -i "s/\$session123/$MASTER_PASSWORD/" .env
    
    echo "✅ Generated secure credentials"
    echo "   Master Password: $MASTER_PASSWORD"
    echo "   (Save this password securely!)"
fi

# Set up systemd service
echo "🔧 Setting up systemd service..."
sudo tee /etc/systemd/system/mbira-session.service > /dev/null <<EOF
[Unit]
Description=Mbira Recording Session v3.0
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable mbira-session
sudo systemctl start mbira-session

# Check service status
if systemctl is-active --quiet mbira-session; then
    echo "✅ Service started successfully"
else
    echo "❌ Service failed to start. Check logs with: sudo journalctl -u mbira-session -f"
    exit 1
fi

# Set up nginx reverse proxy (optional)
if command -v nginx &> /dev/null; then
    echo "🌐 Setting up nginx reverse proxy..."
    sudo tee /etc/nginx/sites-available/mbira-session > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;
    
    ssl_certificate $(pwd)/certs/cert.pem;
    ssl_certificate_key $(pwd)/certs/key.pem;
    
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
    }
    
    location /socket.io/ {
        proxy_pass https://localhost:8443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

    sudo ln -sf /etc/nginx/sites-available/mbira-session /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx reverse proxy configured"
fi

# Set up firewall rules
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 8443/tcp
    sudo ufw allow 8766/tcp
    echo "✅ Firewall rules added"
fi

# Create log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/mbira-session > /dev/null <<EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        systemctl reload mbira-session
    endscript
}
EOF

# Create logs directory
mkdir -p logs

echo ""
echo "🎉 Deployment completed successfully!"
echo "======================================"
echo ""
echo "📋 Service Information:"
echo "   Status: sudo systemctl status mbira-session"
echo "   Logs: sudo journalctl -u mbira-session -f"
echo "   Restart: sudo systemctl restart mbira-session"
echo ""
echo "🌐 Access URLs:"
echo "   Direct: https://localhost:8443"
if command -v nginx &> /dev/null; then
    echo "   Nginx: https://$(hostname -I | awk '{print $1}')"
fi
echo "   WebSocket: ws://localhost:8766"
echo ""
echo "🔑 Master Password: $(grep MASTER_PASSWORD .env | cut -d'=' -f2)"
echo ""
echo "📁 Data Location: $(pwd)/data"
echo "🔐 Certificates: $(pwd)/certs"
echo ""
echo "🎵 Ready to record some mbira music!"
