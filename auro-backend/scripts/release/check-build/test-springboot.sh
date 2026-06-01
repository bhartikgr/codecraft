#!/bin/bash
set -e

PROJECT_PATH=$(pwd)

docker run --rm \
  -v "$PROJECT_PATH":/app \
  -w /app \
  gradle:8.10.2-jdk17 \
  bash -c "
    echo 'Starting Spring Boot test validation...'

    # If Gradle wrapper exists → use it
    if [ -f './gradlew' ]; then
      chmod +x ./gradlew
      ./gradlew test --no-daemon
    elif [ -f 'build.gradle' ] || [ -f 'build.gradle.kts' ]; then
      gradle test --no-daemon
    elif [ -f 'pom.xml' ]; then
      echo 'Detected Maven project...'
      mvn -q test
    else
      echo 'No Gradle or Maven build file found'
      exit 1
    fi
  "