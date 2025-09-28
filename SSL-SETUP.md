# 🔒 SSL Certificate Setup for Mbira Hub

This guide explains how to set up SSL certificates for Mbira Hub deployment, including Let's Encrypt support for Google Cloud.

## Certificate Priority

The application checks for SSL certificates in this order:

1. **Let's Encrypt** (Production) - `/etc/letsencrypt/live/{domain}/`
2. **Local Certificates** - `./certs/`
3. **Self-signed** (Generated if none found)
4. **HTTP Only** (If SSL disabled)

## Quick Setup

### 1. Automatic SSL Detection
```bash
# Run the SSL setup script
./setup-ssl.sh

# Deploy with detected certificates
docker compose up -d --build
```

### 2. Production Deployment
```bash
# Set your domain
export DOMAIN="yourdomain.com"

# Deploy with SSL support
./docker-deploy-production.sh
```

## Let's Encrypt Setup (Google Cloud)

### Prerequisites
- Domain pointing to your Google Cloud instance
- Ports 80 and 443 open
- Certbot installed on the host

### 1. Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

### 2. Obtain Let's Encrypt Certificate
```bash
# Replace yourdomain.com with your actual domain
sudo certbot certonly --standalone -d yourdomain.com

# For multiple domains
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
```

### 3. Deploy with Let's Encrypt
```bash
# Set domain environment variable
export DOMAIN="yourdomain.com"

# Deploy with Let's Encrypt support
./docker-deploy-production.sh
```

## Local Development

### 1. Self-signed Certificate
```bash
# Generate self-signed certificate
./setup-ssl.sh

# Deploy locally
docker compose up -d --build
```

### 2. Disable SSL (Development)
```bash
# Set environment variable
export DISABLE_SSL="true"

# Deploy without SSL
docker compose -f docker-compose-simple.yml up -d --build
```

## Certificate Management

### Check Certificate Status
```bash
# View certificate information
openssl x509 -in ./certs/cert.pem -text -noout

# Check Let's Encrypt certificate
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout
```

### Renew Let's Encrypt Certificates
```bash
# Test renewal
sudo certbot renew --dry-run

# Renew certificates
sudo certbot renew

# Restart application after renewal
docker compose restart mbira-recording-session
```

### Certificate Monitoring
```bash
# Check certificate expiration
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Monitor certificate files
sudo certbot certificates
```

## Google Cloud Specific Setup

### 1. Firewall Rules
```bash
# Allow HTTP and HTTPS traffic
gcloud compute firewall-rules create allow-http-https \
    --allow tcp:80,tcp:443 \
    --source-ranges 0.0.0.0/0 \
    --target-tags http-server,https-server
```

### 2. Instance Configuration
```bash
# Tag your instance
gcloud compute instances add-tags INSTANCE_NAME --tags=http-server,https-server

# Or add tags during instance creation
gcloud compute instances create mbira-hub \
    --image-family=ubuntu-2004-lts \
    --image-project=ubuntu-os-cloud \
    --machine-type=e2-medium \
    --tags=http-server,https-server
```

### 3. Domain Configuration
```bash
# Point your domain to the instance IP
# Add A record: yourdomain.com -> INSTANCE_IP
# Add A record: www.yourdomain.com -> INSTANCE_IP
```

### 4. Automated Deployment Script
```bash
#!/bin/bash
# deploy-to-gcloud.sh

# Set your domain
export DOMAIN="yourdomain.com"

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Certbot
sudo apt install certbot -y

# Clone and setup Mbira Hub
git clone <your-repo-url> mbira-hub
cd mbira-hub

# Obtain SSL certificate
sudo certbot certonly --standalone -d $DOMAIN

# Deploy application
./docker-deploy-production.sh
```

## Troubleshooting

### Certificate Issues
```bash
# Check certificate files exist
ls -la /etc/letsencrypt/live/yourdomain.com/
ls -la ./certs/

# Check certificate permissions
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### Container Issues
```bash
# Check container logs
docker logs mbira-recording-session

# Check SSL configuration
docker exec mbira-recording-session env | grep -E "(DOMAIN|SSL|CERT)"
```

### Network Issues
```bash
# Test SSL connection
curl -k https://localhost:9445/health

# Test from external
curl -k https://yourdomain.com:9445/health
```

## Security Best Practices

1. **Use Let's Encrypt for Production** - Free, trusted certificates
2. **Regular Certificate Renewal** - Set up automated renewal
3. **Proper File Permissions** - Restrict access to private keys
4. **Firewall Configuration** - Only open necessary ports
5. **Regular Updates** - Keep certificates and application updated

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DOMAIN` | Your domain name | `localhost` |
| `DISABLE_SSL` | Disable SSL (development) | `false` |
| `CERT_DIR` | Local certificate directory | `./certs` |
| `PORT` | Application port | `8445` |
| `WS_PORT` | WebSocket port | `8767` |

---

**For Google Cloud deployment, ensure your domain is properly configured and Let's Encrypt certificates are obtained before running the production deployment script.**
