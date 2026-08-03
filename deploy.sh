#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: ./deploy.sh user@droplet-ip" >&2
  exit 1
fi

IMAGE="despotheanimal/drawing-mcp"
TAG=$(git describe --tags --always --dirty)

echo "==> Building image: $IMAGE:$TAG"
docker build -t "$IMAGE:$TAG" -t "$IMAGE:latest" .

echo "==> Pushing to Docker Hub"
docker push "$IMAGE:$TAG"
docker push "$IMAGE:latest"

echo "==> Deploying to $TARGET"
ssh "$TARGET" bash -s << EOF
  set -euo pipefail

  echo "-> Pulling $IMAGE:$TAG"
  docker pull $IMAGE:$TAG

  echo "-> Stopping old container"
  docker stop drawing-mcp 2>/dev/null || true
  docker rm drawing-mcp 2>/dev/null || true

  echo "-> Starting new container"
  docker run -d \\
    --name drawing-mcp \\
    --restart unless-stopped \\
    --env-file /root/drawing-mcp.env \\
    --network host \\
    --read-only \\
    --tmpfs /tmp \\
    --cap-drop ALL \\
    $IMAGE:$TAG

  echo "-> Waiting for health check"
  sleep 3
  curl -sf http://localhost:3000/health || (echo "Health check failed!" && exit 1)

  echo "-> Pruning old images"
  docker image prune -f

  echo "-> Done. Running: $TAG"
EOF

echo "==> Deployment complete: $TAG"
