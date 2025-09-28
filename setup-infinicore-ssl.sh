#!/bin/bash

# Mbira Hub - Infinicore.co.zw SSL Certificate Setup
# This script helps set up SSL certificates for infinicore.co.zw

set -e

echo "🔒 Mbira Hub - Infinicore.co.zw SSL Setup"
echo "========================================="

DOMAIN="infinicore.co.zw"
CERT_DIR="./certs/$DOMAIN"

# Create the domain directory
mkdir -p "$CERT_DIR"

echo "🌐 Setting up SSL certificates for domain: $DOMAIN"
echo "📁 Certificate directory: $CERT_DIR"

# Check if we have existing certificate files
if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
    echo "✅ Certificate files already exist!"
    echo "   Certificate: $CERT_DIR/fullchain.pem"
    echo "   Private Key: $CERT_DIR/privkey.pem"
else
    echo "⚠️  Certificate files not found. Let's set them up..."
    echo ""
    echo "Please provide the path to your Let's Encrypt certificates:"
    echo "1. If you have them in /etc/letsencrypt/live/$DOMAIN/, press Enter"
    echo "2. If they're in a different location, enter the full path"
    echo ""
    read -p "Enter path to Let's Encrypt live directory (or press Enter for default): " le_path
    
    if [ -z "$le_path" ]; then
        le_path="/etc/letsencrypt/live/$DOMAIN"
    fi
    
    echo "🔍 Checking for certificates in: $le_path"
    
    if [ -f "$le_path/fullchain.pem" ] && [ -f "$le_path/privkey.pem" ]; then
        echo "✅ Found Let's Encrypt certificates!"
        echo "📋 Copying certificates to local directory..."
        
        # Copy certificates
        cp "$le_path/fullchain.pem" "$CERT_DIR/"
        cp "$le_path/privkey.pem" "$CERT_DIR/"
        
        # Set proper permissions
        chmod 644 "$CERT_DIR/fullchain.pem"
        chmod 600 "$CERT_DIR/privkey.pem"
        
        echo "✅ Certificates copied successfully!"
        echo "   Certificate: $CERT_DIR/fullchain.pem"
        echo "   Private Key: $CERT_DIR/privkey.pem"
    else
        echo "❌ Let's Encrypt certificates not found in: $le_path"
        echo ""
        echo "Please ensure you have valid SSL certificates for $DOMAIN"
        echo "You can obtain them using:"
        echo "  sudo certbot certonly --standalone -d $DOMAIN"
        echo ""
        echo "Or if you have them elsewhere, please copy them to:"
        echo "  $CERT_DIR/fullchain.pem"
        echo "  $CERT_DIR/privkey.pem"
        exit 1
    fi
fi

# Verify certificate
echo ""
echo "🔍 Verifying certificate..."
if openssl x509 -in "$CERT_DIR/fullchain.pem" -text -noout > /dev/null 2>&1; then
    echo "✅ Certificate is valid!"
    
    # Show certificate details
    echo ""
    echo "📋 Certificate Details:"
    echo "Subject: $(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -subject | sed 's/subject=//')"
    echo "Issuer: $(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -issuer | sed 's/issuer=//')"
    echo "Valid From: $(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -startdate | sed 's/notBefore=//')"
    echo "Valid Until: $(openssl x509 -in "$CERT_DIR/fullchain.pem" -noout -enddate | sed 's/notAfter=//')"
else
    echo "❌ Certificate verification failed!"
    exit 1
fi

echo ""
echo "🎉 SSL setup complete for $DOMAIN!"
echo ""
echo "To deploy with this certificate, run:"
echo "  DOMAIN=$DOMAIN docker compose up -d --build"
echo ""
echo "Or set the domain in your environment:"
echo "  export DOMAIN=$DOMAIN"
echo "  docker compose up -d --build"
echo ""
echo "Your application will be available at:"
echo "  https://$DOMAIN:9445"
