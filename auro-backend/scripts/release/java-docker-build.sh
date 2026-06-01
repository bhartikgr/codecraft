#!/bin/bash
set -euo pipefail

# --- Input Args ---
REPO_URL=$1
BRANCH=$2
APP_NAME=$3
DOCKER_USER=${4:-}
DOCKER_PASS=${5:-}
TAG=$6
JDK_VERSION=$7

# --- Validate ---
if [ -z "$DOCKER_USER" ] || [ -z "$DOCKER_PASS" ]; then
  echo "❌ DOCKER_USER and DOCKER_PASS must be provided"
  exit 1
fi

# --- Log Info ---
echo "-------------------------------------------"
echo "🚀 Docker Build Script Starting..."
echo "Repo: $REPO_URL"
echo "Branch: $BRANCH"
echo "App: $APP_NAME"
echo "Docker user: $DOCKER_USER"
echo "Tag: $TAG"
echo "JDK: $JDK_VERSION"
echo "-------------------------------------------"

# --- Prepare workspace ---
WORKDIR_BASE="./docker_project"
TARGET_DIR="${WORKDIR_BASE}/${APP_NAME}"

mkdir -p "$WORKDIR_BASE"

# Safe cleanup (handles root-owned files)
if [ -d "$TARGET_DIR" ]; then
  echo "Cleaning old workspace..."
  rm -rf "$TARGET_DIR" 
fi

# --- Clone repo ---
echo "Cloning repository..."
git clone -b "$BRANCH" "$REPO_URL" "$TARGET_DIR" || {
  echo "❌ Git clone failed"
  exit 1
}
cd "$TARGET_DIR"

# --- Validate Gradle ---
if [ ! -f "build.gradle" ] && [ ! -f "build.gradle.kts" ]; then
  echo "No Gradle build file found"
  exit 1
fi

# --- Gradle wrapper check ---
if [[ -f gradlew ]]; then
  echo "Found Gradle wrapper"
  chmod +x gradlew
else
  echo "Generating Gradle wrapper..."

  docker run --rm \
  --user "$(id -u):$(id -g)" \
  -e GRADLE_USER_HOME=/tmp/gradle-home \
  -v "$PWD":/workspace \
  -w /workspace \
  gradle:8.10.2-jdk${JDK_VERSION} \
  bash -c "mkdir -p /tmp/gradle-home && gradle wrapper --gradle-version 8.10.2"

  chmod +x gradlew
fi

# --- Create Dockerfile ---
cat <<EOF > Dockerfile
# ---- Build Stage ----
FROM gradle:8.10.2-jdk17 AS build
WORKDIR /app
COPY . .
RUN ./gradlew clean bootJar -x test --no-daemon
RUN ls -l /app/build/libs/

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
EOF

# --- Docker login ---
echo "🔐 Logging into Docker Hub..."
echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

# --- Build image ---
IMAGE_NAME="${DOCKER_USER}/${APP_NAME}:${TAG}"

echo "Building Docker image: ${IMAGE_NAME}"
docker build -t "$IMAGE_NAME" .

# --- Push image ---
echo "Pushing image..."
docker push "$IMAGE_NAME"

echo "Image pushed: ${IMAGE_NAME}"

# --- Cleanup ---
echo "🧹 Cleaning workspace..."
cd ../..

chmod -R u+w "$TARGET_DIR" 2>/dev/null || true
rm -rf "$TARGET_DIR" 2>/dev/null || sudo rm -rf "$TARGET_DIR"

echo "Done!"