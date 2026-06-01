#!/bin/bash
set -euo pipefail

# ============================================================
# Spring Boot Build Script — Gradle Kotlin DSL
# Aligned with generateSpringBootProject.js
#
# Spring Boot version matrix (mirrors JS exactly):
#   Java >= 21  →  Spring Boot 4.0.3   (Docker: gradle:X-jdk21)
#   Java <  21  →  Spring Boot 3.5.9   (Docker: gradle:X-jdk17)
#
# Style → Gradle task mapping:
#   api        →  bootJar     (Spring Boot fat JAR, BOOT-INF layout)
#   lambda     →  shadowJar   (shadow plugin fat JAR, bootJar disabled)
#   scheduler  →  jar         (plain JAR, no embedded server)
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
# arg1: project path    (required)
# arg2: app name        (required)
# arg3: java version    (required — 17 or 21, passed by checkBuild.js)
# arg4: gradle version  (optional — defaults to 8.10.2)
# arg5: style           (optional — api | lambda | scheduler, default api)
# ============================================================
PROJECT_PATH=${1:-.}
APP_NAME=${2:-app}
JDK_VERSION=${3:-17}
GRADLE_VERSION=${4:-8.10.2}
STYLE=${5:-api}

# ── Spring Boot version matrix (mirrors JS SPRING_BOOT_VERSION fn) ──
if [[ "$JDK_VERSION" -ge 21 ]]; then
  SPRING_BOOT_VERSION="4.0.3"
else
  SPRING_BOOT_VERSION="3.5.9"
fi

DOCKER_IMAGE="gradle:${GRADLE_VERSION}-jdk${JDK_VERSION}"

# ── Gradle task per style ────────────────────────────────────
# api       → bootJar   (spring-boot repackaged fat JAR)
# lambda    → shadowJar (shadow plugin fat JAR, bootJar disabled in build)
# scheduler → jar       (plain JAR, no embedded server needed)
case "$STYLE" in
  api)       GRADLE_TASK="bootJar"   ;;
  lambda)    GRADLE_TASK="shadowJar" ;;
  scheduler) GRADLE_TASK="jar"       ;;
  *)
    error "Unknown style: '$STYLE'. Supported: api | lambda | scheduler"
    exit 1
    ;;
esac

# ── Cache directories under $HOME/tmp ────────────────────────
# HOST paths:
#   GRADLE_CACHE_DIR  — downloaded jars, shared by all projects, never deleted
#   BUILD_CACHE_DIR   — compiled task outputs, per app name, never deleted
#   INIT_DIR          — Gradle init scripts, written on host, mounted ro
#
# CONTAINER paths (always /tmp — writable by any uid):
#   /tmp/gradle-home  — GRADLE_USER_HOME
#   /tmp/build-cache  — Gradle build cache
#   /tmp/gradle-init  — init scripts
BASE_TMP="$HOME/tmp"
GRADLE_CACHE_DIR="$BASE_TMP/gradle-cache"
BUILD_CACHE_DIR="$BASE_TMP/gradle-build-cache/${APP_NAME}"
INIT_DIR="$BASE_TMP/gradle-init.d"

mkdir -p "$GRADLE_CACHE_DIR" "$BUILD_CACHE_DIR" "$INIT_DIR"
chmod 777 "$GRADLE_CACHE_DIR" "$BUILD_CACHE_DIR" "$INIT_DIR"

# ── Gradle build-cache init script (host-side) ───────────────
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

