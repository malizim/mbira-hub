#!/bin/bash

# Mbira Hub - Simple Docker Deployment Script
# This script deploys Mbira Hub using Docker Compose without SSL

set -e

echo "🎵 Mbira Hub - Simple Docker Deployment"
echo "======================================"

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

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data logs

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 data logs

# Stop any existing containers and clean up orphans
echo "🛑 Stopping existing containers and cleaning up..."
docker compose -f docker-compose-simple.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.yml down --remove-orphans 2>/dev/null || true

# Remove any orphaned containers
echo "🗑️  Removing orphaned containers..."
docker rm -f mbira-recording-session mbira-nginx mbira-redis 2>/dev/null || true

# Build and start containers
echo "🔨 Building and starting containers..."
docker compose -f docker-compose-simple.yml up -d --build

# Wait for containers to be ready
echo "⏳ Waiting for application to start..."
sleep 10

# Check if containers are running
echo "🔍 Checking container status..."
if docker ps | grep -q "mbira-recording-session.*Up.*healthy"; then
    echo "✅ Mbira Hub is running successfully!"
    echo ""
    echo "🌐 Application URLs:"
    echo "   • Main Application: http://localhost:9445"
    echo "   • WebSocket: ws://localhost:9767"
    echo ""
    echo "📊 Container Status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mbira
    echo ""
    echo "🎉 Deployment complete! You can now access Mbira Hub at http://localhost:9445"
else
    echo "❌ Application failed to start. Checking logs..."
    docker logs mbira-recording-session --tail 20
    exit 1
fi
