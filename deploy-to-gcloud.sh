#!/bin/bash

# Mbira Hub - Deploy to Google Cloud Instance
# This script uploads and deploys mbira-hub to your GCloud instance

set -e

# GCloud instance details
ZONE="us-central1-c"
INSTANCE="malizim@instance-20250418-220608"
PROJECT="infinicore-457221"

echo "🚀 Deploying Mbira Hub to Google Cloud"
echo "======================================"
echo "Instance: $INSTANCE"
echo "Zone: $ZONE"
echo "Project: $PROJECT"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if we're in the mbira-hub directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the mbira-hub directory"
    exit 1
fi

# Create a deployment package
echo "📦 Creating deployment package..."
tar -czf mbira-hub-deploy.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=data \
    --exclude=logs \
    --exclude=certs \
    --exclude=.env \
    .

echo "✅ Deployment package created: mbira-hub-deploy.tar.gz"

# Upload to GCloud instance
echo "📤 Uploading to Google Cloud instance..."
gcloud compute scp mbira-hub-deploy.tar.gz $INSTANCE:~/ --zone=$ZONE --project=$PROJECT

# Deploy on the instance
echo "🚀 Deploying on Google Cloud instance..."
gcloud compute ssh $INSTANCE --zone=$ZONE --project=$PROJECT --command="
    echo '📁 Extracting deployment package...'
    tar -xzf mbira-hub-deploy.tar.gz -C ~/mbira-hub/ 2>/dev/null || {
        mkdir -p ~/mbira-hub
        tar -xzf mbira-hub-deploy.tar.gz -C ~/mbira-hub/
    }
    
    cd ~/mbira-hub
    
    echo '🔧 Setting up environment...'
    chmod +x gcloud-deploy.sh
    
    echo '🚀 Starting deployment...'
    ./gcloud-deploy.sh
"

# Get the external IP
echo "🌐 Getting external IP address..."
EXTERNAL_IP=$(gcloud compute instances describe instance-20250418-220608 --zone=$ZONE --project=$PROJECT --format='get(networkInterfaces[0].accessConfigs[0].natIP)')

echo ""
echo "🎉 Deployment completed!"
echo "======================="
echo "🌐 Access your application at:"
echo "   • Main App: https://$EXTERNAL_IP:9445"
echo "   • WebSocket: wss://$EXTERNAL_IP:9767"
echo "   • Health Check: https://$EXTERNAL_IP:9445/health"
echo ""
echo "📝 Next steps:"
echo "   1. Configure firewall rules for ports 9445 and 9767"
echo "   2. Set up a domain name (optional)"
echo "   3. Configure SSL certificates for production"
echo ""
echo "🔧 To manage the application:"
echo "   gcloud compute ssh $INSTANCE --zone=$ZONE --project=$PROJECT"
echo "   cd ~/mbira-hub"
echo "   docker compose -f docker-compose.gcloud.yml logs -f"
