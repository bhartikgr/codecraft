#!/bin/bash

set -e  # Exit on any error

# --- INPUT ARGUMENTS ---
PROJECT_PATH=$1           # Path to project folder
APP_NAME=$2               # App name (e.g., myapi)
DOTNET_VERSION=$3         # .NET SDK version (e.g., 6.0, 8.0)

echo "Project: $PROJECT_PATH, App: $APP_NAME, SDK: $DOTNET_VERSION"

# --- VALIDATE INPUT ---
if [ $# -lt 3 ]; then
  echo "Usage: $0 <project-path> <app-name> <dotnet-version>"
  exit 1
fi

# --- CHECK PROJECT ---
if [ ! -d "$PROJECT_PATH" ]; then
  echo "Failed to find project at $PROJECT_PATH"
  exit 1
fi

echo "🔧 Using $DOTNET_VERSION to build the app: $APP_NAME"

# --- FIND CSPROJ ---
CSPROJ_PATH="$PROJECT_PATH/$APP_NAME.csproj"
if [ ! -f "$CSPROJ_PATH" ]; then
  CSPROJ_PATH=$(find "$PROJECT_PATH" -maxdepth 2 -name "*.csproj" -type f | grep -v "\.Tests\.csproj" | head -n 1)
fi

if [ -z "$CSPROJ_PATH" ]; then
  echo "No .csproj file found in the project."
  exit 1
fi

echo "Found project file: $CSPROJ_PATH"

# --- RUN BUILD ---
echo "Running dotnet restore and build..."
dotnet restore "$CSPROJ_PATH"
dotnet build "$CSPROJ_PATH" -c Release

echo "✅ Build check passed!"


# --- CLEAN BUILD ARTIFACTS ---
echo "🧹 Cleaning bin/ and obj/ folders..."

ls -l

find "$PROJECT_PATH" -type d \( -name "bin" -o -name "obj" \) -exec rm -rf {} +

ls -al

echo "✅ Cleanup completed!"
