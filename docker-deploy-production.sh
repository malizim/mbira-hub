#!/bin/bash

# Mbira Hub - Production Docker Deployment Script
# This script deploys Mbira Hub with SSL certificate support

set -e

echo "🚀 Mbira Hub - Production Deployment"
echo "===================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
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

echo "🌐 Using domain: $DOMAIN"

# Run SSL setup
echo "🔒 Setting up SSL certificates..."
./setup-ssl.sh

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data logs

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 data logs

# Stop any existing containers and clean up orphans
echo "🛑 Stopping existing containers and cleaning up..."
docker compose -f docker-compose.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose-simple.yml down --remove-orphans 2>/dev/null || true

# Remove any orphaned containers
echo "🗑️  Removing orphaned containers..."
docker rm -f mbira-recording-session mbira-nginx mbira-redis 2>/dev/null || true

# Export domain for Docker Compose
export DOMAIN

# Build and start containers
echo "🔨 Building and starting containers with SSL support..."
docker compose -f docker-compose.yml up -d --build

# Wait for containers to be ready
echo "⏳ Waiting for application to start..."
sleep 15

# Check if containers are running
echo "🔍 Checking container status..."
if docker ps | grep -q "mbira-recording-session.*Up.*healthy"; then
    echo "✅ Mbira Hub is running successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   • Main Application: https://localhost:9445"
    echo "   • WebSocket: wss://localhost:9767"
    echo "   • Health Check: https://localhost:9445/health"
    echo ""
    echo "📊 Container Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mbira
    echo ""
    echo "🔒 SSL Certificate Status:"
    docker logs mbira-recording-session 2>&1 | grep -E "(SSL|HTTPS|certificate|Let's Encrypt)" | tail -3
    echo ""
    echo "🎉 Production deployment complete!"
    echo "   Access your application at https://localhost:9445"
    echo "   Domain: $DOMAIN"
else
    echo "❌ Application failed to start. Checking logs..."
    docker logs mbira-recording-session --tail 20
    exit 1
fi
