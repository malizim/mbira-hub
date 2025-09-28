#!/bin/bash

# Mbira Recording Session - Installation Script
# This script installs and configures the mbira recording session application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mbira-recording-session"
APP_DIR="/opt/$APP_NAME"
SERVICE_USER="mbira"
SERVICE_GROUP="mbira"
NODE_VERSION="20"
PORT="8443"
WS_PORT="8766"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

check_system() {
    log_info "Checking system requirements..."
    
    # Check if running on supported OS
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        if [[ "$ID" != "ubuntu" && "$ID" != "debian" && "$ID" != "centos" && "$ID" != "rhel" ]]; then
            log_warning "This script is designed for Ubuntu/Debian/CentOS/RHEL. Proceeding anyway..."
        fi
    else
        log_warning "Cannot determine OS version. Proceeding anyway..."
    fi
    
    # Check available memory
    MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $MEMORY_GB -lt 2 ]]; then
        log_warning "System has less than 2GB RAM. Performance may be affected."
    fi
    
    # Check disk space
    DISK_SPACE=$(df / | awk 'NR==2{print $4}')
    if [[ $DISK_SPACE -lt 1048576 ]]; then  # 1GB in KB
        log_warning "Less than 1GB disk space available. Installation may fail."
    fi
}

install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update package lists
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y curl wget git build-essential python3 python3-pip ffmpeg
    elif command -v yum &> /dev/null; then
        yum update -y
        yum install -y curl wget git gcc gcc-c++ make python3 python3-pip ffmpeg
    elif command -v dnf &> /dev/null; then
        dnf update -y
        dnf install -y curl wget git gcc gcc-c++ make python3 python3-pip ffmpeg
    else
        log_error "Package manager not supported. Please install dependencies manually."
        exit 1
    fi
    
    log_success "System dependencies installed"
}

install_nodejs() {
    log_info "Installing Node.js $NODE_VERSION..."
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        CURRENT_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $CURRENT_VERSION -ge $NODE_VERSION ]]; then
            log_success "Node.js $CURRENT_VERSION already installed"
            return
        fi
    fi
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    
    if command -v apt-get &> /dev/null; then
        apt-get install -y nodejs
    elif command -v yum &> /dev/null; then
        yum install -y nodejs npm
    elif command -v dnf &> /dev/null; then
        dnf install -y nodejs npm
    fi
    
    # Verify installation
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    log_success "Node.js $NODE_VER and npm $NPM_VER installed"
}

create_user() {
    log_info "Creating service user and group..."
    
    # Create group if it doesn't exist
    if ! getent group $SERVICE_GROUP > /dev/null 2>&1; then
        groupadd $SERVICE_GROUP
        log_success "Created group: $SERVICE_GROUP"
    fi
    
    # Create user if it doesn't exist
    if ! getent passwd $SERVICE_USER > /dev/null 2>&1; then
        useradd -r -g $SERVICE_GROUP -d $APP_DIR -s /bin/false $SERVICE_USER
        log_success "Created user: $SERVICE_USER"
    fi
}

