# Use Node.js 20 LTS as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    openssl \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S mbira && \
    adduser -S mbira -u 1001 -G mbira

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data certs logs

# Generate self-signed SSL certificate
RUN openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=MbiraRecording/CN=localhost"

# Set proper permissions for certificates and directories
RUN chmod 644 certs/cert.pem && \
    chmod 644 certs/key.pem && \
    chown -R mbira:mbira /app

# Create Let's Encrypt directory and set permissions
RUN mkdir -p /etc/letsencrypt/live && \
    chown -R mbira:mbira /etc/letsencrypt

# Switch to non-root user
USER mbira

# Expose ports
EXPOSE 8445 8767

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -k -f https://localhost:8445/health || exit 1

# Start the application
CMD ["node", "server/index.js"]