# ── Success flag ─────────────────────────────────────────────
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
# PRINT BUILD ERRORS — Spring Boot + style-aware
#
# Covers all failure modes seen in generateSpringBootProject.js:
#   - Gradle "What went wrong" + failed tasks
#   - Java / Kotlin compiler errors
#   - Spring context startup / bean wiring failures
#   - Lambda handler init (ContainerInitializationException)
#   - Scheduler @EnableScheduling / @Scheduled errors
#   - Shadow plugin merge conflicts
#   - Exceptions / stack traces
#   - Permission / setup errors
# ============================================================
print_build_errors() {
  local output="$1"
  local style="$2"

  if [[ -z "$output" ]]; then
    error "No build output captured — Docker may have failed to start."
    return
  fi

  echo ""
  echo -e "${RED}${BOLD}============================================================${RESET}"
  echo -e "${RED}${BOLD}  BUILD ERROR SUMMARY  [Spring Boot ${SPRING_BOOT_VERSION} / ${style^^}]${RESET}"
  echo -e "${RED}${BOLD}============================================================${RESET}"

  # ── Gradle: "What went wrong" block ──────────────────────
  local in_block=false
  local in_try=false
  while IFS= read -r line; do
    if echo "$line" | grep -q "What went wrong";  then in_block=true; in_try=false; fi
    if echo "$line" | grep -q "^\* Try:";         then in_try=true;               fi
    if $in_block && ! $in_try; then echo -e "${RED}$line${RESET}"; fi
    if echo "$line" | grep -q "BUILD FAILED";     then in_block=false; in_try=false; fi
  done <<< "$output"

  # ── Gradle: failed tasks ──────────────────────────────────
  local failed_tasks
  failed_tasks=$(echo "$output" | grep -E \
    "> Task .+ FAILED|^FAILURE:|Execution failed for task" \
    2>/dev/null || true)
  if [[ -n "$failed_tasks" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── Failed Gradle tasks ──────────────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$failed_tasks"
  fi

  # ── Java / Kotlin compiler errors ─────────────────────────
  local compiler_errors
  compiler_errors=$(echo "$output" | grep -E \
    "\.java:[0-9]+: error:|\.kt:[0-9]+: error:|^error: |\s+error: |symbol\s*:|location\s*:|cannot find symbol|incompatible types|package .+ does not exist" \
    2>/dev/null || true)
  if [[ -n "$compiler_errors" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── Java / Kotlin compiler errors ────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$compiler_errors"
  fi

  # ── Spring Boot context / bean wiring errors ──────────────
  local spring_errors
  spring_errors=$(echo "$output" | grep -E \
    "APPLICATION FAILED TO START|Consider defining a bean|required a bean|No qualifying bean|Unsatisfied dependency|Could not autowire|BeanCreationException|UnsatisfiedDependencyException|NoSuchBeanDefinitionException|Failed to configure a DataSource|spring\.datasource|Parameter [0-9]+ of constructor" \
    2>/dev/null || true)
  if [[ -n "$spring_errors" ]]; then
    echo ""
    echo -e "${RED}${BOLD}── Spring Boot context / bean wiring errors ─────────────${RESET}"
    while IFS= read -r line; do echo -e "${RED}  $line${RESET}"; done <<< "$spring_errors"
  fi

  # ── Lambda-specific errors ────────────────────────────────
  if [[ "$style" == "lambda" ]]; then
    local lambda_errors
    lambda_errors=$(echo "$output" | grep -E \
      "ContainerInitializationException|SpringBootLambdaContainerHandler|RequestStreamHandler|AnnotationConfigApplicationContext cannot be cast|ClassCastException.*ApplicationContext|WebApplicationType" \
      2>/dev/null || true)
    if [[ -n "$lambda_errors" ]]; then
      echo ""
      echo -e "${RED}${BOLD}── Lambda handler / container init errors ───────────────${RESET}"
      while IFS= read -r line; do echo -e "${RED}  $line${RESET}"; done <<< "$lambda_errors"
    fi

    local shadow_errors
    shadow_errors=$(echo "$output" | grep -E \
      "shadowJar|mergeServiceFiles|DuplicatesStrategy|AutoConfiguration\.imports|spring\.factories" \
      2>/dev/null || true)
    if [[ -n "$shadow_errors" ]]; then
      echo ""
      echo -e "${YELLOW}${BOLD}── Shadow plugin / service file merge errors ────────────${RESET}"
      while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$shadow_errors"
    fi
  fi

  # ── Scheduler-specific errors ─────────────────────────────
  if [[ "$style" == "scheduler" ]]; then
    local sched_errors
    sched_errors=$(echo "$output" | grep -E \
      "EnableScheduling|@Scheduled|ScheduledAnnotationBeanPostProcessor|cron expression|fixedRate|fixedDelay" \
      2>/dev/null || true)
    if [[ -n "$sched_errors" ]]; then
      echo ""
      echo -e "${YELLOW}${BOLD}── Scheduler config errors ──────────────────────────────${RESET}"
      while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$sched_errors"
    fi
  fi

  # ── Exceptions / stack traces ─────────────────────────────
  local exceptions
  exceptions=$(echo "$output" | grep -E \
    "^(Caused by:|Exception in thread|.+Exception: |.+Error: )|\s+at .+\(.+\)" \
    2>/dev/null | head -40 || true)
  if [[ -n "$exceptions" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── Exceptions / stack trace (first 40 lines) ───────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$exceptions"
  fi

  # ── Permission / setup errors ─────────────────────────────
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
# Only workspace build artefacts — caches never touched.
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
banner "Spring Boot Build"
log "Project Path      : $PROJECT_PATH"
log "App Name          : $APP_NAME"
log "JDK Version       : $JDK_VERSION"
log "Spring Boot Ver   : $SPRING_BOOT_VERSION  (Java >= 21 → 4.0.3, else 3.5.9)"
log "Style             : $STYLE"
log "Gradle Task       : $GRADLE_TASK"
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

# Gradle Kotlin DSL is the only build system (all three styles in JS)
if [ ! -f "build.gradle.kts" ] && [ ! -f "build.gradle" ]; then
  error "No Gradle build file found in $PROJECT_PATH"
  error "Expected build.gradle.kts (Kotlin DSL) — as generated by generateSpringBootProject.js"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed"; exit 1
fi

if ! docker info >/dev/null 2>&1; then
  error "Docker is not running"; exit 1
fi

# ── Pre-flight style/build.gradle.kts consistency checks ─────
# Catch LLM omissions before wasting a Docker run.
if [[ "$STYLE" == "lambda" ]]; then
  if ! grep -q "com.gradleup.shadow\|shadowJar" build.gradle.kts 2>/dev/null; then
    warn "style=lambda but shadow plugin not found in build.gradle.kts — LLM may have omitted it"
  fi
fi
if [[ "$STYLE" == "api" ]]; then
  if ! grep -q "spring-boot-starter-web\|bootJar" build.gradle.kts 2>/dev/null; then
    warn "style=api but bootJar / starter-web not found in build.gradle.kts"
  fi
fi
if [[ "$STYLE" == "scheduler" ]]; then
  if grep -q "spring-boot-starter-web" build.gradle.kts 2>/dev/null; then
    warn "style=scheduler but spring-boot-starter-web found — should use spring-boot-starter only"
  fi
fi

ok "Environment validated — Spring Boot ${SPRING_BOOT_VERSION} / ${STYLE^^} / JDK ${JDK_VERSION}"

# ============================================================
# CACHE WARM-UP CHECK
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
# --configuration-cache is intentionally skipped for lambda/shadowJar.
# Shadow plugin 8.3.9 does not support configuration cache and will
# error with "configuration cache is not supported" if passed.
# bootJar (api) and jar (scheduler) both support it fine.
# ============================================================
banner "Running Spring Boot ${STYLE^^} build inside Docker"

BUILD_EXIT_CODE=0
BUILD_OUTPUT=""

if [[ "$STYLE" == "lambda" ]]; then
  EXTRA_FLAGS="--parallel --build-cache"
else
  EXTRA_FLAGS="--parallel --build-cache --configuration-cache"
fi

BUILD_OUTPUT=$(
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e LANG=C.UTF-8 \
    -e LC_ALL=C.UTF-8 \
    -e JAVA_TOOL_OPTIONS="-Dfile.encoding=UTF-8 -Duser.language=en -Duser.country=US" \
    -e GRADLE_USER_HOME=/tmp/gradle-home \
    -e GRADLE_OPTS="-Xmx1g -Xms512m -Dfile.encoding=UTF-8" \
    -e GRADLE_TASK="$GRADLE_TASK" \
    -e EXTRA_FLAGS="$EXTRA_FLAGS" \
    -v "$GRADLE_CACHE_DIR":/tmp/gradle-home \
    -v "$BUILD_CACHE_DIR":/tmp/build-cache \
    -v "$INIT_DIR":/tmp/gradle-init:ro \
    -v "$(pwd)":/workspace \
    -w /workspace \
    "$DOCKER_IMAGE" \
    bash -c '
      set -e

      mkdir -p "$GRADLE_USER_HOME/init.d"
      cp /tmp/gradle-init/*.gradle "$GRADLE_USER_HOME/init.d/" 2>/dev/null || true

      if [ -f "./gradlew" ]; then
        chmod +x ./gradlew
        GRADLE_CMD="./gradlew"
      else
        GRADLE_CMD="gradle"
      fi

      echo "[$(date +%H:%M:%S)] Starting Spring Boot build..."
      echo "Gradle command    : $GRADLE_CMD"
      echo "Gradle task       : $GRADLE_TASK"
      echo "Extra flags       : $EXTRA_FLAGS"
      echo "GRADLE_USER_HOME  : $GRADLE_USER_HOME"
      echo "Build cache       : /tmp/build-cache"

      $GRADLE_CMD $GRADLE_TASK -x test $EXTRA_FLAGS 2>&1
    ' 2>&1
) || BUILD_EXIT_CODE=$?

# Echo captured output so checkBuild.js child.stdout sees it
echo "$BUILD_OUTPUT"

# ============================================================
# FAILURE PATH
# ============================================================
if [[ "$BUILD_EXIT_CODE" -ne 0 ]]; then
  echo "==== AFTER DOCKER (build failed) ===="
  debug_files
  print_build_errors "$BUILD_OUTPUT" "$STYLE"
  exit "$BUILD_EXIT_CODE"
fi

# ============================================================
# VERIFY JAR WAS PRODUCED
#
# api       → build/libs/app-0.0.1-SNAPSHOT.jar         (fat, BOOT-INF)
#             Gradle also emits app-0.0.1-SNAPSHOT-plain.jar — skip it
# lambda    → build/libs/app-0.0.1-SNAPSHOT.jar         (shadow fat JAR,
#             archiveClassifier="" so only one file)
# scheduler → build/libs/app-0.0.1-SNAPSHOT.jar         (plain thin JAR,
#             bootJar disabled in build.gradle.kts)
# ============================================================
banner "Verifying output JAR"

JAR_PATH=""
case "$STYLE" in
  api)
    JAR_PATH=$(find build/libs -name "*.jar" ! -name "*-plain.jar" 2>/dev/null | head -1 || true)
    ;;
  lambda)
    # shadowJar with archiveClassifier="" produces only one JAR
    JAR_PATH=$(find build/libs -name "*.jar" 2>/dev/null | head -1 || true)
    ;;
  scheduler)
    JAR_PATH=$(find build/libs -name "*.jar" ! -name "*-plain.jar" 2>/dev/null | head -1 || true)
    ;;
esac

if [[ -z "$JAR_PATH" ]]; then
  error "Build reported success but no JAR found in build/libs/ — check ${GRADLE_TASK} task config."
  exit 1
fi

JAR_SIZE=$(du -h "$JAR_PATH" 2>/dev/null | cut -f1 || echo "unknown")
ok "JAR produced: $JAR_PATH ($JAR_SIZE)"

# ── Style-specific JAR sanity checks ─────────────────────────
case "$STYLE" in
  api)
    if unzip -l "$JAR_PATH" 2>/dev/null | grep -q "BOOT-INF/"; then
      ok "JAR valid — BOOT-INF/ present (Spring Boot ${SPRING_BOOT_VERSION} repackaged)"
    else
      warn "BOOT-INF/ not found — bootJar may not have run. Check spring-boot-gradle-plugin config."
    fi
    ;;
  lambda)
    if unzip -l "$JAR_PATH" 2>/dev/null | grep -q "LambdaHandler.class"; then
      ok "JAR valid — LambdaHandler.class found inside shadow JAR"
    else
      warn "LambdaHandler.class not found — handler class may be missing or mispackaged"
    fi
    if unzip -l "$JAR_PATH" 2>/dev/null | grep -q "AutoConfiguration.imports"; then
      ok "AutoConfiguration.imports merged — mergeServiceFiles() working correctly"
    else
      warn "AutoConfiguration.imports not found — mergeServiceFiles() in shadowJar task may be missing"
    fi
    ;;
  scheduler)
    if unzip -l "$JAR_PATH" 2>/dev/null | grep -q "BOOT-INF/"; then
      warn "BOOT-INF/ found in scheduler JAR — bootJar may still be enabled. Check build.gradle.kts."
    else
      ok "JAR valid — plain thin JAR (no BOOT-INF, correct for scheduler style)"
    fi
    ;;
esac

# ============================================================
# DEBUG AFTER SUCCESSFUL BUILD
# ============================================================
echo "==== AFTER DOCKER ===="
debug_files

SCRIPT_SUCCESS=true

echo "----------------------------------"
echo "BUILD SUCCESSFUL"
echo "Spring Boot  : ${SPRING_BOOT_VERSION}"
echo "Style        : ${STYLE^^}"
echo "Gradle task  : ${GRADLE_TASK}"
echo "JDK          : ${JDK_VERSION}"
echo "JAR          : ${JAR_PATH}"
echo "----------------------------------"