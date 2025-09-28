# 🎵 Mbira Hub - Docker Quick Start

## Simple Deployment (Recommended)

The easiest way to deploy Mbira Hub is using the simple Docker Compose setup without SSL:

### 1. Quick Deploy Script
```bash
# Make the script executable
chmod +x docker-deploy-simple.sh

# Run the deployment
./docker-deploy-simple.sh
```

### 2. Manual Deployment
```bash
# Start the application
docker compose -f docker-compose-simple.yml up -d --build

# Check status
docker ps

# View logs
docker logs mbira-recording-session
```

## Access the Application

- **Main Application**: http://localhost:9445
- **WebSocket**: ws://localhost:9767

## Container Management

### Start/Stop
```bash
# Start
docker compose -f docker-compose-simple.yml up -d

# Stop
docker compose -f docker-compose-simple.yml down

# Restart
docker compose -f docker-compose-simple.yml restart
```

### View Logs
```bash
# Application logs
docker logs mbira-recording-session

# Follow logs in real-time
docker logs -f mbira-recording-session
```

### Update Application
```bash
# Pull latest changes and rebuild
docker compose -f docker-compose-simple.yml up -d --build
```

## Troubleshooting

### Port Conflicts
If you get port conflicts, edit `docker-compose-simple.yml` and change the port mappings:
```yaml
ports:
  - "9445:8445"  # Change 9445 to any available port
  - "9767:8767"  # Change 9767 to any available port
```

### Permission Issues
```bash
# Fix data directory permissions
sudo chown -R 1001:1001 data/
```

### Container Won't Start
```bash
# Check logs
docker logs mbira-recording-session

# Check container status
docker ps -a

# Remove and recreate
docker compose -f docker-compose-simple.yml down
docker compose -f docker-compose-simple.yml up -d --build
```

## Production Deployment

For production deployment with SSL, use the full `docker-compose.yml` file and configure:
- SSL certificates
- Nginx reverse proxy
- Domain name
- Environment variables

## Features

✅ **Real-time Note Detection** - Live mbira note recognition  
✅ **Session Management** - Create, join, and manage recording sessions  
✅ **Instrument Training** - Train your mbira for better detection  
✅ **Audio Recording** - High-quality .wav recording with layering  
✅ **Music Sheet Generation** - Export your recordings as sheet music  
✅ **Mobile Responsive** - Works on all devices  
✅ **Professional Branding** - Infinicore Systems branding  

## Support

For issues or questions, check the logs first:
```bash
docker logs mbira-recording-session --tail 50
```

---

**Developed for Texpo Steamon 2025 by Infinicore Systems (Pvt) Ltd**
