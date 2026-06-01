#!/bin/bash

set -e
source /docker.env
# --- INPUT VALIDATION ---
if [ $# -lt 5 ]; then
  echo "Usage: $0 <app-name> <docker-image-name> <container-port> <image-tag> <no of instance> <namespace>"
  exit 1
fi
echo "HELLO"

APP_NAME="$1"
DOCKER_IMAGE_NAME="$2"     # e.g., myrepo/myapp
CONTAINER_PORT="$3"        # Use provided container port
IMAGE_TAG="$4"
REPLICAS="$5"
NAMESPACE="$6"
DOCKER_USERNAME="${docker_username}"
DOCKER_PASSWORD="${docker_password}"

DOCKER_IMAGE="$DOCKER_IMAGE_NAME:$IMAGE_TAG"

echo $APP_NAME , $DOCKER_IMAGE_NAME , $CONTAINER_PORT , $IMAGE_TAG , $REPLICAS , $NAMESPACE 

# --- VALIDATE ENVIRONMENT VARIABLES ---
if [[ -z "$DOCKER_USERNAME" || -z "$DOCKER_PASSWORD" ]]; then
  echo " Error: DOCKER_USERNAME and/or DOCKER_PASSWORD environment variables are not set."
  echo " Please set these variables to authenticate with the Docker registry."
  exit 1
fi

# --- TEST DOCKER CREDENTIALS ---
echo "Testing Docker credentials..."
if ! echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin docker.io &>/dev/null; then
  echo "Error: Docker login failed. Please verify DOCKER_USERNAME and DOCKER_PASSWORD in /docker.env."
  exit 1
fi
echo "Docker credentials verified."

# --- CHECK K8S ---
export KUBECONFIG=/etc/kubernetes/admin.conf

if ! command -v kubectl &> /dev/null; then
  echo "kubectl not found. Install it first."
  exit 1
fi

if ! kubectl cluster-info &> /dev/null; then
  echo "No Kubernetes cluster detected."
  exit 1
fi
echo "Kubernetes cluster detected."

# --- ENSURE TARGET NAMESPACE EXISTS ---
if [[ "$NAMESPACE" != "default" ]]; then
    if ! kubectl get ns "$NAMESPACE" &>/dev/null; then
        echo "📄 Namespace '$NAMESPACE' not found. Creating..."
        kubectl create ns "$NAMESPACE"
    else
        echo "Namespace '$NAMESPACE' already exists."
    fi
fi


# --- CHECK HELM ---
if ! command -v helm &> /dev/null; then
  echo "Installing Helm..."
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
else
  echo "Helm already installed."
fi

# --- HANDLE PRIVATE IMAGE ---
IMAGE_PULL_SECRET=""
if [[ -n "$DOCKER_USERNAME" && -n "$DOCKER_PASSWORD" ]]; then
  echo "Creating imagePullSecret..."
  kubectl delete secret regcred -n "$NAMESPACE" --ignore-not-found
  kubectl create secret docker-registry regcred \
    --docker-username="$DOCKER_USERNAME" \
    --docker-password="$DOCKER_PASSWORD" \
    --docker-server=docker.io \
    -n "$NAMESPACE"
  IMAGE_PULL_SECRET="regcred"
else
  echo "ℹUsing public image."
fi


# --- INSTALL INGRESS CONTROLLER ---
if ! helm list -n ingress-nginx | grep -q ingress-nginx; then
  echo "Installing NGINX ingress controller..."
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
  helm repo update
  helm install ingress-nginx ingress-nginx/ingress-nginx --namespace ingress-nginx --create-namespace
else
  echo " NGINX ingress already installed."
fi

# --- WAIT FOR INGRESS CONTROLLER ---
echo " Waiting for NGINX ingress controller to be ready..."
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=180s
kubectl wait --namespace ingress-nginx \
  --for=condition=Ready pod \
  -l app.kubernetes.io/component=controller \
  --timeout=180s

# --- DEPLOY APP ---
echo " Deploying $APP_NAME.."

# --- ENSURE TLS SECRET IN TARGET NAMESPACE ---
TLS_SECRET_NAME="ingress-tls"
TLS_CRT_PATH="/etc/kubernetes/pki/lets_encrypt_tls.crt"
TLS_KEY_PATH="/etc/kubernetes/pki/lets_encrypt_tls.key"

echo "Ensuring TLS secret '${TLS_SECRET_NAME}' exists in namespace '${NAMESPACE}'..."
if kubectl get secret "$TLS_SECRET_NAME" -n "$NAMESPACE" >/dev/null 2>&1; then
    echo " TLS secret already exists in namespace $NAMESPACE"
else
    echo " Creating TLS secret '${TLS_SECRET_NAME}' in namespace $NAMESPACE..."
    kubectl create secret tls "$TLS_SECRET_NAME" \
        --cert="$TLS_CRT_PATH" \
        --key="$TLS_KEY_PATH" \
        -n "$NAMESPACE"
fi

cat <<EOF | kubectl apply -n $NAMESPACE -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $APP_NAME
spec:
  replicas: $REPLICAS
  selector:
    matchLabels:
      app: $APP_NAME
  template:
    metadata:
      labels:
        app: $APP_NAME
    spec:
      imagePullSecrets:
        - name: $IMAGE_PULL_SECRET
      containers:
        - name: $APP_NAME
          image: $DOCKER_IMAGE
          ports:
            - containerPort: $CONTAINER_PORT

---
apiVersion: v1
kind: Service
metadata:
  name: $APP_NAME-svc
spec:
  type: ClusterIP
  selector:
    app: $APP_NAME
  ports:
    - port: 80
      targetPort: $CONTAINER_PORT
EOF

# --- CREATE OR UPDATE GLOBAL INGRESS ---
echo "Updating global ingress..."

if ! kubectl get ingress global-ingress -n $NAMESPACE >/dev/null 2>&1; then
  # Create a new ingress if it does not exist
  cat <<EOF | kubectl apply -n $NAMESPACE -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: global-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /\$1
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - ingress.hostingcloud9.com
    secretName: ingress-tls
  rules:
  - host: ingress.hostingcloud9.com
    http:
      paths:
      - path: /${APP_NAME}/(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: $APP_NAME-svc
            port:
              number: 80
EOF
else
  EXISTING_PATH=$(kubectl get ingress global-ingress -n "$NAMESPACE" -o json | jq -r ".spec.rules[0].http.paths[] | select(.path==\"/${APP_NAME}/(.*)\") | .path")
  if [[ -z "$EXISTING_PATH" ]]; then
    kubectl patch ingress global-ingress -n "$NAMESPACE" --type=json \
      -p="[{\"op\": \"add\", \"path\": \"/spec/rules/0/http/paths/-\", \"value\": {\"path\": \"/${APP_NAME}/(.*)\", \"pathType\": \"ImplementationSpecific\", \"backend\": {\"service\": {\"name\": \"$APP_NAME-svc\", \"port\": {\"number\": 80}}}}}]"
  else
    echo "Path /${APP_NAME}/(.*) already exists in global ingress."
  fi
fi

echo " Deployment and Service created for $APP_NAME."
echo " Access your app at: https://ingress.hostingcloud9.com/$APP_NAME/<your-api-path>"