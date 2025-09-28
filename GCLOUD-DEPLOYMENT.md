# Mbira Hub - Google Cloud Deployment Guide

This guide will help you deploy Mbira Hub to your Google Cloud instance.

## Prerequisites

1. **Google Cloud Instance** with Docker installed
2. **Domain name** (optional, can use IP address)
3. **Firewall rules** configured for ports 9445 and 9767

## Quick Deployment

### Option 1: Automated Deployment (Recommended)

1. **Upload the project to your GCloud instance:**
   ```bash
   # From your local machine
   scp -r mbira-hub/ user@your-gcloud-instance-ip:/home/user/
   ```

2. **SSH into your GCloud instance:**
   ```bash
   ssh user@your-gcloud-instance-ip
   ```

3. **Run the deployment script:**
   ```bash
   cd mbira-hub
   chmod +x gcloud-deploy.sh
   ./gcloud-deploy.sh
   ```

### Option 2: Manual Deployment

1. **Clone or upload the project:**
   ```bash
   git clone <your-repo-url> mbira-hub
   cd mbira-hub
   ```

2. **Set environment variables:**
   ```bash
   export DOMAIN="your-domain.com"  # or use IP address
   export MASTER_PASSWORD="your-secure-password"
   ```

3. **Deploy with Docker Compose:**
   ```bash
   docker compose -f docker-compose.gcloud.yml up -d --build
   ```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```bash
# Database
DATABASE_URL="file:./data/sessions.db"

# Server Configuration
PORT=8445
WS_PORT=8767
DATA_DIR="/app/data"
CERT_DIR="/app/certs"

# SSL Configuration
DOMAIN="your-domain.com"
DISABLE_SSL="false"

# Authentication
JWT_SECRET="your-secure-jwt-secret"
MASTER_PASSWORD="your-secure-master-password"

# Production
NODE_ENV="production"
```

### SSL Certificates

The deployment script will generate self-signed certificates automatically. For production use:

1. **Use Let's Encrypt certificates:**
   ```bash
   # Install certbot
   sudo apt install certbot
   
   # Generate certificates
   sudo certbot certonly --standalone -d your-domain.com
   
   # Copy certificates to the project
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/key.pem
   sudo chown $USER:$USER certs/*.pem
   ```

2. **Set up certificate renewal:**
   ```bash
   # Add to crontab
   echo "0 12 * * * /usr/bin/certbot renew --quiet && docker compose restart mbira-app" | sudo crontab -
   ```

## Firewall Configuration

### Google Cloud Console

1. Go to **VPC Network** > **Firewall**
2. Create firewall rules for:
   - **Port 9445** (HTTPS) - Source: 0.0.0.0/0
   - **Port 9767** (WebSocket) - Source: 0.0.0.0/0

### Command Line (gcloud)

```bash
# Allow HTTPS traffic
gcloud compute firewall-rules create mbira-https \
    --allow tcp:9445 \
    --source-ranges 0.0.0.0/0 \
    --description "Mbira Hub HTTPS"

# Allow WebSocket traffic
gcloud compute firewall-rules create mbira-websocket \
    --allow tcp:9767 \
    --source-ranges 0.0.0.0/0 \
    --description "Mbira Hub WebSocket"
```

## Accessing the Application

After deployment, access your application at:

- **Main Application:** `https://your-domain.com:9445`
- **WebSocket:** `wss://your-domain.com:9767`
- **Health Check:** `https://your-domain.com:9445/health`

## Monitoring and Maintenance

### Check Application Status

```bash
# Check container status
docker ps

# Check application logs
docker logs mbira-hub

# Check health
curl -k https://localhost:9445/health
```

### Restart Application

```bash
# Restart all services
docker compose -f docker-compose.gcloud.yml restart

# Restart specific service
docker restart mbira-hub
```

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose -f docker-compose.gcloud.yml up -d --build
```

### Backup Data

```bash
# Backup data directory
tar -czf mbira-backup-$(date +%Y%m%d).tar.gz data/

# Backup database
cp data/sessions.db backups/sessions-$(date +%Y%m%d).db
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```bash
   # Check what's using the port
   sudo netstat -tlnp | grep :9445
   
   # Kill the process
   sudo kill -9 <PID>
   ```

2. **SSL certificate issues:**
   ```bash
   # Regenerate certificates
   rm certs/*.pem
   openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
   chmod 644 certs/*.pem
   docker restart mbira-hub
   ```

3. **Permission issues:**
   ```bash
   # Fix permissions
   sudo chown -R $USER:$USER data/ logs/ certs/
   chmod -R 755 data/ logs/ certs/
   ```

### Logs

```bash
# Application logs
docker logs mbira-hub -f

# System logs
journalctl -u docker -f

# Nginx logs (if using reverse proxy)
docker logs mbira-nginx -f
```

## Security Considerations

1. **Change default passwords** in the `.env` file
2. **Use strong JWT secrets** (32+ characters)
3. **Enable firewall rules** only for necessary ports
4. **Use HTTPS** in production
5. **Regular backups** of data and certificates
6. **Monitor logs** for suspicious activity

## Performance Optimization

1. **Resource limits** are set in `docker-compose.gcloud.yml`
2. **Redis memory limits** are configured for caching
3. **Health checks** ensure application availability
4. **Restart policies** handle failures automatically

## Support

For issues and support:
- Check the logs: `docker logs mbira-hub`
- Verify configuration: `docker compose config`
- Test connectivity: `curl -k https://localhost:9445/health`
