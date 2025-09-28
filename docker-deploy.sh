#!/bin/bash

# Mbira Recording Session - Docker Deployment Script
# This script deploys the application using Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="mbira-recording-session"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    log_info "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    log_success "Docker and Docker Compose are available"
}

check_ports() {
    log_info "Checking port availability..."
    
    PORTS=(80 443 8443 8766)
    for port in "${PORTS[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            log_warning "Port $port is already in use. This may cause conflicts."
        fi
    done
}

create_directories() {
    log_info "Creating necessary directories..."
    
    mkdir -p data certs logs
    chmod 755 data certs logs
    
    log_success "Directories created"
}

generate_ssl_certificates() {
    log_info "Generating SSL certificates..."
    
    if [[ ! -f "certs/cert.pem" || ! -f "certs/key.pem" ]]; then
        openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=MbiraRecording/CN=localhost"
        chmod 600 certs/key.pem
        chmod 644 certs/cert.pem
        log_success "SSL certificates generated"
    else
        log_success "SSL certificates already exist"
    fi
}

build_images() {
    log_info "Building Docker images..."
    
    if docker compose version &> /dev/null; then
        docker compose -p $PROJECT_NAME build --no-cache
    else
        docker-compose -p $PROJECT_NAME build --no-cache
    fi
    
    log_success "Docker images built"
}

start_services() {
    log_info "Starting services..."
    
    if docker compose version &> /dev/null; then
        docker compose -p $PROJECT_NAME up -d
    else
        docker-compose -p $PROJECT_NAME up -d
    fi
    
    log_success "Services started"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for the application to be healthy
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -k -f https://localhost/health &> /dev/null; then
            log_success "Application is ready"
            return 0
        fi
        
        log_info "Waiting for application... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "Application failed to start within expected time"
    return 1
}

show_status() {
    log_info "Deployment completed successfully!"
    echo
    echo "=========================================="
    echo "  Mbira Recording Session - Docker"
    echo "=========================================="
    echo
    echo "Application URL: https://localhost"
    echo "Project Name: $PROJECT_NAME"
    echo
    echo "Useful Commands:"
    echo "  View logs: docker compose -p $PROJECT_NAME logs -f"
    echo "  Stop services: docker compose -p $PROJECT_NAME down"
    echo "  Restart services: docker compose -p $PROJECT_NAME restart"
    echo "  View status: docker compose -p $PROJECT_NAME ps"
    echo "  Update application: ./docker-deploy.sh update"
    echo
    echo "Data persistence:"
    echo "  - Application data: ./data/"
    echo "  - SSL certificates: ./certs/"
    echo "  - Logs: ./logs/"
    echo
    log_success "Deployment complete! Visit https://localhost to use the application."
}

update_application() {
    log_info "Updating application..."
    
    # Pull latest changes (if using git)
    if [[ -d ".git" ]]; then
        git pull
    fi
    
    # Rebuild and restart
    build_images
    start_services
    wait_for_services
    
    log_success "Application updated"
}

cleanup() {
    log_info "Cleaning up old containers and images..."
    
    if docker compose version &> /dev/null; then
        docker compose -p $PROJECT_NAME down --remove-orphans
        docker system prune -f
    else
        docker-compose -p $PROJECT_NAME down --remove-orphans
        docker system prune -f
    fi
    
    log_success "Cleanup completed"
}

show_help() {
    echo "Mbira Recording Session - Docker Deployment"
    echo
    echo "Usage: $0 [COMMAND]"
    echo
    echo "Commands:"
    echo "  deploy     Deploy the application (default)"
    echo "  update     Update the application"
    echo "  stop       Stop all services"
    echo "  start      Start all services"
    echo "  restart    Restart all services"
    echo "  logs       View application logs"
    echo "  status     Show service status"
    echo "  cleanup    Clean up old containers and images"
    echo "  help       Show this help message"
    echo
}

# Main function
main() {
    case "${1:-deploy}" in
        "deploy")
            check_docker
            check_ports
            create_directories
            generate_ssl_certificates
            build_images
            start_services
            wait_for_services
            show_status
            ;;
        "update")
            update_application
            ;;
        "stop")
            if docker compose version &> /dev/null; then
                docker compose -p $PROJECT_NAME down
            else
                docker-compose -p $PROJECT_NAME down
            fi
            log_success "Services stopped"
            ;;
        "start")
            if docker compose version &> /dev/null; then
                docker compose -p $PROJECT_NAME up -d
            else
                docker-compose -p $PROJECT_NAME up -d
            fi
            log_success "Services started"
            ;;
        "restart")
            if docker compose version &> /dev/null; then
                docker compose -p $PROJECT_NAME restart
            else
                docker-compose -p $PROJECT_NAME restart
            fi
            log_success "Services restarted"
            ;;
        "logs")
            if docker compose version &> /dev/null; then
                docker compose -p $PROJECT_NAME logs -f
            else
                docker-compose -p $PROJECT_NAME logs -f
            fi
            ;;
        "status")
            if docker compose version &> /dev/null; then
                docker compose -p $PROJECT_NAME ps
            else
                docker-compose -p $PROJECT_NAME ps
            fi
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
