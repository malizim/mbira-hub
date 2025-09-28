#!/bin/bash

# Setup Google Cloud Firewall Rules for Mbira Hub
# This script creates the necessary firewall rules

set -e

PROJECT="infinicore-457221"

echo "🔥 Setting up Google Cloud Firewall Rules"
echo "========================================="
echo "Project: $PROJECT"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
gcloud config set project $PROJECT

echo "📝 Creating firewall rules..."

# Create HTTPS rule (port 9445)
echo "Creating HTTPS rule (port 9445)..."
gcloud compute firewall-rules create mbira-https \
    --allow tcp:9445 \
    --source-ranges 0.0.0.0/0 \
    --description "Mbira Hub HTTPS" \
    --project=$PROJECT 2>/dev/null || echo "Rule already exists"

# Create WebSocket rule (port 9767)
echo "Creating WebSocket rule (port 9767)..."
gcloud compute firewall-rules create mbira-websocket \
    --allow tcp:9767 \
    --source-ranges 0.0.0.0/0 \
    --description "Mbira Hub WebSocket" \
    --project=$PROJECT 2>/dev/null || echo "Rule already exists"

# Create SSH rule (if needed)
echo "Creating SSH rule (port 22)..."
gcloud compute firewall-rules create mbira-ssh \
    --allow tcp:22 \
    --source-ranges 0.0.0.0/0 \
    --description "SSH access" \
    --project=$PROJECT 2>/dev/null || echo "Rule already exists"

echo ""
echo "✅ Firewall rules created successfully!"
echo ""
echo "📋 Created rules:"
echo "   • mbira-https (port 9445) - HTTPS access"
echo "   • mbira-websocket (port 9767) - WebSocket access"
echo "   • mbira-ssh (port 22) - SSH access"
echo ""
echo "🔍 To view all firewall rules:"
echo "   gcloud compute firewall-rules list --project=$PROJECT"
echo ""
echo "🗑️  To delete a rule:"
echo "   gcloud compute firewall-rules delete RULE_NAME --project=$PROJECT"
