#!/bin/bash
set -euo pipefail

# ============================================================
# Gradle Build Script — with persistent dep cache & fast re-runs
# ============================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()    { echo -e "${CYAN}[$(date '+%H:%M:%S')]${RESET} $*"; }
ok()     { echo -e "${GREEN}✔${RESET}  $*"; }
warn()   { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()  { echo -e "${RED}✘${RESET}  $*" >&2; }
banner() { echo -e "\n${BOLD}${CYAN}=== $* ===${RESET}\n"; }

# ============================================================
# INPUTS
# arg1: project path   (required)
# arg2: app name       (required)
# arg3: java version   (required — passed by checkBuild.js)
# arg4: gradle version (optional — defaults to 8.10.2)
# ============================================================
PROJECT_PATH=${1:-.}
APP_NAME=${2:-app}
JDK_VERSION=${3:-17}
GRADLE_VERSION=${4:-8.10.2}
DOCKER_IMAGE="gradle:${GRADLE_VERSION}-jdk${JDK_VERSION}"

# ── Cache directories under $HOME/tmp ────────────────────────
# $HOME resolves to the hosting user's home (e.g.
# /var/www/vhosts/devninja.ai2dev.com) — NOT system /tmp.
#
# HOST paths (outside container):
#   GRADLE_CACHE_DIR  — downloaded jars, shared by all projects, never deleted
#   BUILD_CACHE_DIR   — compiled task outputs, per app name, never deleted
#   INIT_DIR          — Gradle init scripts, written on host, mounted read-only
#
# CONTAINER paths (inside Docker, always writable — using /tmp
# which every user can write to regardless of ownership):
#   /tmp/gradle-home  — GRADLE_USER_HOME inside container
#   /tmp/build-cache  — build cache inside container
#   /tmp/gradle-init  — init scripts copied here on container start
BASE_TMP="$HOME/tmp"
GRADLE_CACHE_DIR="$BASE_TMP/gradle-cache"
BUILD_CACHE_DIR="$BASE_TMP/gradle-build-cache/${APP_NAME}"
INIT_DIR="$BASE_TMP/gradle-init.d"

mkdir -p "$GRADLE_CACHE_DIR" "$BUILD_CACHE_DIR" "$INIT_DIR"
chmod 777 "$GRADLE_CACHE_DIR" "$BUILD_CACHE_DIR" "$INIT_DIR"

# Write the build-cache init script on the HOST before Docker
# starts — container never needs to mkdir inside a mounted volume
cat > "$INIT_DIR/build-cache.gradle" << 'INITEOF'
gradle.settingsEvaluated { settings ->
    settings.buildCache {
        local {
            directory = new File("/tmp/build-cache")
            enabled   = true
            push      = true
        }
    }
}
INITEOF

# Track whether the script completed successfully.
# Using an explicit flag rather than $? in the trap because
# $? inside a trap reflects the last cleanup command, not the
# actual build outcome — causing false "exit code 1" reports.
SCRIPT_SUCCESS=false

# ============================================================
# DEBUG FUNCTION
# ============================================================
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
    if echo "$f" | grep -P '[^\x20-\x7E]' >/dev/null 2>&1; then
      echo "Invalid: [$f]"
    fi
  done
  echo "===================================="
}

