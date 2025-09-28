#!/bin/bash

# Test script for Mbira Recording Session deployment
# This script tests various endpoints and functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://localhost"
TIMEOUT=10

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

test_endpoint() {
    local endpoint=$1
    local expected_status=$2
    local description=$3
    
    log_info "Testing $description..."
    
    local response=$(curl -k -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint" --max-time $TIMEOUT)
    
    if [[ $response -eq $expected_status ]]; then
        log_success "$description - Status: $response"
        return 0
    else
        log_error "$description - Expected: $expected_status, Got: $response"
        return 1
    fi
}

test_health() {
    log_info "Testing health endpoint..."
    
    local response=$(curl -k -s "$BASE_URL/health" --max-time $TIMEOUT)
    local status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "null")
    
    if [[ "$status" == "ok" ]]; then
        log_success "Health check passed"
        echo "Health response: $response"
        return 0
    else
        log_error "Health check failed"
        echo "Response: $response"
        return 1
    fi
}

test_ssl() {
    log_info "Testing SSL certificate..."
    
    local cert_info=$(echo | openssl s_client -servername localhost -connect localhost:443 2>/dev/null | openssl x509 -noout -subject 2>/dev/null || echo "Failed")
    
    if [[ "$cert_info" != "Failed" ]]; then
        log_success "SSL certificate is valid"
        echo "Certificate: $cert_info"
        return 0
    else
        log_error "SSL certificate test failed"
        return 1
    fi
}

test_services() {
    log_info "Testing system services..."
    
    # Check if running in Docker
    if command -v docker &> /dev/null && docker ps | grep -q mbira; then
        log_info "Docker environment detected"
        
        # Test Docker containers
        if docker compose ps | grep -q "Up"; then
            log_success "Docker containers are running"
        else
            log_error "Docker containers are not running"
            return 1
        fi
    else
        log_info "Systemd environment detected"
        
        # Test systemd services
        if systemctl is-active --quiet mbira-recording-session; then
            log_success "Application service is running"
        else
            log_error "Application service is not running"
            return 1
        fi
        
        if systemctl is-active --quiet nginx; then
            log_success "Nginx service is running"
        else
            log_error "Nginx service is not running"
            return 1
        fi
    fi
    
    return 0
}

test_functionality() {
    log_info "Testing application functionality..."
    
    # Test session creation
    local session_response=$(curl -k -s -X POST "$BASE_URL/api/sessions" \
        -H "Content-Type: application/json" \
        -d '{"name":"test-session","password":"test123"}' \
        --max-time $TIMEOUT)
    
    local session_id=$(echo "$session_response" | jq -r '.session.id' 2>/dev/null || echo "null")
    
    if [[ "$session_id" != "null" && "$session_id" != "" ]]; then
        log_success "Session creation works"
        
        # Test session retrieval
        local get_response=$(curl -k -s "$BASE_URL/api/sessions/$session_id" --max-time $TIMEOUT)
        local retrieved_id=$(echo "$get_response" | jq -r '.session.id' 2>/dev/null || echo "null")
        
        if [[ "$retrieved_id" == "$session_id" ]]; then
            log_success "Session retrieval works"
        else
            log_error "Session retrieval failed"
            return 1
        fi
        
        # Clean up test session
        curl -k -s -X DELETE "$BASE_URL/api/sessions/$session_id" --max-time $TIMEOUT > /dev/null
        log_info "Test session cleaned up"
    else
        log_error "Session creation failed"
        return 1
    fi
    
    return 0
}

test_performance() {
    log_info "Testing performance..."
    
    local start_time=$(date +%s.%N)
    curl -k -s "$BASE_URL/health" --max-time $TIMEOUT > /dev/null
    local end_time=$(date +%s.%N)
    
    local response_time=$(echo "$end_time - $start_time" | bc)
    
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        log_success "Response time: ${response_time}s (Good)"
    elif (( $(echo "$response_time < 5.0" | bc -l) )); then
        log_warning "Response time: ${response_time}s (Acceptable)"
    else
        log_error "Response time: ${response_time}s (Slow)"
        return 1
    fi
    
    return 0
}

show_summary() {
    local total_tests=$1
    local passed_tests=$2
    
    echo
    echo "=========================================="
    echo "  Deployment Test Summary"
    echo "=========================================="
    echo
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $((total_tests - passed_tests))"
    echo "Success Rate: $(( (passed_tests * 100) / total_tests ))%"
    echo
    
    if [[ $passed_tests -eq $total_tests ]]; then
        log_success "All tests passed! Deployment is working correctly."
    else
        log_error "Some tests failed. Please check the deployment."
    fi
}

main() {
    echo "=========================================="
    echo "  Mbira Recording Session - Test Suite"
    echo "=========================================="
    echo
    
    local total_tests=0
    local passed_tests=0
    
    # Test 1: Health endpoint
    ((total_tests++))
    if test_health; then
        ((passed_tests++))
    fi
    echo
    
    # Test 2: SSL certificate
    ((total_tests++))
    if test_ssl; then
        ((passed_tests++))
    fi
    echo
    
    # Test 3: System services
    ((total_tests++))
    if test_services; then
        ((passed_tests++))
    fi
    echo
    
    # Test 4: Basic endpoints
    ((total_tests++))
    if test_endpoint "/" "200" "Main page"; then
        ((passed_tests++))
    fi
    echo
    
    # Test 5: API endpoints
    ((total_tests++))
    if test_endpoint "/api/sessions" "200" "Sessions API"; then
        ((passed_tests++))
    fi
    echo
    
    # Test 6: Application functionality
    ((total_tests++))
    if test_functionality; then
        ((passed_tests++))
    fi
    echo
    
    # Test 7: Performance
    ((total_tests++))
    if test_performance; then
        ((passed_tests++))
    fi
    echo
    
    show_summary $total_tests $passed_tests
}

# Check dependencies
if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. Some tests may not work properly."
fi

if ! command -v bc &> /dev/null; then
    log_warning "bc is not installed. Performance tests may not work properly."
fi

# Run tests
main "$@"
