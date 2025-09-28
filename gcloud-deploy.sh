#!/bin/bash

# Mbira Hub - Google Cloud Deployment Script
# This script deploys Mbira Hub to a Google Cloud instance with Docker

set -e

echo "🚀 Mbira Hub - Google Cloud Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running on Google Cloud
if [ -f /etc/google-cloud-sdk/config ]; then
    print_status "Detected Google Cloud environment"
else
    print_warning "This script is designed for Google Cloud instances"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Installing Docker..."
    
    # Install Docker on Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
        echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io
        sudo usermod -aG docker $USER
        print_success "Docker installed successfully"
    else
        print_error "Please install Docker manually for your OS"
        exit 1
    fi
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Installing Docker Compose..."
    
    # Install Docker Compose
    if command -v apt-get &> /dev/null; then
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed successfully"
    else
        print_error "Please install Docker Compose manually"
        exit 1
    fi
fi

# Get domain from environment or prompt
DOMAIN=${DOMAIN:-"localhost"}
if [ "$DOMAIN" = "localhost" ] && [ -t 0 ]; then
    echo "Enter your domain name (or press Enter for localhost):"
    read -r input_domain
    if [ -n "$input_domain" ]; then
        DOMAIN="$input_domain"
    fi
fi

print_status "Using domain: $DOMAIN"

# Get external IP
EXTERNAL_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "unknown")
print_status "External IP: $EXTERNAL_IP"

# Create production environment file
print_status "Creating production environment configuration..."
cat > .env << EOF
# Database
DATABASE_URL="file:./data/sessions.db"

# Server Configuration
PORT=8445
WS_PORT=8767
DATA_DIR="/app/data"
CERT_DIR="/app/certs"

# SSL Configuration
DOMAIN="$DOMAIN"
DISABLE_SSL="false"

# Authentication
JWT_SECRET="$(openssl rand -base64 32)"
MASTER_PASSWORD="$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)"

# Production
NODE_ENV="production"
EOF

print_success "Environment configuration created"

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p data logs certs
chmod 755 data logs certs

# Generate self-signed certificates for initial setup
print_status "Generating self-signed SSL certificates..."
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes \
    -subj "/C=US/ST=State/L=City/O=MbiraHub/CN=$DOMAIN" 2>/dev/null

# Set proper permissions
chmod 644 certs/key.pem certs/cert.pem

print_success "SSL certificates generated"

# Stop any existing containers
print_status "Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true
docker rm -f mbira-recording-session mbira-nginx mbira-redis 2>/dev/null || true

# Export domain for Docker Compose
export DOMAIN

# Build and start containers
print_status "Building and starting containers..."
docker compose up -d --build

# Wait for containers to be ready
print_status "Waiting for application to start..."
sleep 20

# Check if containers are running
print_status "Checking container status..."
if docker ps | grep -q "mbira-recording-session.*Up"; then
    print_success "Mbira Hub is running successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   • Main Application: https://$EXTERNAL_IP:9445"
    echo "   • WebSocket: wss://$EXTERNAL_IP:9767"
    echo "   • Health Check: https://$EXTERNAL_IP:9445/health"
    echo ""
    echo "📊 Container Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mbira
    echo ""
    echo "🔑 Master Password: $(grep MASTER_PASSWORD .env | cut -d'=' -f2)"
    echo ""
    echo "🎉 Google Cloud deployment complete!"
    echo "   Access your application at https://$EXTERNAL_IP:9445"
    echo "   Domain: $DOMAIN"
    echo ""
    echo "📝 Next Steps:"
    echo "   1. Configure firewall rules to allow ports 9445 and 9767"
    echo "   2. Set up a proper domain name and SSL certificates"
    echo "   3. Configure nginx reverse proxy if needed"
else
    print_error "Application failed to start. Checking logs..."
    docker logs mbira-recording-session --tail 20
    exit 1
fi
