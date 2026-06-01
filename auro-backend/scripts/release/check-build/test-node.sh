#!/bin/bash
set -e

PROJECT_PATH=$(pwd)

docker run --rm \
  -v "$PROJECT_PATH":/app \
  -w /app \
  node:20 \
  bash -c "
    echo 'Starting Node.js test validation...'

    # Install dependencies
    if [ -f 'package.json' ]; then
      npm install --silent
    else
      echo 'package.json not found'
      exit 1
    fi

    # Run tests (prefer npm test if defined)
    if npm run | grep -q 'test'; then
      npm test
    else
      npx jest test --passWithNoTests
    fi
  "