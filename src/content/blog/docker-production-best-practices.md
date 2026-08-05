---
title: "Docker Production Best Practices: Security, Performance, and Reliability"
description: "Learn how to run Docker containers in production securely and efficiently. Covers image optimization, orchestration, secrets management, and monitoring."
pubDate: 2025-01-13
author: "Hilmall Cloud"
tags:
  - "Docker"
  - "DevOps"
  - "Containers"
  - "Security"
---

Docker has revolutionized how we deploy applications, but running containers in production requires more than just `docker run`. In this guide, we'll cover the essential practices for secure, performant, and reliable container deployments.

## Image Optimization: Smaller is Safer

Every container image you deploy should be as small as possible. Smaller images mean faster deployments, reduced attack surface, and lower resource usage.

### Multi-Stage Builds

Multi-stage builds are the most effective way to reduce image size. Here's a production-ready example for a Go application:

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8080
CMD ["./main"]
```

This approach reduces a typical Go image from ~1GB to ~15MB.

### Base Image Selection

Choose your base image carefully:

- **Alpine**: Minimal, secure, but musl libc can cause compatibility issues
- **Distroless**: Google's minimal images, excellent for production
- **Scratch**: Empty image, only for statically compiled binaries

For most applications, `alpine` or `distroless` provides the best balance.

## Security Hardening

### Run as Non-Root

By default, containers run as root — a significant security risk. Always specify a non-root user:

```dockerfile
FROM alpine:latest

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --chown=appuser:appgroup ./app /app
WORKDIR /app
```

### Read-Only Filesystems

Mount the root filesystem as read-only to prevent runtime modifications:

```bash
docker run --read-only --tmpfs /tmp myapp
```

For Kubernetes, use the `securityContext`:

```yaml
securityContext:
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1000
```

### Resource Limits

Prevent resource exhaustion with limits:

```bash
docker run \
  --memory="512m" \
  --cpus="1.0" \
  --pids-limit 100 \
  myapp
```

## Secrets Management

Never bake secrets into images. Use Docker secrets or environment variables injected at runtime:

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    image: myapp
    secrets:
      - db_password
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    external: true
```

For production orchestration, use HashiCorp Vault or cloud provider secret managers.

## Health Checks and Restart Policies

Every production container needs health checks:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

Configure restart policies for automatic recovery:

```bash
docker run --restart unless-stopped myapp
```

## Logging and Monitoring

Centralize container logs:

```bash
docker run --log-driver=syslog --log-opt syslog-address=tcp://logserver:514 myapp
```

For production, use a proper logging stack:
- **Fluentd/Fluent Bit**: Log collection and forwarding
- **Loki**: Lightweight log aggregation
- **ELK Stack**: Full-featured logging and analysis

## Network Security

Isolate containers with custom networks:

```bash
# Create isolated network
docker network create --internal backend

# Frontend can reach internet, backend cannot
docker run --network frontend myapp-frontend
docker run --network backend myapp-backend
```

Use network policies in Kubernetes for fine-grained control:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-policy
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
```

## Production Checklist

Before deploying to production:

- [ ] Images scanned for vulnerabilities (Trivy, Snyk)
- [ ] Non-root user configured
- [ ] Resource limits set
- [ ] Health checks implemented
- [ ] Secrets managed externally
- [ ] Logging configured
- [ ] Monitoring/alerting in place
- [ ] Backup strategy defined
- [ ] Rollback plan tested

## Vulnerability Scanning in the Pipeline

Shipping an unscanned image to production is asking for trouble. Base images accumulate CVEs over time, and your dependencies do too. Integrate scanning into CI so a vulnerable image never reaches the registry.

```bash
# Scan with Trivy (fast, free)
trivy image --severity HIGH,CRITICAL myapp:latest

# Fail the build on critical findings
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

In GitHub Actions, run the scan right after the build:

```yaml
- name: Build image
  run: docker build -t myapp:${{ github.sha }} .

- name: Scan image
  run: |
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
      aquasec/trivy image --exit-code 1 --severity CRITICAL \
      myapp:${{ github.sha }}
```

Re-scan running images on a schedule. A base image that was clean last month may have a critical CVE today. We re-scan all production images weekly and alert on new critical findings. This catches the case where a deployed image becomes vulnerable after deployment.

## Layer Caching and Build Speed

Slow builds kill developer velocity. Order your Dockerfile from least-frequently-changed to most-frequently-changed so Docker's layer cache does the work.

```dockerfile
FROM node:20-alpine

# Dependencies change rarely - cached across builds
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Source changes often - only this layer rebuilds
COPY . .

CMD ["node", "server.js"]
```

Use BuildKit's cache mounts for even faster dependency installs:

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production
```

On a typical Node service, this cut our CI build time from four minutes to forty seconds. The cache mount persists the npm cache between builds, so `npm ci` only downloads what changed.

## Graceful Shutdown and Signal Handling

Containers that ignore SIGTERM leave connections dangling and corrupt data. Node and other runtimes don't forward signals to your app by default when it runs as PID 1.

Use `tini` or `dumb-init` as the entrypoint:

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

Then handle SIGTERM in your app so it drains connections before exiting:

```javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, draining connections');
  server.close(async () => {
    await db.end();
    process.exit(0);
  });
  // Force exit after 10s if drain hangs
  setTimeout(() => process.exit(1), 10000);
});
```

Without this, a rolling update drops in-flight requests. With it, Kubernetes can terminate a pod cleanly and traffic shifts without errors. If you're also running web-facing services, pair this with the load balancer and health-check patterns in our [Go microservices guide](/blog/go-cloud-native-microservices).

## Image Provenance and Supply Chain

Pulling base images from public registries means trusting whoever published them. A compromised base image compromises every container built on it. Pin base images by digest, not just tag, so you get exactly the bits you reviewed:

```dockerfile
# Pinned by digest - immutable
FROM node:20-alpine@sha256:1a2b3c4d5e6f...
```

Tags are mutable — `node:20-alpine` today may differ from last month. Digests are not. Combine pinning with a private registry mirror for images you depend on, so an upstream outage or a pulled image can't break your builds. Verify signatures where available with `cosign verify`, and keep a record of which digests are deployed so a rollback returns to a known-good image, not just a known-good tag.

## Conclusion

Docker in production requires attention to security, performance, and reliability. The practices outlined here — minimal images, non-root execution, proper secrets management, and comprehensive monitoring — form the foundation of a robust container platform.

Start with these fundamentals, measure everything, and iterate based on your specific workload requirements. Containers are a powerful tool, but only when deployed with the same rigor as traditional infrastructure.