install_application() {
    log_info "Installing application to $APP_DIR..."
    
    # Create application directory
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Copy application files
    if [[ -d "/home/liamh/Cursors/mbira-recording-session" ]]; then
        cp -r /home/liamh/Cursors/mbira-recording-session/* $APP_DIR/
    else
        log_error "Source directory not found. Please ensure the application files are available."
        exit 1
    fi
    
    # Set permissions
    chown -R $SERVICE_USER:$SERVICE_GROUP $APP_DIR
    chmod +x $APP_DIR/install.sh
    
    # Install Node.js dependencies
    log_info "Installing Node.js dependencies..."
    sudo -u $SERVICE_USER npm install --production
    
    # Create data directory
    mkdir -p $APP_DIR/data
    chown $SERVICE_USER:$SERVICE_GROUP $APP_DIR/data
    
    log_success "Application installed to $APP_DIR"
}

create_ssl_certificates() {
    log_info "Creating SSL certificates..."
    
    cd $APP_DIR
    
    # Create certs directory
    mkdir -p certs
    chown $SERVICE_USER:$SERVICE_GROUP certs
    
    # Generate self-signed certificate
    sudo -u $SERVICE_USER openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    log_success "SSL certificates created"
}

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > /etc/systemd/system/$APP_NAME.service << EOF
[Unit]
Description=Mbira Recording Session
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_GROUP
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=WS_PORT=$WS_PORT
Environment=DATA_DIR=$APP_DIR/data

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable $APP_NAME
    
    log_success "Systemd service created and enabled"
}

create_nginx_config() {
    log_info "Creating Nginx configuration..."
    
    # Install Nginx if not present
    if ! command -v nginx &> /dev/null; then
        if command -v apt-get &> /dev/null; then
            apt-get install -y nginx
        elif command -v yum &> /dev/null; then
            yum install -y nginx
        elif command -v dnf &> /dev/null; then
            dnf install -y nginx
        fi
    fi
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
server {
    listen 80;
    server_name _;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;
    
    ssl_certificate $APP_DIR/certs/cert.pem;
    ssl_certificate_key $APP_DIR/certs/key.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Proxy to application
    location / {
        proxy_pass https://localhost:$PORT;
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
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass https://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_ssl_verify off;
    }
}
EOF

    # Enable site
    if [[ -d "/etc/nginx/sites-enabled" ]]; then
        ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/
    fi
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    
    log_success "Nginx configuration created"
}

create_firewall_rules() {
    log_info "Configuring firewall..."
    
    # Check if ufw is available
    if command -v ufw &> /dev/null; then
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw --force enable
        log_success "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        log_success "Firewall-cmd configured"
    else
        log_warning "No firewall management tool found. Please configure firewall manually."
    fi
}

start_services() {
    log_info "Starting services..."
    
    # Start the application
    systemctl start $APP_NAME
    
    # Start Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Wait for service to start
    sleep 5
    
    # Check if service is running
    if systemctl is-active --quiet $APP_NAME; then
        log_success "Application service is running"
    else
        log_error "Failed to start application service"
        systemctl status $APP_NAME
        exit 1
    fi
    
    if systemctl is-active --quiet nginx; then
        log_success "Nginx service is running"
    else
        log_error "Failed to start Nginx service"
        systemctl status nginx
        exit 1
    fi
}

show_status() {
    log_info "Installation completed successfully!"
    echo
    echo "=========================================="
    echo "  Mbira Recording Session Installation"
    echo "=========================================="
    echo
    echo "Application URL: https://localhost"
    echo "Application Directory: $APP_DIR"
    echo "Service User: $SERVICE_USER"
    echo "Service Status: systemctl status $APP_NAME"
    echo "Service Logs: journalctl -u $APP_NAME -f"
    echo "Nginx Status: systemctl status nginx"
    echo "Nginx Logs: journalctl -u nginx -f"
    echo
    echo "Configuration Files:"
    echo "  - Service: /etc/systemd/system/$APP_NAME.service"
    echo "  - Nginx: /etc/nginx/sites-available/$APP_NAME"
    echo "  - SSL Certs: $APP_DIR/certs/"
    echo
    echo "To update the application:"
    echo "  1. Stop service: systemctl stop $APP_NAME"
    echo "  2. Update files in $APP_DIR"
    echo "  3. Run: sudo -u $SERVICE_USER npm install"
    echo "  4. Start service: systemctl start $APP_NAME"
    echo
    echo "To uninstall:"
    echo "  systemctl stop $APP_NAME"
    echo "  systemctl disable $APP_NAME"
    echo "  rm -rf $APP_DIR"
    echo "  rm /etc/systemd/system/$APP_NAME.service"
    echo "  rm /etc/nginx/sites-available/$APP_NAME"
    echo "  systemctl daemon-reload"
    echo
    log_success "Installation complete! Visit https://localhost to use the application."
}

# Main installation process
main() {
    echo "=========================================="
    echo "  Mbira Recording Session Installer"
    echo "=========================================="
    echo
    
    check_root
    check_system
    install_dependencies
    install_nodejs
    create_user
    install_application
    create_ssl_certificates
    create_systemd_service
    create_nginx_config
    create_firewall_rules
    start_services
    show_status
}

# Run main function
main "$@"
