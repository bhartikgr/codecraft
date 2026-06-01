#!/bin/bash

# Variables
REPO_NAME=$1
BRANCH_NAME=$2
GITHUB_USER=$3
LOCAL_DIR="$(realpath "$4")"
COMMIT_MESSAGE=$5

echo "Repository Name: $REPO_NAME"
echo "Branch Name: $BRANCH_NAME"
echo "GitHub User: $GITHUB_USER"
echo "Local Directory: $LOCAL_DIR"

REMOTE_URL="git@github.com:$GITHUB_USER/$REPO_NAME.git"
COMMIT_MESSAGE=${5:-"Automated commit on branch $BRANCH_NAME from Auro Heal AI2DEV"}

# ==============================
# FUNCTIONS
# ==============================

check_repo_exists() {
    echo "🔍 Checking if repository exists on GitHub..."
    if ! git ls-remote "$REMOTE_URL" &>/dev/null; then
        echo "❌ Repository does not exist."
        echo "👉 Create it manually: https://github.com/new"
        exit 1
    fi
    echo "✅ Repository exists."
}

initialize_repo() {
    cd "$LOCAL_DIR" || { echo "❌ Failed to cd into $LOCAL_DIR"; exit 1; }

    if [ ! -d ".git" ]; then
        echo "📦 Initializing Git repository..."
        git init -b "$BRANCH_NAME"
        git config user.name "AI2DEV Bot"
        git config user.email "auto@ai2dev.com"
    else
        echo "✅ Git already initialized."
    fi

    git remote remove origin 2>/dev/null
    git remote add origin "$REMOTE_URL"
}

safe_commit() {
    echo "📝 Preparing to commit..."

    git checkout -B "$BRANCH_NAME" 2>/dev/null || true
    git add .

    if git diff --cached --quiet; then
        echo "⚠️ No changes detected. Skipping commit."
    else
        git commit -m "$COMMIT_MESSAGE"
    fi
}

push_changes() {
    echo "🚀 Pushing to branch $BRANCH_NAME..."

    if git ls-remote --heads origin "$BRANCH_NAME" | grep -q "$BRANCH_NAME"; then
        git fetch origin "$BRANCH_NAME"
        git merge "origin/$BRANCH_NAME" --no-edit -X ours --allow-unrelated-histories
    fi

    git push -u origin "$BRANCH_NAME"
}

# ==============================
# MAIN FLOW
# ==============================

check_repo_exists
initialize_repo
safe_commit
push_changes

echo "✅ Script finished successfully."