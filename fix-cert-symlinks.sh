#!/bin/bash

# Fix broken symlinks for infinicore.co.zw certificates
# This script creates the archive directory and copies certificates

set -e

echo "🔧 Fixing certificate symlinks for infinicore.co.zw"
echo "=================================================="

DOMAIN="infinicore.co.zw"
CERT_DIR="./certs/$DOMAIN"
ARCHIVE_DIR="./certs/archive/$DOMAIN"

# Create archive directory
mkdir -p "$ARCHIVE_DIR"

echo "📁 Created archive directory: $ARCHIVE_DIR"

# Check if we have the main certificate files
if [ -f "./certs/cert.pem" ] && [ -f "./certs/key.pem" ]; then
    echo "✅ Found main certificate files"
    
    # Copy to archive directory with version numbers
    cp "./certs/cert.pem" "$ARCHIVE_DIR/cert3.pem"
    cp "./certs/key.pem" "$ARCHIVE_DIR/privkey3.pem"
    
    # Create chain and fullchain (for Let's Encrypt compatibility)
    cp "./certs/cert.pem" "$ARCHIVE_DIR/chain3.pem"
    cp "./certs/cert.pem" "$ARCHIVE_DIR/fullchain3.pem"
    
    echo "✅ Copied certificates to archive directory"
    
    # Verify symlinks work
    if [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
        echo "✅ Symlinks are now working!"
        echo "   Certificate: $CERT_DIR/fullchain.pem"
        echo "   Private Key: $CERT_DIR/privkey.pem"
    else
        echo "❌ Symlinks still not working. Let's create direct files..."
        
        # Create direct files instead of symlinks
        cp "$ARCHIVE_DIR/fullchain3.pem" "$CERT_DIR/fullchain.pem"
        cp "$ARCHIVE_DIR/privkey3.pem" "$CERT_DIR/privkey.pem"
        
        echo "✅ Created direct certificate files"
    fi
else
    echo "❌ Main certificate files not found in ./certs/"
    echo "Please ensure you have cert.pem and key.pem in the ./certs/ directory"
    exit 1
fi

echo ""
echo "🎉 Certificate setup complete!"
echo ""
echo "To test the setup, run:"
echo "  DOMAIN=$DOMAIN ./setup-ssl.sh"
echo ""
echo "To deploy, run:"
echo "  DOMAIN=$DOMAIN docker compose up -d --build"
