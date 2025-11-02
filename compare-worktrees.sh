#!/bin/bash

# Script to compare worktree implementations
# Usage: ./compare-worktrees.sh [FVCVO|n2wP1|PPJWg] [FVCVO|n2wP1|PPJWg]
#        ./compare-worktrees.sh all  # Compare all to base

WORKTREE1=$1
WORKTREE2=$2

# Worktree branch mapping
declare -A BRANCHES
BRANCHES[FVCVO]="feat-tool-plan-phases-FVCVO"
BRANCHES[n2wP1]="feat-tool-plan-phases-n2wP1"
BRANCHES[PPJWg]="implement-tool-plan-PPJWg"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cd /Users/wlane/Desktop/Code/prompt_studio || exit 1

if [ "$WORKTREE1" == "all" ]; then
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  Comparing All Implementations to Base Branch"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    for name in FVCVO n2wP1 PPJWg; do
        branch="${BRANCHES[$name]}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${GREEN}Implementation: $name${NC} (${YELLOW}$branch${NC})"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        
        echo -e "\n${YELLOW}Files changed:${NC}"
        git diff --stat feature/tool-loop-v2 "$branch"
        
        echo -e "\n${YELLOW}Key backend changes:${NC}"
        git diff feature/tool-loop-v2 "$branch" -- backend/app/routers/chat.py backend/services/openrouter.py backend/services/tool_executor.py backend/app/core/config.py | head -50
        
        echo -e "\n"
    done
    
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  Summary by File"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${YELLOW}Backend chat.py changes:${NC}"
    for name in FVCVO n2wP1 PPJWg; do
        branch="${BRANCHES[$name]}"
        changes=$(git diff --shortstat feature/tool-loop-v2 "$branch" -- backend/app/routers/chat.py)
        echo -e "  ${GREEN}$name${NC}: $changes"
    done
    
    echo -e "\n${YELLOW}Backend openrouter.py changes:${NC}"
    for name in FVCVO n2wP1 PPJWg; do
        branch="${BRANCHES[$name]}"
        changes=$(git diff --shortstat feature/tool-loop-v2 "$branch" -- backend/services/openrouter.py)
        echo -e "  ${GREEN}$name${NC}: $changes"
    done
    
    echo -e "\n${YELLOW}Backend config.py changes:${NC}"
    for name in FVCVO n2wP1 PPJWg; do
        branch="${BRANCHES[$name]}"
        changes=$(git diff --shortstat feature/tool-loop-v2 "$branch" -- backend/app/core/config.py)
        echo -e "  ${GREEN}$name${NC}: $changes"
    done
    
    echo -e "\n${YELLOW}Frontend changes:${NC}"
    for name in FVCVO n2wP1 PPJWg; do
        branch="${BRANCHES[$name]}"
        changes=$(git diff --shortstat feature/tool-loop-v2 "$branch" -- frontend/src/)
        echo -e "  ${GREEN}$name${NC}: $changes"
    done
    
    exit 0
fi

if [ -z "$WORKTREE1" ] || [ -z "$WORKTREE2" ]; then
    echo -e "${RED}Usage: ./compare-worktrees.sh [FVCVO|n2wP1|PPJWg] [FVCVO|n2wP1|PPJWg]${NC}"
    echo -e "${RED}       ./compare-worktrees.sh all${NC}"
    echo ""
    echo "Examples:"
    echo "  ./compare-worktrees.sh FVCVO n2wP1  # Compare two implementations"
    echo "  ./compare-worktrees.sh all          # Compare all to base"
    exit 1
fi

BRANCH1="${BRANCHES[$WORKTREE1]}"
BRANCH2="${BRANCHES[$WORKTREE2]}"

if [ -z "$BRANCH1" ] || [ -z "$BRANCH2" ]; then
    echo -e "${RED}Unknown worktree names${NC}"
    echo "Valid names: FVCVO, n2wP1, PPJWg"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}  Comparing: ${GREEN}$WORKTREE1${NC} vs ${GREEN}$WORKTREE2${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Files changed between implementations:${NC}"
git diff --stat "$BRANCH1" "$BRANCH2"
echo ""

echo -e "${YELLOW}Detailed diff (first 100 lines):${NC}"
git diff "$BRANCH1" "$BRANCH2" | head -100
echo ""

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "To see full diff, run: ${GREEN}git diff $BRANCH1 $BRANCH2${NC}"
echo -e "To see diff for specific file: ${GREEN}git diff $BRANCH1 $BRANCH2 -- path/to/file${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

