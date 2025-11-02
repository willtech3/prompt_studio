#!/bin/bash

# Helper script to test worktree implementations
# Usage: ./test-worktree.sh [FVCVO|n2wP1|PPJWg] [backend|frontend|both]

WORKTREE_NAME=$1
COMPONENT=${2:-both}

# Worktree paths
declare -A WORKTREES
WORKTREES[FVCVO]="/Users/wlane/.cursor/worktrees/prompt_studio/FVCVO"
WORKTREES[n2wP1]="/Users/wlane/.cursor/worktrees/prompt_studio/n2wP1"
WORKTREES[PPJWg]="/Users/wlane/.cursor/worktrees/prompt_studio/PPJWg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$WORKTREE_NAME" ]; then
    echo -e "${RED}Usage: ./test-worktree.sh [FVCVO|n2wP1|PPJWg] [backend|frontend|both]${NC}"
    echo ""
    echo "Examples:"
    echo "  ./test-worktree.sh FVCVO backend   # Test FVCVO backend only"
    echo "  ./test-worktree.sh n2wP1 frontend  # Test n2wP1 frontend only"
    echo "  ./test-worktree.sh PPJWg both      # Test PPJWg both (default)"
    exit 1
fi

WORKTREE_PATH="${WORKTREES[$WORKTREE_NAME]}"

if [ -z "$WORKTREE_PATH" ]; then
    echo -e "${RED}Unknown worktree: $WORKTREE_NAME${NC}"
    echo "Available worktrees: FVCVO, n2wP1, PPJWg"
    exit 1
fi

if [ ! -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}Worktree directory not found: $WORKTREE_PATH${NC}"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  Testing Worktree: ${GREEN}$WORKTREE_NAME${NC}"
echo -e "${BLUE}║${NC}  Path: $WORKTREE_PATH"
echo -e "${BLUE}║${NC}  Component: ${YELLOW}$COMPONENT${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to test backend
test_backend() {
    echo -e "${YELLOW}→ Starting Backend Tests...${NC}"
    cd "$WORKTREE_PATH/backend" || exit 1
    
    echo -e "  ${BLUE}[1/4]${NC} Stopping any running servers..."
    just stop 2>/dev/null
    
    echo -e "  ${BLUE}[2/4]${NC} Syncing dependencies..."
    just sync
    
    echo -e "  ${BLUE}[3/4]${NC} Running tests..."
    just test
    
    echo -e "  ${BLUE}[4/4]${NC} Starting backend server..."
    echo -e "  ${GREEN}Backend will run at: http://localhost:8000${NC}"
    echo -e "  ${GREEN}Health check: http://localhost:8000/api/health${NC}"
    echo -e "  ${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""
    just start
}

# Function to test frontend
test_frontend() {
    echo -e "${YELLOW}→ Starting Frontend Tests...${NC}"
    cd "$WORKTREE_PATH/frontend" || exit 1
    
    echo -e "  ${BLUE}[1/2]${NC} Installing dependencies (if needed)..."
    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo -e "  ${GREEN}✓${NC} node_modules exists, skipping install"
    fi
    
    echo -e "  ${BLUE}[2/2]${NC} Starting frontend dev server..."
    echo -e "  ${GREEN}Frontend will run at: http://localhost:5173${NC}"
    echo -e "  ${YELLOW}Press Ctrl+C to stop the server${NC}"
    echo ""
    npm run dev
}

# Function to show status
show_status() {
    echo -e "${YELLOW}→ Worktree Status:${NC}"
    cd "$WORKTREE_PATH" || exit 1
    git status --short
    echo ""
}

# Function to show changes
show_changes() {
    echo -e "${YELLOW}→ Changes from base branch:${NC}"
    cd "$WORKTREE_PATH" || exit 1
    git diff --stat feature/tool-loop-v2
    echo ""
}

# Show status and changes
show_status
show_changes

# Run based on component choice
case $COMPONENT in
    backend)
        test_backend
        ;;
    frontend)
        test_frontend
        ;;
    both)
        echo -e "${YELLOW}Note: Running 'both' will only start backend.${NC}"
        echo -e "${YELLOW}To test frontend, open a new terminal and run:${NC}"
        echo -e "${GREEN}  cd $WORKTREE_PATH/frontend && npm run dev${NC}"
        echo ""
        read -p "Press Enter to start backend server..."
        test_backend
        ;;
    *)
        echo -e "${RED}Unknown component: $COMPONENT${NC}"
        echo "Valid options: backend, frontend, both"
        exit 1
        ;;
esac

