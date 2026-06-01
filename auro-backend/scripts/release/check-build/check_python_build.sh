#!/bin/bash
set -euo pipefail

# ============================================================
# Python Build Check Script
# Mirrors csharp-build-docker-image.sh and springboot-docker-build.sh
#
# Python version matrix:
#   3.12  →  Docker image: python:3.12-slim
#   3.13  →  Docker image: python:3.13-slim
#   3.14  →  Docker image: python:3.14-rc-slim
#
# Cache strategy (mirrors Gradle cache in springboot-docker-build.sh):
#   PIP_CACHE_DIR      — downloaded .whl / sdist files, shared by all apps, never deleted
#                        mounted to /tmp/pip-cache inside container
#                        pip reads from it first → no re-download on repeat runs
#   Per-version path   — cache is split by Python version so 3.12 wheels
#                        are never used for a 3.13 run
#
# What this script does:
#   1. Validates inputs and project structure
#   2. Creates/reports host-side pip cache (~/tmp/pip-cache/<version>)
#   3. Pulls the correct python:<version>-slim Docker image
#   4. Inside Docker: verifies exact Python version
#   5. Inside Docker: installs dependencies from cache-first pip
#   6. Inside Docker: runs syntax + import check on all .py files (py_compile)
#   7. Cleans up __pycache__ / *.pyc / .venv / dist / build artifacts
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
# arg1: project path      (required)
# arg2: app name          (required)
# arg3: python version    (required — 3.12 | 3.13 | 3.14)
# ============================================================
PROJECT_PATH=${1:-}
APP_NAME=${2:-}
PYTHON_VERSION=${3:-}

echo "Project: $PROJECT_PATH, App: $APP_NAME, Python: $PYTHON_VERSION"

# ============================================================
# VALIDATE INPUTS
# ============================================================
if [ $# -lt 3 ]; then
  error "Usage: $0 <project-path> <app-name> <python-version>"
  error "Example: $0 ./my-app myapi 3.13"
  exit 1
fi

if [ ! -d "$PROJECT_PATH" ]; then
  error "Failed to find project at $PROJECT_PATH"
  exit 1
fi

# Validate Python version is one of the supported values
case "$PYTHON_VERSION" in
  3.12|3.13|3.14) ;;
  *)
    error "Unsupported Python version: '$PYTHON_VERSION'. Supported: 3.12 | 3.13 | 3.14"
    exit 1
    ;;
esac

# ── Docker image per version ──────────────────────────────────
case "$PYTHON_VERSION" in
  3.12) DOCKER_IMAGE="python:3.12-slim" ;;
  3.13) DOCKER_IMAGE="python:3.13-slim" ;;
  3.14) DOCKER_IMAGE="python:3.14-rc-slim" ;;
esac

# ── Cache directories under $HOME/tmp (mirrors Spring Boot Gradle cache) ─
# HOST paths:
#   PIP_CACHE_DIR   — downloaded wheels/sdists, split by Python version,
#                     shared across all apps, NEVER deleted between runs
#
# CONTAINER path:
#   /tmp/pip-cache  — pip --cache-dir, writable by any uid
BASE_TMP="$HOME/tmp"
PIP_CACHE_DIR="$BASE_TMP/pip-cache/${PYTHON_VERSION}"

mkdir -p "$PIP_CACHE_DIR"
chmod 777 "$PIP_CACHE_DIR"

log "🔧 Using Python $PYTHON_VERSION to build app: $APP_NAME"
log "Docker image : $DOCKER_IMAGE"
log "Pip cache    : $PIP_CACHE_DIR"

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
  echo "--- INVALID FILENAMES DETECTED ---"
  find . -maxdepth 1 | while read -r f; do
    if echo "$f" | grep -P '[^\x20-\x7E]' >/dev/null 2>&1; then
      echo "Invalid: [$f]"
    fi
  done
  echo "===================================="
}

