#!/bin/bash

# Mbira Hub - Docker Cleanup Script
# This script cleans up orphaned containers and networks

set -e

echo "🧹 Mbira Hub - Docker Cleanup"
echo "============================="

# Stop and remove all mbira-hub containers
echo "🛑 Stopping and removing containers..."
docker compose -f docker-compose.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose-simple.yml down --remove-orphans 2>/dev/null || true

# Remove any remaining mbira containers
echo "🗑️  Removing orphaned containers..."
docker rm -f mbira-recording-session mbira-nginx mbira-redis 2>/dev/null || true

# Remove orphaned networks
echo "🌐 Cleaning up networks..."
docker network rm mbira-hub_mbira-network 2>/dev/null || true

# Remove orphaned volumes
echo "💾 Cleaning up volumes..."
docker volume rm mbira-hub_redis-data 2>/dev/null || true

# Clean up unused images
echo "🖼️  Cleaning up unused images..."
docker image prune -f

echo "✅ Cleanup complete!"
echo ""
echo "You can now run:"
echo "  ./docker-deploy-simple.sh"
echo "  or"
echo "  docker compose -f docker-compose-simple.yml up -d"
