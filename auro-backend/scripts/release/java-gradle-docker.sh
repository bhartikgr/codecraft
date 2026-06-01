set -e

# Logging function
log() {
  printf "[%s] %s\n" "$(date +'%Y-%m-%d %H:%M:%S')" "$1"
}

# --- INPUT ARGUMENTS ---
REPO_URL=$1           # Git repo URL
BRANCH_NAME=$2        # Branch name
APP_NAME=$3           # App name (e.g., myapp)
DOCKER_USERNAME=${docker_username:-$DOCKER_USERNAME}
DOCKER_PASSWORD=${docker_password:-$DOCKER_PASSWORD}
IMAGE_TAG=$4          # e.g., v1.0.0 or latest
JDK_VERSION=$5        # e.g., 17, 21

# --- VALIDATE INPUT ---
if [ $# -lt 5 ]; then
  log "Usage: $0 <git-repo-url> <branch-name> <app-name> <image-tag> <jdk-version>"
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
  rm -rf "$CLONE_DIR" || { log "Failed to clean up existing clone directory"; exit 1; }
fi

git clone --branch "$BRANCH_NAME" "$REPO_URL" "$CLONE_DIR" || { log "Failed to clone repository"; exit 1; }

if [ ! -d "$CLONE_DIR" ]; then
  log "Clone directory does not exist"
  exit 1
fi

# --- DETECT build.gradle or build.gradle.kts ---
BUILD_FILE=$(find "$CLONE_DIR" -maxdepth 3 -type f \( -name "build.gradle" -o -name "build.gradle.kts" \) | head -1)
if [ -z "$BUILD_FILE" ]; then
  log "No Gradle build file (build.gradle or build.gradle.kts) found in repository"
  exit 1
fi
BUILD_DIR=$(dirname "$BUILD_FILE")
log "Detected Gradle project in: $BUILD_DIR"

cat > "$CLONE_DIR/Dockerfile" <<EOF
# Build stage
ARG JDK_VERSION
FROM gradle:8.4-jdk\${JDK_VERSION} AS build
WORKDIR /src
COPY . .

RUN java -version && javac -version
RUN gradle build -x test --no-daemon

RUN bash -c "\
  echo '>>> Listing build/libs contents:' && \
  ls -lh build/libs && \
  JAR_FILE=\\\$(find build/libs -type f \\\( -name '*-runner.jar' -o -name '*-all.jar' -o -name '*.jar' \\\) ! -name '*-native.jar' | head -1) && \
  echo '>>> Using JAR:' \\\$JAR_FILE && \
  [ -n \"\\\$JAR_FILE\" ] || { echo 'No JAR file found'; exit 1; } && \
  cp \"\\\$JAR_FILE\" /src/app.jar"


# Runtime stage
FROM eclipse-temurin:\${JDK_VERSION}-jre
WORKDIR /app
COPY --from=build /src/app.jar /app/app.jar
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
EOF


# --- BUILD DOCKER IMAGE ---
log "Building Docker image: $IMAGE_NAME ..."
docker build --build-arg JDK_VERSION="$JDK_VERSION" -t "$IMAGE_NAME" "$CLONE_DIR" || { log "Failed to build Docker image"; exit 1; }

# --- PUSH TO DOCKER HUB ---
log "Logging into Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin || { log "Docker login failed"; exit 1; }

log "Pushing image to Docker Hub..."
docker push "$IMAGE_NAME" || { log "Failed to push image"; exit 1; }

log "Done! Docker image pushed: $IMAGE_NAME"