#!/bin/bash
set -e

REPO_NAME="$1"
BRANCH_NAME="$2"
GITHUB_USER="$3"
LOCAL_DIR="$(realpath "$4")"
COMMIT_MESSAGE="$5"

REMOTE_URL="git@github.com:$GITHUB_USER/$REPO_NAME.git"

echo "Repository Name: $REPO_NAME"
echo "Branch Name: $BRANCH_NAME"
echo "GitHub User: $GITHUB_USER"
echo "Local Directory: $LOCAL_DIR"

check_repo_exists() {
    echo "🔍 Checking if repository exists on GitHub..."

    if ! git ls-remote "$REMOTE_URL" >/dev/null 2>&1; then
        echo "❌ Repository does not exist"
        exit 1
    fi

    echo "✅ Repository exists"
}

initialize_repo() {
    cd "$LOCAL_DIR" || exit 1

    if [ ! -d ".git" ]; then
        echo "📦 Initializing Git repository..."

        git init
        git config user.name "AI2DEV Bot"
        git config user.email "auto@ai2dev.com"
    fi

    git remote remove origin 2>/dev/null || true
    git remote add origin "$REMOTE_URL"

    git checkout -B "$BRANCH_NAME"
}

commit_changes() {
    echo "📝 Preparing commit..."

    git add .

    if git diff --cached --quiet; then
        echo "⚠️ No changes detected"
        DIFF_STATS=""
        return
    fi

    git commit -m "$COMMIT_MESSAGE"

    DIFF_STATS=$(git show --shortstat HEAD)
    echo "$DIFF_STATS"
}

push_changes() {
    echo "🚀 Force pushing to $BRANCH_NAME..."

    git push \
        --force \
        --set-upstream \
        origin \
        "$BRANCH_NAME"

    echo "✅ Push successful"
}

check_repo_exists
initialize_repo
commit_changes
push_changes

echo "✅ Script finished successfully"