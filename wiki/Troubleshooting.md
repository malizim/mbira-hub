# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with Mbira Hub.

## 🔍 Quick Diagnostics

### Health Check
```bash
# Check application status
curl -k https://your-domain.com/health

# Expected response
{
  "status": "ok",
  "timestamp": "2025-09-28T15:30:57.117Z",
  "uptime": 35.256945165,
  "version": "1.0.0"
}
```

### Container Status
```bash
# Check running containers
docker ps | grep mbira

# Check container logs
docker logs mbira-hub --tail=50

# Check container health
docker inspect mbira-hub | grep -A 5 Health
```

## 🎤 Audio Issues

### Microphone Not Working

#### Symptoms
- "Microphone access required" error
- No audio detection
- Silent audio level bar

#### Solutions

**1. Check Browser Permissions**
```javascript
// Test microphone access
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => console.log('Microphone access granted'))
  .catch(err => console.error('Microphone access denied:', err));
```

**2. Browser-Specific Fixes**

**Chrome/Edge:**
1. Click lock icon in address bar
2. Set Microphone to "Allow"
3. Refresh page

**Firefox:**
1. Go to `about:preferences#privacy`
2. Click "Settings" next to Microphone
3. Add your domain to allowed sites

**Safari:**
1. Go to Safari > Preferences > Websites
2. Select Microphone
3. Set your domain to "Allow"

**3. Check HTTPS Requirement**
- Microphone requires secure context (HTTPS)
- Ensure you're using `https://` not `http://`
- Check SSL certificate is valid

**4. Test Different Browser**
- Try Chrome (most compatible)
- Check browser version (Chrome 88+)
- Disable browser extensions

### Poor Audio Detection

#### Symptoms
- Inaccurate note detection
- Missed notes
- False positives

#### Solutions

**1. Audio Calibration**
```bash
# Recalibrate audio levels
# Use the calibration tool in the web interface
# Play at normal volume for 10-15 seconds
```

**2. Environment Optimization**
- Reduce background noise
- Use headphones for better isolation
- Play in quiet environment
- Ensure good microphone quality

**3. Instrument Training**
- Retrain your instrument
- Use consistent playing technique
- Play each note clearly for 2-3 seconds
- Complete all 12 notes in training

**4. Technical Adjustments**
```javascript
// Check audio context state
const audioContext = new AudioContext();
console.log('Audio context state:', audioContext.state);

// Check sample rate
console.log('Sample rate:', audioContext.sampleRate);
```

## 🐳 Docker Issues

### Container Won't Start

#### Symptoms
- Container exits immediately
- "Container not found" error
- Port binding errors

#### Solutions

**1. Check Port Conflicts**
```bash
# Check what's using the port
lsof -i :9445
lsof -i :9767

# Kill conflicting processes
sudo kill -9 <PID>

# Use different ports
docker run -p 9446:8445 -p 9768:8767 mbira-hub
```

**2. Check Docker Logs**
```bash
# View container logs
docker logs mbira-hub

# Common error patterns:
# - "Port already in use"
# - "Permission denied"
# - "No such file or directory"
```

**3. Check File Permissions**
```bash
# Fix data directory permissions
sudo chown -R 1000:1000 data/
sudo chmod -R 755 data/

# Fix certificate permissions
sudo chown -R 1000:1000 certs/
sudo chmod -R 644 certs/
```

**4. Rebuild Container**
```bash
# Stop and remove container
docker-compose down

# Rebuild image
docker-compose build --no-cache

# Start fresh
docker-compose up -d
```

### Database Issues

#### Symptoms
- "Database not found" error
- Session creation fails
- Data not persisting

#### Solutions

**1. Check Database File**
```bash
# Check if database exists
ls -la data/sessions.db

# Check file permissions
ls -la data/

# Fix permissions if needed
chmod 664 data/sessions.db
chown 1000:1000 data/sessions.db
```

**2. Initialize Database**
```bash
# Run Prisma commands
docker exec mbira-hub npx prisma generate
docker exec mbira-hub npx prisma db push

# Check database tables
docker exec mbira-hub sqlite3 /app/data/sessions.db ".tables"
```

**3. Reset Database**
```bash
# Backup existing database
cp data/sessions.db data/sessions.db.backup

# Remove database
rm data/sessions.db

# Restart container (will recreate database)
docker-compose restart
```

## 🌐 Network Issues

### SSL Certificate Problems

#### Symptoms
- "Not secure" warning
- Certificate errors
- Connection refused

#### Solutions

**1. Check Certificate Validity**
```bash
# Check certificate dates
openssl x509 -in certs/cert.pem -dates -noout

# Check certificate chain
openssl s_client -connect your-domain.com:9445 -showcerts
```

