#!/bin/bash

set -e  # Exit on any error

# --- INPUT ARGUMENTS ---
REPO_URL=$1           # Git repo URL (e.g., https://github.com/yourname/MyApi.git)
BRANCH_NAME=$2        # Branch name (e.g., main, dev)
APP_NAME=$3           # App name (e.g., myapi)
DOCKER_USERNAME=${4:-$docker_username}    # Docker Hub username
DOCKER_PASSWORD=${5:-$docker_passsword}    # Docker Hub password
IMAGE_TAG=$6          # Image tag (e.g., v1.0.0 or latest)
DOTNET_VERSION=$7     # .NET SDK version (e.g., 6.0, 8.0)

echo $REPO_URL , $BRANCH_NAME , $APP_NAME , $DOCKER_USERNAME  , $IMAGE_TAG , $DOTNET_VERSION

# --- VALIDATE INPUT ---
if [ $# -ne 7 ]; then
  echo "Usage: $0 <git-repo-url> <branch-name> <app-name> <docker-username> <docker-password> <image-tag> <dotnet-version>"
  exit 1
fi

# --- ENVIRONMENT SETUP ---
BASE_DIR="./docker_project"
mkdir -p "$BASE_DIR"

USERNAME=$(whoami)
echo "Current user: $USERNAME"

CLONE_DIR="$BASE_DIR/$APP_NAME"
PUBLISH_DIR="$CLONE_DIR/publish"
IMAGE_NAME="$DOCKER_USERNAME/$APP_NAME:$IMAGE_TAG"
DOTNET_SDK_IMAGE="mcr.microsoft.com/dotnet/sdk:$DOTNET_VERSION"

# --- CLONE REPO ---
echo "Cloning repository from $REPO_URL (branch: $BRANCH_NAME) into $CLONE_DIR..."
rm -rf "$CLONE_DIR"
git clone --branch "$BRANCH_NAME" "$REPO_URL" "$CLONE_DIR"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Docker not found. Installing..."
  sudo apt update
  sudo apt install -y docker.io
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "Docker installed and started."
else
  echo "Docker is already installed."
fi

if [ ! -d "$CLONE_DIR" ]; then
  echo "Failed to clone the repository or branch"
  exit 1
fi

# --- BUILD WITH .NET ---
sudo usermod -aG docker $USER 
sudo systemctl restart docker
echo "🔧 Using$DOTNET_VERSION to build the app: $APP_NAME"
docker pull "$DOTNET_SDK_IMAGE"

echo "Searching for .csproj file..."
CSPROJ_PATH=$(find "$CLONE_DIR" -name "*.csproj" | head -n 1)

if [ -z "$CSPROJ_PATH" ]; then
  echo "No .csproj file found in the repository."
  exit 1
fi

CSPROJ_FILE_IN_CONTAINER="/src/${CSPROJ_PATH#$CLONE_DIR/}"
echo "Found project: $CSPROJ_FILE_IN_CONTAINER"

USER_ID=$(id -u)
GROUP_ID=$(id -g)

# Use host-side NuGet cache
NUGET_CACHE="$HOME/.nuget/packages"
mkdir -p "$NUGET_CACHE"
mkdir -p "$CLONE_DIR/publish"

echo "Running dotnet restore and publish..."
docker run --rm \
  -u $USER_ID:$GROUP_ID \
  -e HOME=/tmp \
  -e DOTNET_SKIP_FIRST_TIME_EXPERIENCE=true \
  -e DOTNET_CLI_TELEMETRY_OPTOUT=1 \
  -e DOTNET_NOLOGO=true \
  --tmpfs /tmp \
  -v "$PWD/$CLONE_DIR":/src \
  -v "$NUGET_CACHE":/home/$USER/.nuget/packages \
  -v "$PWD/$CLONE_DIR/publish":/app/publish \
  -w /src \
  "$DOTNET_SDK_IMAGE" \
  /bin/bash -c "dotnet restore \"$CSPROJ_FILE_IN_CONTAINER\" && dotnet publish \"$CSPROJ_FILE_IN_CONTAINER\" --no-restore -c Release -o /app/publish"

# --- VERIFY MAIN DLL ---
PROJECT_NAME=$(basename "$CSPROJ_PATH" .csproj)
DLL_PATH=$(find "$PUBLISH_DIR" -maxdepth 1 -name "$PROJECT_NAME.dll")

if [ -z "$DLL_PATH" ]; then
  echo "Could not find DLL matching project name, picking largest DLL..."
  DLL_PATH=$(find "$PUBLISH_DIR" -maxdepth 1 -name "*.dll" -printf "%s %p\n" | sort -nr | head -n 1 | cut -d' ' -f2)
fi

if [ -z "$DLL_PATH" ]; then
  echo "ERROR: No valid DLL found in publish directory"
  exit 1
fi

DLL_NAME=$(basename "$DLL_PATH")
echo "DLL verified: $DLL_NAME"

# --- CREATE Dockerfile ---
echo "Creating Dockerfile..."
cat > "$CLONE_DIR/Dockerfile" <<EOF
# Use .NET runtime image
FROM mcr.microsoft.com/dotnet/aspnet:$DOTNET_VERSION
WORKDIR /app
COPY ./publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "$DLL_NAME"]
EOF

# --- BUILD DOCKER IMAGE ---
echo " Building Docker image: $IMAGE_NAME ..."
docker build -t "$IMAGE_NAME" "$CLONE_DIR"

# --- PUSH TO DOCKER HUB ---
echo " Logging into Docker Hub..."
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

echo "Pushing image to Docker Hub..."
docker push "$IMAGE_NAME"

# --- VERIFY PUSH ---
echo "Verifying image on Docker Hub..."
docker pull "$IMAGE_NAME" && echo "Verified image exists on Docker Hub: $IMAGE_NAME"

echo "Done! Docker image pushed and verified: $IMAGE_NAME"