# ============================================================
# PRINT BUILD ERRORS
# Reads from a variable (not a file) — no separate log file.
# Prints parsed sections directly to stdout so checkBuild.js
# captures everything via child.stdout handler.
# ============================================================
print_build_errors() {
  local output="$1"

  if [[ -z "$output" ]]; then
    error "No build output captured — Docker may have failed to start."
    return
  fi

  echo ""
  echo -e "${RED}${BOLD}============================================================${RESET}"
  echo -e "${RED}${BOLD}  BUILD ERROR SUMMARY${RESET}"
  echo -e "${RED}${BOLD}============================================================${RESET}"

  # ── Section 1: Gradle "What went wrong" block ──────────────
  local in_block=false
  local in_try=false
  while IFS= read -r line; do
    if echo "$line" | grep -q "What went wrong";  then in_block=true; in_try=false; fi
    if echo "$line" | grep -q "^\* Try:";         then in_try=true;               fi
    if $in_block && ! $in_try; then echo -e "${RED}$line${RESET}"; fi
    if echo "$line" | grep -q "BUILD FAILED";     then in_block=false; in_try=false; fi
  done <<< "$output"

  # ── Section 2: Java / Kotlin compiler errors ───────────────
  local compiler_errors
  compiler_errors=$(echo "$output" | grep -E \
    "\.java:[0-9]+: error:|\.kt:[0-9]+: error:|^error: |\s+error: |symbol\s*:|location\s*:" \
    2>/dev/null || true)
  if [[ -n "$compiler_errors" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── Compiler errors ─────────────────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$compiler_errors"
  fi

  # ── Section 3: Exceptions / stack traces ───────────────────
  local exceptions
  exceptions=$(echo "$output" | grep -E \
    "^(Caused by:|Exception in thread|.+Exception: |.+Error: )|\s+at .+\(.+\)" \
    2>/dev/null | head -30 || true)
  if [[ -n "$exceptions" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── Exceptions / stack trace (first 30 lines) ───────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$exceptions"
  fi

  # ── Section 4: Failed tasks ────────────────────────────────
  local failed_tasks
  failed_tasks=$(echo "$output" | grep -E \
    "> Task .+ FAILED|^FAILURE:|Execution failed for task" \
    2>/dev/null || true)
  if [[ -n "$failed_tasks" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── Failed tasks ─────────────────────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$failed_tasks"
  fi

  # ── Section 5: Permission / setup errors ──────────────────
  local perm_errors
  perm_errors=$(echo "$output" | grep -E \
    "Permission denied|cannot create directory|mkdir:|tee:" \
    2>/dev/null || true)
  if [[ -n "$perm_errors" ]]; then
    echo ""
    echo -e "${RED}${BOLD}── Permission / setup errors ────────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${RED}  $line${RESET}"; done <<< "$perm_errors"
  fi

  echo -e "${RED}${BOLD}============================================================${RESET}"
  echo ""
}

# ============================================================
# CLEANUP
# Only removes workspace build artefacts.
# Does NOT touch:
#   $HOME/tmp/gradle-cache        — shared dep cache (all projects)
#   $HOME/tmp/gradle-build-cache  — per-app build cache
#   $HOME/tmp/gradle-init.d       — init scripts
# ============================================================
cleanup() {
  log "Cleaning up workspace..."
  debug_files
  rm -rf build 2>/dev/null || true
  find . -maxdepth 1 -type d \
    ! -name "." ! -name "src" ! -name ".git" \
    ! -name ".github" ! -name ".idea" ! -name ".gradle-cache" \
    -exec rm -rf {} + 2>/dev/null || true

  if [[ "$SCRIPT_SUCCESS" != "true" ]]; then
    error "Build FAILED — see error summary above."
    exit 1
  fi

  ok "Workspace cleaned. Caches preserved:"
  ok "  Dep cache  : $GRADLE_CACHE_DIR"
  ok "  Build cache: $BUILD_CACHE_DIR"
}
trap cleanup EXIT

# ============================================================
# BANNER
# ============================================================
banner "Gradle Build"
log "Project Path      : $PROJECT_PATH"
log "App Name          : $APP_NAME"
log "JDK Version       : $JDK_VERSION"
log "Gradle Version    : $GRADLE_VERSION"
log "Docker Image      : $DOCKER_IMAGE"
log "Base tmp dir      : $BASE_TMP"
log "Gradle cache      : $GRADLE_CACHE_DIR  (shared, not cleaned)"
log "Build cache       : $BUILD_CACHE_DIR  (per-app, not cleaned)"
log "Init scripts      : $INIT_DIR"

# ============================================================
# VALIDATIONS
# ============================================================
banner "Validating environment"

if [ ! -d "$PROJECT_PATH" ]; then
  error "Project path not found: $PROJECT_PATH"; exit 1
fi

cd "$PROJECT_PATH"

if [ ! -f "build.gradle" ] && [ ! -f "build.gradle.kts" ]; then
  error "No Gradle build file found in $PROJECT_PATH"; exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed"; exit 1
fi

if ! docker info >/dev/null 2>&1; then
  error "Docker is not running"; exit 1
fi

ok "Environment validated"

# ============================================================
# CACHE WARM-UP CHECK
# || true guards prevent set -e from triggering on empty dirs.
# tr -d strips newlines from wc -l output (fixes "error token
# is 0\n0" expression failure seen in previous runs).
# ============================================================
banner "Cache status"

CACHED_JARS=0
CACHED_JARS=$(find "$GRADLE_CACHE_DIR/caches" -name "*.jar" 2>/dev/null | wc -l | tr -d '[:space:]') || true
CACHED_JARS="${CACHED_JARS:-0}"
if [[ "$CACHED_JARS" -gt 50 ]]; then
  ok "Gradle dep cache WARM (~${CACHED_JARS} jars) — deps will not be re-downloaded"
else
  warn "Gradle dep cache COLD (${CACHED_JARS} jars) — first run will download dependencies"
fi

BUILD_CACHE_ENTRIES=0
BUILD_CACHE_ENTRIES=$(find "$BUILD_CACHE_DIR" -name "*.tar" 2>/dev/null | wc -l | tr -d '[:space:]') || true
BUILD_CACHE_ENTRIES="${BUILD_CACHE_ENTRIES:-0}"
if [[ "$BUILD_CACHE_ENTRIES" -gt 0 ]]; then
  ok "Build cache WARM (~${BUILD_CACHE_ENTRIES} entries) — unchanged tasks will be UP-TO-DATE"
else
  warn "Build cache COLD — all tasks will run on first build"
fi

# ============================================================
# DEBUG BEFORE BUILD
# ============================================================
echo "==== BEFORE DOCKER ===="
debug_files

# ============================================================
# DOCKER BUILD
#
# Container path strategy — everything under /tmp inside the
# container which is always writable by any user (no ownership
# issues regardless of which uid runs the container):
#
#   /tmp/gradle-home   ← GRADLE_USER_HOME (replaces /home/gradle/.gradle)
#   /tmp/build-cache   ← Gradle build cache
#   /tmp/gradle-init   ← init scripts (copied from mount on startup)
#
# HOST → CONTAINER volume mounts:
#   $GRADLE_CACHE_DIR  → /tmp/gradle-home   (dep cache, persisted on host)
#   $BUILD_CACHE_DIR   → /tmp/build-cache   (build cache, persisted on host)
#   $INIT_DIR          → /tmp/gradle-init   (init scripts, read-only)
#   $(pwd)             → /workspace         (source code)
#
# NO tee /dev/stderr — not available in this hosting environment.
# Output goes directly to stdout, captured by checkBuild.js
# child.stdout handler and accumulated in buildOutput.
#
# Speed:
#   1. Dep cache   — jars persist in $HOME/tmp/gradle-cache
#   2. Build cache — task outputs persist per app
#   3. Init script — written on host, mounted into container
#   4. Daemon      — enabled (safe in container, saves ~6s cold fork)
#   5. --parallel  — compiles independent modules concurrently
#   6. --build-cache / --configuration-cache
#   7. GRADLE_OPTS — heap pre-set, avoids JVM resize mid-build
# ============================================================
banner "Running Gradle build inside Docker"

BUILD_EXIT_CODE=0
BUILD_OUTPUT=""

BUILD_OUTPUT=$(
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e LANG=C.UTF-8 \
    -e LC_ALL=C.UTF-8 \
    -e JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8 -Duser.language=en -Duser.country=US" \
    -e GRADLE_USER_HOME=/tmp/gradle-home \
    -e GRADLE_OPTS="-Xmx1g -Xms512m -Dfile.encoding=UTF-8" \
    -v "$GRADLE_CACHE_DIR":/tmp/gradle-home \
    -v "$BUILD_CACHE_DIR":/tmp/build-cache \
    -v "$INIT_DIR":/tmp/gradle-init:ro \
    -v "$(pwd)":/workspace \
    -w /workspace \
    "$DOCKER_IMAGE" \
    bash -c '
      set -e

      # /tmp is always writable — create init.d under GRADLE_USER_HOME
      mkdir -p "$GRADLE_USER_HOME/init.d"

      # Copy host-prepared init scripts into Gradle init.d so Gradle
      # picks them up automatically (no --init-script flag needed)
      cp /tmp/gradle-init/*.gradle "$GRADLE_USER_HOME/init.d/" 2>/dev/null || true

      if [ -f "./gradlew" ]; then
        chmod +x ./gradlew
        GRADLE_CMD="./gradlew"
      else
        GRADLE_CMD="gradle"
      fi

      echo "[$(date +%H:%M:%S)] Starting Gradle build..."
      echo "Gradle command    : $GRADLE_CMD"
      echo "GRADLE_USER_HOME  : $GRADLE_USER_HOME"
      echo "Build cache       : /tmp/build-cache"

      $GRADLE_CMD build -x test \
        --parallel \
        --build-cache \
        --configuration-cache \
        2>&1
    ' 2>&1
) || BUILD_EXIT_CODE=$?

# Echo the captured output so checkBuild.js child.stdout sees it
echo "$BUILD_OUTPUT"

# ============================================================
# On failure — print parsed error summary then exit
# ============================================================
if [[ "$BUILD_EXIT_CODE" -ne 0 ]]; then
  echo "==== AFTER DOCKER (build failed) ===="
  debug_files
  print_build_errors "$BUILD_OUTPUT"
  exit "$BUILD_EXIT_CODE"
fi
# ============================================================
# DEBUG AFTER SUCCESSFUL BUILD
# ============================================================
echo "==== AFTER DOCKER ===="
debug_files

# Mark success BEFORE the trap fires
SCRIPT_SUCCESS=true

echo "----------------------------------"
echo "BUILD SUCCESSFUL (with cache)"
echo "----------------------------------"