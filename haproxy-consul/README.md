# HAProxy with Consul Service Discovery

This example demonstrates HAProxy load balancing with Consul service discovery using Docker Compose.

## Services

- **HAProxy**: Load balancer with 10 server slots configured for service discovery
- **Consul**: Service discovery and configuration management
- **App**: Sample Bun.js application (3 replicas)

## Usage

Start all services:
```bash
docker-compose up -d
```

## Access Points

- Application: http://localhost:8080
- HAProxy Stats: http://localhost:8404/stats
- Consul UI: http://localhost:8500

## Configuration

- HAProxy is configured with 10 server slots for dynamic service registration
- Consul runs in development mode with UI enabled
- App service runs with 3 replicas for load balancing demonstration

## Files

- `docker-compose.yml`: Service definitions
- `haproxy/haproxy.cfg`: HAProxy configuration with 10 slots
- `app/server.js`: Simple Bun.js server application