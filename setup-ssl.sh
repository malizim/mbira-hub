#!/bin/bash

# Mbira Hub - SSL Certificate Setup Script
# This script detects and sets up SSL certificates for deployment

set -e

echo "🔒 Mbira Hub - SSL Certificate Setup"
echo "===================================="

# Check if running as root (needed for Let's Encrypt access)
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Running as root - this is needed for Let's Encrypt certificate access"
fi

# Function to check if Let's Encrypt certificates exist
check_letsencrypt() {
    local domain=${1:-"localhost"}
    local le_path="/etc/letsencrypt/live/$domain"
    
    if [ -d "$le_path" ] && [ -f "$le_path/fullchain.pem" ] && [ -f "$le_path/privkey.pem" ]; then
        echo "✅ Found Let's Encrypt certificates for domain: $domain"
        echo "   Certificate: $le_path/fullchain.pem"
        echo "   Private Key: $le_path/privkey.pem"
        return 0
    else
        echo "❌ No Let's Encrypt certificates found for domain: $domain"
        return 1
    fi
}

# Function to check if custom domain certificates exist
check_custom_domain() {
    local domain=${1:-"localhost"}
    local custom_path="./certs/$domain"
    
    if [ -d "$custom_path" ] && [ -f "$custom_path/fullchain.pem" ] && [ -f "$custom_path/privkey.pem" ]; then
        echo "✅ Found custom domain certificates for: $domain"
        echo "   Certificate: $custom_path/fullchain.pem"
        echo "   Private Key: $custom_path/privkey.pem"
        return 0
    else
        echo "❌ No custom domain certificates found for: $domain"
        return 1
    fi
}

# Function to generate self-signed certificate
generate_self_signed() {
    echo "🔧 Generating self-signed SSL certificate..."
    
    # Create certs directory if it doesn't exist
    mkdir -p ./certs
    
    # Generate self-signed certificate
    openssl req -x509 -newkey rsa:4096 \
        -keyout ./certs/key.pem \
        -out ./certs/cert.pem \
        -days 365 \
        -nodes \
        -subj "/C=US/ST=State/L=City/O=MbiraHub/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,DNS:*.localhost,IP:127.0.0.1"
    
    # Set proper permissions
    chmod 644 ./certs/cert.pem
    chmod 600 ./certs/key.pem
    
    echo "✅ Self-signed certificate generated successfully"
    echo "   Certificate: ./certs/cert.pem"
    echo "   Private Key: ./certs/key.pem"
}

# Function to list available Let's Encrypt domains
list_letsencrypt_domains() {
    local le_path="/etc/letsencrypt/live"
    
    if [ -d "$le_path" ]; then
        echo "📋 Available Let's Encrypt domains:"
        for domain in "$le_path"/*; do
            if [ -d "$domain" ] && [ -f "$domain/fullchain.pem" ]; then
                local domain_name=$(basename "$domain")
                echo "   • $domain_name"
            fi
        done
    else
        echo "❌ Let's Encrypt directory not found: $le_path"
    fi
}

# Main setup logic
echo "🔍 Checking for SSL certificates..."

# Get domain from environment or prompt
DOMAIN=${DOMAIN:-"localhost"}
if [ "$DOMAIN" = "localhost" ] && [ -t 0 ]; then
    echo ""
    echo "Enter your domain name (or press Enter for localhost):"
    read -r input_domain
    if [ -n "$input_domain" ]; then
        DOMAIN="$input_domain"
    fi
fi

echo "🌐 Using domain: $DOMAIN"

# Check for Let's Encrypt certificates
if check_letsencrypt "$DOMAIN"; then
    echo ""
    echo "🎉 Let's Encrypt certificate found! The application will use this certificate."
    echo ""
    echo "To deploy with this certificate, run:"
    echo "  DOMAIN=$DOMAIN docker compose up -d --build"
    echo ""
    echo "Or set the domain in your environment:"
    echo "  export DOMAIN=$DOMAIN"
    echo "  docker compose up -d --build"

# Check for custom domain certificates
elif check_custom_domain "$DOMAIN"; then
    echo ""
    echo "🎉 Custom domain certificate found! The application will use this certificate."
    echo ""
    echo "To deploy with this certificate, run:"
    echo "  DOMAIN=$DOMAIN docker compose up -d --build"
    echo ""
    echo "Or set the domain in your environment:"
    echo "  export DOMAIN=$DOMAIN"
    echo "  docker compose up -d --build"
    
elif [ -f "./certs/cert.pem" ] && [ -f "./certs/key.pem" ]; then
    echo ""
    echo "✅ Local SSL certificates found! The application will use these certificates."
    echo ""
    echo "To deploy, run:"
    echo "  docker compose up -d --build"
    
else
    echo ""
    echo "⚠️  No SSL certificates found. Generating self-signed certificate..."
    generate_self_signed
    echo ""
    echo "✅ Self-signed certificate generated! The application will use this certificate."
    echo ""
    echo "To deploy, run:"
    echo "  docker compose up -d --build"
    echo ""
    echo "⚠️  Note: Self-signed certificates will show security warnings in browsers."
    echo "   For production, consider using Let's Encrypt certificates."
fi

# Show available Let's Encrypt domains if any
echo ""
list_letsencrypt_domains

echo ""
echo "🔒 SSL setup complete!"
echo ""
echo "Certificate Priority:"
echo "1. Let's Encrypt (if available and domain matches)"
echo "2. Custom Domain certificates (./certs/{domain}/)"
echo "3. Local certificates (./certs/)"
echo "4. Self-signed (generated if none found)"
echo "5. HTTP only (if SSL disabled)"
