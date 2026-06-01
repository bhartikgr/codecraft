#!/bin/bash

set -e  # Exit on any error

# --- INPUT ARGUMENTS ---
REPO_URL=$1           # Git repo URL (e.g., https://github.com/yourname/my-node-app.git)
BRANCH_NAME=$2        # Branch name (e.g., main, dev)
APP_NAME=$3           # App name (e.g., mynodeapp)
DOCKER_USERNAME=${4:-$docker_username}   # Docker Hub username
DOCKER_PASSWORD=${5:-$docker_passsword}    # Docker Hub password
IMAGE_TAG=$6          # Image tag (e.g., v1.0.0 or latest)
NODE_VERSION=$7       # Node.js version (e.g., 16, 18, 20)

# --- VALIDATE INPUT ---
if [ $# -ne 7 ]; then
  echo "Usage: $0 <git-repo-url> <branch-name> <app-name> <docker-username> <docker-password> <image-tag> <node-version>"
  exit 1
fi

# --- ENVIRONMENT SETUP ---
BASE_DIR="./docker_project"
mkdir -p "$BASE_DIR"

USERNAME=$(whoami)
echo "Current user: $USERNAME"

CLONE_DIR="$BASE_DIR/$APP_NAME"
IMAGE_NAME="$DOCKER_USERNAME/$APP_NAME:$IMAGE_TAG"

# --- CLONE REPO ---
echo "Cloning repository from $REPO_URL (branch: $BRANCH_NAME) into $CLONE_DIR..."
rm -rf "$CLONE_DIR"
git clone --branch "$BRANCH_NAME" "$REPO_URL" "$CLONE_DIR"

if [ ! -d "$CLONE_DIR" ]; then
  echo " Failed to clone the repository or branch"
  exit 1
fi

# --- VERIFY package.json ---
if [ ! -f "$CLONE_DIR/package.json" ]; then
  echo " No package.json found in the repository."
  exit 1
fi

echo " Found package.json"


ls "$CLONE_DIR"
# --- CREATE Dockerfile ---
echo "creating dockerfile----"
docker builder prune -af
cat > "$CLONE_DIR/Dockerfile" <<EOF
# Stage 1: Build
FROM node:$NODE_VERSION AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .   

# Stage 2: Runtime
FROM node:$NODE_VERSION
WORKDIR /app
COPY --from=build /app .  
EXPOSE 8080
CMD ["npm", "start"]
EOF

echo "printing again..."
if [ -f "$CLONE_DIR/.dockerignore" ]; then
  cat "$CLONE_DIR/.dockerignore"
else
  echo "(no .dockerignore file)"
fi

echo " Build context files:"
#find "$CLONE_DIR"

# Enable BuildKit
export DOCKER_BUILDKIT=0

# --- BUILD DOCKER IMAGE ---
sudo usermod -aG docker $USER
newgrp docker
echo " Building Docker image: $IMAGE_NAME ..."
docker build -t "$IMAGE_NAME" "$CLONE_DIR"

# --- PUSH TO DOCKER HUB ---
echo " Logging into Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "Pushing image to Docker Hub..."
docker push "$IMAGE_NAME"

# --- VERIFY PUSH ---
echo "Verifying image on Docker Hub..."
docker pull "$IMAGE_NAME" && echo " Verified image exists on Docker Hub: $IMAGE_NAME"

echo " Done! Docker image pushed and verified: $IMAGE_NAME"