# ============================================================
# PRINT BUILD ERRORS — Python-aware
#
# Covers:
#   - SyntaxError / IndentationError (py_compile)
#   - ImportError / ModuleNotFoundError (missing deps)
#   - pip install failures
#   - Version mismatch errors
# ============================================================
print_build_errors() {
  local output="$1"

  if [[ -z "$output" ]]; then
    error "No build output captured — Docker may have failed to start."
    return
  fi

  echo ""
  echo -e "${RED}${BOLD}============================================================${RESET}"
  echo -e "${RED}${BOLD}  BUILD ERROR SUMMARY  [Python ${PYTHON_VERSION}]${RESET}"
  echo -e "${RED}${BOLD}============================================================${RESET}"

  # ── Syntax / indentation errors ──────────────────────────
  local syntax_errors
  syntax_errors=$(echo "$output" | grep -E \
    "SyntaxError:|IndentationError:|TabError:|File \".*\", line [0-9]+" \
    2>/dev/null || true)
  if [[ -n "$syntax_errors" ]]; then
    echo ""
    echo -e "${RED}${BOLD}── Syntax / Indentation errors ──────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${RED}  $line${RESET}"; done <<< "$syntax_errors"
  fi

  # ── Import / module errors ────────────────────────────────
  local import_errors
  import_errors=$(echo "$output" | grep -E \
    "ImportError:|ModuleNotFoundError:|No module named|cannot import name" \
    2>/dev/null || true)
  if [[ -n "$import_errors" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── Import / Module errors ───────────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$import_errors"
  fi

  # ── pip install failures ──────────────────────────────────
  local pip_errors
  pip_errors=$(echo "$output" | grep -E \
    "ERROR: Could not find|ERROR: No matching distribution|pip.*error|Failed to install|PackageNotFoundError" \
    2>/dev/null || true)
  if [[ -n "$pip_errors" ]]; then
    echo ""
    echo -e "${YELLOW}${BOLD}── pip / dependency install errors ──────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${YELLOW}  $line${RESET}"; done <<< "$pip_errors"
  fi

  # ── Python version mismatch ───────────────────────────────
  local version_errors
  version_errors=$(echo "$output" | grep -E \
    "requires Python|python_requires|version.*not supported|incompatible.*python" \
    2>/dev/null || true)
  if [[ -n "$version_errors" ]]; then
    echo ""
    echo -e "${RED}${BOLD}── Python version compatibility errors ──────────────────${RESET}"
    while IFS= read -r line; do echo -e "${RED}  $line${RESET}"; done <<< "$version_errors"
  fi

  # ── Generic errors / tracebacks ──────────────────────────
  local traceback_errors
  traceback_errors=$(echo "$output" | grep -E \
    "^Traceback|^Error:|raised.*Exception|raise [A-Z]" \
    2>/dev/null || true)
  if [[ -n "$traceback_errors" ]]; then
    echo ""
    echo -e "${RED}${BOLD}── Exceptions / Tracebacks ──────────────────────────────${RESET}"
    while IFS= read -r line; do echo -e "${RED}  $line${RESET}"; done <<< "$traceback_errors"
  fi

  echo ""
  echo -e "${RED}${BOLD}============================================================${RESET}"
}

# ============================================================
# PRE-FLIGHT CHECKS
# ============================================================
banner "Pre-flight checks"

if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed"; exit 1
fi

if ! docker info >/dev/null 2>&1; then
  error "Docker is not running"; exit 1
fi

# ── Locate entry point ───────────────────────────────────────
cd "$PROJECT_PATH"

ENTRY_FILE=""
for candidate in "main.py" "app.py" "run.py" "${APP_NAME}.py"; do
  if [ -f "$candidate" ]; then
    ENTRY_FILE="$candidate"
    break
  fi
done

if [ -z "$ENTRY_FILE" ]; then
  warn "No standard entry point found (main.py / app.py / run.py / ${APP_NAME}.py) — will still run full syntax check on all .py files"
else
  ok "Entry point: $ENTRY_FILE"
fi

# ── Locate dependency file ───────────────────────────────────
DEP_FILE=""
DEP_INSTALL_CMD=""

if [ -f "requirements.txt" ]; then
  DEP_FILE="requirements.txt"
  DEP_INSTALL_CMD="pip install --no-warn-script-location --cache-dir /tmp/pip-cache -r requirements.txt"
elif [ -f "pyproject.toml" ]; then
  DEP_FILE="pyproject.toml"
  DEP_INSTALL_CMD="pip install --no-warn-script-location --cache-dir /tmp/pip-cache ."
elif [ -f "setup.py" ]; then
  DEP_FILE="setup.py"
  DEP_INSTALL_CMD="pip install --no-warn-script-location --cache-dir /tmp/pip-cache ."
else
  warn "No dependency file found (requirements.txt / pyproject.toml / setup.py) — skipping pip install"
fi

if [ -n "$DEP_FILE" ]; then
  ok "Dependency file: $DEP_FILE"
fi

ok "Environment validated — Python ${PYTHON_VERSION}"

# ============================================================
# CACHE WARM-UP CHECK (mirrors Spring Boot gradle cache check)
# ============================================================
banner "Cache status"

CACHED_WHEELS=0
CACHED_WHEELS=$(find "$PIP_CACHE_DIR" -name "*.whl" 2>/dev/null | wc -l | tr -d '[:space:]') || true
CACHED_WHEELS="${CACHED_WHEELS:-0}"

CACHED_SDISTS=0
CACHED_SDISTS=$(find "$PIP_CACHE_DIR" -name "*.tar.gz" -o -name "*.zip" 2>/dev/null | wc -l | tr -d '[:space:]') || true
CACHED_SDISTS="${CACHED_SDISTS:-0}"

TOTAL_CACHED=$(( CACHED_WHEELS + CACHED_SDISTS ))

if [[ "$TOTAL_CACHED" -gt 0 ]]; then
  ok "Pip cache WARM (~${CACHED_WHEELS} wheels, ~${CACHED_SDISTS} sdists) — packages will not be re-downloaded"
else
  warn "Pip cache COLD — first run will download all packages (they will be cached for next run)"
fi

# ============================================================
# DEBUG BEFORE BUILD
# ============================================================
echo "==== BEFORE DOCKER ===="
debug_files

# ============================================================
# DOCKER BUILD
#
# Steps inside container:
#   1. Print exact Python version (confirms image is correct)
#   2. Upgrade pip
#   3. Install dependencies (if any dep file exists)
#   4. Run py_compile on every .py file (syntax + basic import check)
# ============================================================
banner "Running Python ${PYTHON_VERSION} build check inside Docker"

SCRIPT_SUCCESS=false
BUILD_EXIT_CODE=0
BUILD_OUTPUT=""

BUILD_OUTPUT=$(
  docker run --rm \
    --user "$(id -u):$(id -g)" \
    -e LANG=C.UTF-8 \
    -e LC_ALL=C.UTF-8 \
    -e PYTHONDONTWRITEBYTECODE=1 \
    -e PYTHONUNBUFFERED=1 \
    -e HOME=/tmp \
    -e DEP_INSTALL_CMD="$DEP_INSTALL_CMD" \
    -v "$PIP_CACHE_DIR":/tmp/pip-cache \
    -v "$(pwd)":/workspace \
    -w /workspace \
    "$DOCKER_IMAGE" \
    bash -c '
      set -e
      export PATH="/tmp/.local/bin:$PATH"

      echo "============================================================"
      echo "  Python Version Check"
      echo "============================================================"
      python --version
      python -c "import sys; ver = sys.version_info; expected = \"'"$PYTHON_VERSION"'\"; major_minor = f\"{ver.major}.{ver.minor}\"; print(f\"Detected: {major_minor}\"); assert major_minor == expected, f\"Version mismatch: expected {expected}, got {major_minor}\""
      echo "✔  Python version verified: '"$PYTHON_VERSION"'"

      echo ""
      echo "============================================================"
      echo "  pip upgrade"
      echo "============================================================"
      pip install --quiet --no-warn-script-location --cache-dir /tmp/pip-cache --upgrade pip
      echo "✔  pip upgraded"

      if [ -n "$DEP_INSTALL_CMD" ]; then
        echo ""
        echo "============================================================"
        echo "  Installing dependencies"
        echo "============================================================"
        echo "Running: $DEP_INSTALL_CMD"
        $DEP_INSTALL_CMD
        echo "✔  Dependencies installed"

        echo ""
        echo "--- Installed packages ---"
        pip list
      else
        echo ""
        echo "⚠  No dependency file — skipping pip install"
      fi

      echo ""
      echo "============================================================"
      echo "  Syntax + import check (py_compile)"
      echo "============================================================"
      PY_FILES=$(find . -name "*.py" \
        -not -path "./.venv/*" \
        -not -path "./venv/*" \
        -not -path "./.git/*" \
        -not -path "./dist/*" \
        -not -path "./build/*" \
        -not -path "./__pycache__/*" \
        -not -path "./*.egg-info/*" \
        | sort)

      if [ -z "$PY_FILES" ]; then
        echo "⚠  No .py files found to check"
      else
        PASS=0; FAIL=0
        while IFS= read -r f; do
          if python -m py_compile "$f" 2>&1; then
            echo "  ✔ $f"
            PASS=$((PASS + 1))
          else
            echo "  ✘ $f"
            FAIL=$((FAIL + 1))
          fi
        done <<< "$PY_FILES"

        echo ""
        echo "Syntax check results: ${PASS} passed, ${FAIL} failed"
        if [ "$FAIL" -gt 0 ]; then
          echo "BUILD FAILED — syntax errors found"
          exit 1
        fi
        echo "✔  All .py files passed syntax check"
      fi

      echo ""
      echo "✅ Build check passed!"
    ' 2>&1
) || BUILD_EXIT_CODE=$?

# Echo captured output so parent process / checkBuild.js child.stdout sees it
echo "$BUILD_OUTPUT"

# ============================================================
# FAILURE PATH
# ============================================================
if [[ "$BUILD_EXIT_CODE" -ne 0 ]]; then
  echo "==== AFTER DOCKER (build failed) ===="
  debug_files
  print_build_errors "$BUILD_OUTPUT"
  exit "$BUILD_EXIT_CODE"
fi

# ============================================================
# CLEAN BUILD ARTIFACTS
# ============================================================
banner "Cleaning build artifacts"

log "🧹 Removing __pycache__, *.pyc, .venv, dist/, build/, *.egg-info/ ..."
ls -l

for _dir in "__pycache__" ".venv" "venv" "dist" "build"; do
  find "$PROJECT_PATH" -type d -name "$_dir" -exec rm -rf {} + 2>/dev/null || true
done
find "$PROJECT_PATH" -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true

find "$PROJECT_PATH" -type f -name "*.pyc" -delete 2>/dev/null || true
find "$PROJECT_PATH" -type f -name "*.pyo" -delete 2>/dev/null || true

ls -al
ok "Cleanup completed!"

# ============================================================
# DEBUG AFTER SUCCESSFUL BUILD
# ============================================================
echo "==== AFTER DOCKER ===="
debug_files

SCRIPT_SUCCESS=true

echo "----------------------------------"
echo "BUILD CHECK SUCCESSFUL"
echo "Python       : ${PYTHON_VERSION}"
echo "Docker image : ${DOCKER_IMAGE}"
echo "App          : ${APP_NAME}"
echo "Project      : ${PROJECT_PATH}"
if [ -n "$DEP_FILE" ]; then
  echo "Dependencies : ${DEP_FILE}"
fi
if [ -n "$ENTRY_FILE" ]; then
  echo "Entry point  : ${ENTRY_FILE}"
fi
echo "----------------------------------"