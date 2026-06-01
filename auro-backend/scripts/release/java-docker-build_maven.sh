#!/bin/sh

# Exit on error, undefined variables, and pipeline failures
set -e

# Logging function
log() {
  printf "[%s] %s\n" "$(date +'%Y-%m-%d %H:%M:%S')" "$1"
}

# --- INPUT ARGUMENTS ---
REPO_URL=$1           # Git repo URL
BRANCH_NAME=$2        # Branch name
APP_NAME=$3           # App name (e.g., myapp)
DOCKER_USERNAME=${4:-$docker_username}
DOCKER_PASSWORD=${5:-$docker_password}
IMAGE_TAG=$6          # e.g., v1.0.0 or latest
JDK_VERSION=$7        # e.g., 17, 21

# --- VALIDATE INPUT ---
if [ $# -lt 5 ]; then
  log "Usage: $0 <git-repo-url> <branch-name> <app-name> <image-tag> <jdk-version> "
  exit 1
fi


if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
  log "DOCKER_USERNAME and DOCKER_PASSWORD environment variables must be set"
  exit 1
fi


# --- ENVIRONMENT SETUP ---
BASE_DIR="./docker_project"
CLONE_DIR="$BASE_DIR/$APP_NAME"
IMAGE_NAME="$DOCKER_USERNAME/$APP_NAME:$IMAGE_TAG"


mkdir -p "$BASE_DIR"

# --- CLONE REPO ---
log "Cloning repository..."
if [ -d "$CLONE_DIR" ]; then
  rm -rf "$CLONE_DIR" || { log " Failed to clean up existing clone directory"; exit 1; }
fi

git clone --branch "$BRANCH_NAME" "$REPO_URL" "$CLONE_DIR" || { log " Failed to clone repository"; exit 1; }

if [ ! -d "$CLONE_DIR" ]; then
  log " Clone directory does not exist"
  exit 1
fi


# --- DETECT pom.xml ---
BUILD_FILE=$(find "$CLONE_DIR" -maxdepth 3 -type f -name "pom.xml" | head -1)
if [ -z "$BUILD_FILE" ]; then
  log " No pom.xml found in repository"
  exit 1
fi
BUILD_DIR=$(dirname "$BUILD_FILE")
log "Detected Maven project in: $BUILD_DIR"

# --- CREATE MULTI-STAGE DOCKERFILE ---
log "Creating Dockerfile..."
cat > "$CLONE_DIR/Dockerfile" <<EOF
# Build stage
ARG JDK_VERSION
FROM maven:3.9-eclipse-temurin-${JDK_VERSION} AS build
WORKDIR /src
COPY . .
RUN mvn -f \$(find . -name "pom.xml" | head -1) clean package -DskipTests

# Pick a runnable jar
RUN JAR_FILE=\$(find target -maxdepth 1 -type f \( -name "*-SNAPSHOT.jar" -o -name "*-release.jar" -o -name "${APP_NAME}*.jar" \) | head -1) && \
    [ -n "\$JAR_FILE" ] || { echo " No JAR file found"; exit 1; } && \
    cp "\$JAR_FILE" /src/app.jar

# Runtime stage
FROM eclipse-temurin:${JDK_VERSION}-jre
WORKDIR /app
COPY --from=build /src/app.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
EOF

# --- BUILD DOCKER IMAGE ---
log " Building Docker image: $IMAGE_NAME ..."
docker build --build-arg JDK_VERSION="$JDK_VERSION"  -t "$IMAGE_NAME" "$CLONE_DIR" || { log " Failed to build Docker image"; exit 1; }

# --- PUSH TO DOCKER HUB ---
log "Logging into Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin || { log " Docker login failed"; exit 1; }

log " Pushing image to Docker Hub..."
docker push "$IMAGE_NAME" || { log " Failed to push image"; exit 1; }

log " Done! Docker image pushed: $IMAGE_NAME"