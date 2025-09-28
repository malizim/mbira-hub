#!/bin/bash

# Script to push mbira-recording-session to GitHub
# Run this after creating your GitHub repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not in a git repository. Please run this script from the project directory."
    exit 1
fi

# Check if remote already exists
if git remote get-url origin > /dev/null 2>&1; then
    log_info "Remote 'origin' already exists:"
    git remote get-url origin
    log_warning "If you want to change the remote URL, run: git remote set-url origin <new-url>"
else
    log_info "No remote 'origin' found. Please provide your GitHub repository URL."
    echo
    echo "Your GitHub repository URL should look like:"
    echo "  https://github.com/yourusername/mbira-recording-session.git"
    echo "  or"
    echo "  git@github.com:yourusername/mbira-recording-session.git"
    echo
    read -p "Enter your GitHub repository URL: " REPO_URL
    
    if [[ -z "$REPO_URL" ]]; then
        log_error "No URL provided. Exiting."
        exit 1
    fi
    
    # Add remote
    git remote add origin "$REPO_URL"
    log_success "Added remote 'origin': $REPO_URL"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
log_info "Current branch: $CURRENT_BRANCH"

# Rename branch to main if it's master
if [[ "$CURRENT_BRANCH" == "master" ]]; then
    log_info "Renaming branch from 'master' to 'main'"
    git branch -M main
    CURRENT_BRANCH="main"
fi

# Check if there are any uncommitted changes
if ! git diff-index --quiet HEAD --; then
    log_warning "You have uncommitted changes. Please commit them first:"
    echo "  git add ."
    echo "  git commit -m 'Your commit message'"
    exit 1
fi

# Push to GitHub
log_info "Pushing to GitHub..."

# Set upstream and push
if git push -u origin "$CURRENT_BRANCH"; then
    log_success "Successfully pushed to GitHub!"
    echo
    echo "=========================================="
    echo "  Repository Successfully Pushed!"
    echo "=========================================="
    echo
    echo "Your repository is now available at:"
    echo "  $(git remote get-url origin | sed 's/\.git$//')"
    echo
    echo "Next steps:"
    echo "  1. Visit your repository on GitHub"
    echo "  2. Update the repository description if needed"
    echo "  3. Add topics/tags for better discoverability"
    echo "  4. Consider adding a GitHub Pages site for documentation"
    echo
    echo "To update your repository in the future:"
    echo "  git add ."
    echo "  git commit -m 'Your update message'"
    echo "  git push"
    echo
    log_success "Happy coding! 🎵✨"
else
    log_error "Failed to push to GitHub. Please check your repository URL and try again."
    exit 1
fi
