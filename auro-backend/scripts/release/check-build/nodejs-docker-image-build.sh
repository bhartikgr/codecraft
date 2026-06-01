#!/bin/bash

set -e  # Exit on any error

# --- INPUT ARGUMENTS ---
PROJECT_PATH=$1    # Local project path
APP_NAME=$2        # App name (not used but kept for consistency)
NODE_VERSION=$3    # Node.js version (e.g., 18, 20, 22)

# --- VALIDATE INPUT ---
if [ $# -ne 3 ]; then
  echo "Usage: $0 <project-path> <app-name> <node-version>"
  exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
  echo "❌ No project found at $PROJECT_PATH"
  exit 1
fi

cd "$PROJECT_PATH"

# --- VERIFY package.json ---
if [ ! -f "package.json" ]; then
  echo "❌ package.json not found"
  exit 1
fi

echo "✅ package.json found"
echo "🚀 Node version expected: $NODE_VERSION"

# --- INSTALL DEPENDENCIES ---
echo "📦 Installing dependencies..."
npm install

# --- RUN BUILD (if exists) ---
if npm run | grep -q "build"; then
  echo "🏗 Running npm run build..."
  npm run build
else
  echo "ℹ️ No build script found, skipping build step"
fi

echo "✅ Node.js build check successful"