**2. Renew Let's Encrypt Certificate**
```bash
# Test renewal
sudo certbot renew --dry-run

# Renew certificate
sudo certbot renew

# Update application certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem certs/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem certs/key.pem
docker-compose restart
```

**3. Generate Self-Signed Certificate**
```bash
# Generate new self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 \
  -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

### Connection Issues

#### Symptoms
- "Connection refused"
- Timeout errors
- WebSocket connection fails

#### Solutions

**1. Check Firewall Rules**
```bash
# Check if ports are open
sudo ufw status
sudo iptables -L

# Open required ports
sudo ufw allow 9445
sudo ufw allow 9767
sudo ufw allow 22
```

**2. Check Application Status**
```bash
# Check if application is running
ps aux | grep node
netstat -tlnp | grep 9445

# Check container status
docker ps | grep mbira
```

**3. Test Local Connection**
```bash
# Test HTTPS connection
curl -k https://localhost:9445/health

# Test WebSocket connection
wscat -c wss://localhost:9445/ws
```

## 📱 Mobile Issues

### Mobile Browser Problems

#### Symptoms
- App doesn't load on mobile
- Touch interactions don't work
- Audio not detected on mobile

#### Solutions

**1. Check Mobile Browser Compatibility**
- Use Chrome Mobile (recommended)
- Ensure iOS 14+ or Android 8+
- Check JavaScript is enabled

**2. Mobile-Specific Audio Issues**
```javascript
// Check mobile audio context
if (typeof AudioContext !== 'undefined') {
  const audioContext = new AudioContext();
  // Mobile browsers may require user interaction
  document.addEventListener('touchstart', () => {
    audioContext.resume();
  });
}
```

**3. Touch Interface Issues**
- Ensure buttons are at least 44px in size
- Check for proper touch event handling
- Test in both portrait and landscape modes

### Performance Issues

#### Symptoms
- Slow loading on mobile
- Audio detection lag
- App crashes on mobile

#### Solutions

**1. Optimize for Mobile**
- Reduce image sizes
- Minimize JavaScript bundle
- Use mobile-optimized CSS

**2. Check Mobile Resources**
- Ensure sufficient RAM (2GB+)
- Close other apps
- Check internet connection speed

## 🔧 Advanced Troubleshooting

### Debug Mode

**Enable Debug Logging**
```bash
# Set debug environment variable
export DEBUG=mbira-hub:*

# Start application with debug logging
npm run dev
```

**Browser Console Debugging**
```javascript
// Enable audio debugging
localStorage.setItem('debug', 'true');

// Check WebSocket connection
const ws = new WebSocket('wss://your-domain.com/ws');
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (err) => console.error('WebSocket error:', err);
```

### Performance Profiling

**Check Memory Usage**
```bash
# Container memory usage
docker stats mbira-hub

# Application memory usage
docker exec mbira-hub ps aux --sort=-%mem
```

**Check CPU Usage**
```bash
# Container CPU usage
docker stats mbira-hub

# System CPU usage
top -p $(pgrep -f mbira-hub)
```

### Log Analysis

**Application Logs**
```bash
# Follow application logs
docker-compose logs -f mbira-app

# Search for errors
docker-compose logs mbira-app | grep -i error

# Search for specific patterns
docker-compose logs mbira-app | grep -i "microphone\|audio\|detection"
```

**System Logs**
```bash
# Check system logs
journalctl -u docker -f

# Check kernel logs
dmesg | tail -20
```

## 🆘 Getting Help

### Before Asking for Help

1. **Check this guide** for your specific issue
2. **Check application logs** for error messages
3. **Test in different browser** or device
4. **Try the basic troubleshooting steps**

### When Reporting Issues

Include the following information:

**System Information**
- Operating System and version
- Browser and version
- Node.js version
- Docker version (if using Docker)

**Error Details**
- Complete error message
- Steps to reproduce the issue
- Screenshots or screen recordings
- Browser console errors

**Logs**
- Application logs (last 50 lines)
- Container logs (if using Docker)
- Browser console logs

**Example Issue Report**
```
**Issue**: Microphone not working on mobile Safari

**System**: 
- iOS 15.0, Safari 15.0
- iPhone 12 Pro
- Mbira Hub v1.0.0

**Error**: "Microphone access required" error appears

**Steps to Reproduce**:
1. Open app on mobile Safari
2. Click "Start Detection"
3. Error appears immediately

**Logs**:
[Include relevant logs here]
```

### Community Support

- **GitHub Issues**: Create an issue on the repository
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the wiki for additional guides

---

**Still having issues?** Create a detailed issue report on GitHub with all the information above.
