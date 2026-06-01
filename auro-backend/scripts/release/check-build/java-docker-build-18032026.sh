#!/bin/bash
set -euo pipefail

# -------------------------------
# DEBUG FUNCTION (PROOF BLOCK)
# -------------------------------
debug_files() {
  echo "========== DEBUG FILE VIEW =========="

  echo "--- ls -la ---"
  ls -la || true

  echo "--- ls -lb (escaped names) ---"
  ls -lb || true

  echo "--- cat -v (non-printable chars) ---"
  ls | cat -v || true

  echo "--- HEX DUMP (real bytes) ---"
  ls | while read -r f; do
    echo "FILE: [$f]"
    echo "$f" | od -An -t x1
  done

  echo "--- INVALID FILENAMES DETECTED ---"
  find . -maxdepth 1 | while read -r f; do
    if echo "$f" | grep -P '[^\x20-\x7E]' >/dev/null; then
      echo "Invalid: [$f]"
    fi
  done

  echo "===================================="
}

# -------------------------------
# Cleanup (runs ALWAYS)
# -------------------------------
cleanup() {
  echo "Cleaning up..."

  debug_files

  # Remove build artifacts only
  rm -rf build

  # Remove weird dirs (keep important ones + cache)
  find . -maxdepth 1 -type d ! -name "." ! -name "src" ! -name ".git" \
    ! -name ".github" ! -name ".idea" ! -name ".gradle-cache" \
    -exec rm -rf {} + 2>/dev/null || true
}
trap cleanup EXIT

# -------------------------------
# INPUTS
# -------------------------------
PROJECT_PATH=${1:-.}
APP_NAME=${2:-app}
JDK_VERSION=${3:-17}
GRADLE_VERSION=${4:-8.10.2}
DOCKER_IMAGE="gradle:${GRADLE_VERSION}-jdk${JDK_VERSION}"

echo "----------------------------------"
echo "Project Path : $PROJECT_PATH"
echo "App Name     : $APP_NAME"
echo "JDK Version  : $JDK_VERSION"
echo "Gradle Ver   : $GRADLE_VERSION"
echo "Docker Image : $DOCKER_IMAGE"
echo "----------------------------------"

# -------------------------------
# VALIDATIONS
# -------------------------------
if [ ! -d "$PROJECT_PATH" ]; then
  echo "Project path not found: $PROJECT_PATH"
  exit 1
fi

cd "$PROJECT_PATH"

if [ ! -f "build.gradle" ] && [ ! -f "build.gradle.kts" ]; then
  echo "No Gradle build file found"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not installed"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker not running"
  exit 1
fi

# -------------------------------
# DEBUG BEFORE
# -------------------------------
echo "==== BEFORE DOCKER ===="
debug_files

echo "Running Gradle build inside container with cache..."

# -------------------------------
# DOCKER BUILD WITH CACHE
# -------------------------------
docker run --rm \
  --user $(id -u):$(id -g) \
  -e LANG=C.UTF-8 \
  -e LC_ALL=C.UTF-8 \
  -e JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8 -Duser.language=en -Duser.country=US" \
  -e GRADLE_USER_HOME=/home/gradle/.gradle \
  -v "$HOME/.gradle":/home/gradle/.gradle \
  -v "$(pwd)":/workspace \
  -w /workspace \
  "$DOCKER_IMAGE" \
  bash -c "
    set -e
    gradle build -x test --no-daemon
  "

# -------------------------------
# DEBUG AFTER
# -------------------------------
echo "==== AFTER DOCKER ===="
debug_files

echo "----------------------------------"
echo "BUILD SUCCESSFUL (with cache)"
echo "----------------------------------"