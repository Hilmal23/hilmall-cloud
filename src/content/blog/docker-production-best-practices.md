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

## Conclusion

Docker in production requires attention to security, performance, and reliability. The practices outlined here — minimal images, non-root execution, proper secrets management, and comprehensive monitoring — form the foundation of a robust container platform.

Start with these fundamentals, measure everything, and iterate based on your specific workload requirements. Containers are a powerful tool, but only when deployed with the same rigor as traditional infrastructure.
