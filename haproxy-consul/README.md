# HAProxy with Consul Service Discovery

This example demonstrates HAProxy load balancing with Consul service discovery using Docker Compose and Registrator for automatic service registration.

## Services

- **HAProxy**: Load balancer with DNS-based service discovery from Consul
- **Consul**: Service discovery and configuration management with DNS interface
- **App**: Sample Bun.js application (3 replicas) running on port 3000
- **Registrator**: Automatic service registration for Docker containers

## Usage

Start all services:
```bash
docker compose up -d
```

## Access Points

- Application: http://localhost:8080
- HAProxy Stats: http://localhost:8404/stats
- Consul UI: http://localhost:8500

## How It Works

1. **Registrator** automatically detects app containers and registers them with Consul
2. **Consul** provides DNS-based service discovery via SRV records
3. **HAProxy** uses `server-template` with DNS resolution to discover app instances
4. Services are registered as `_app._tcp.service.consul` SRV records
5. HAProxy dynamically updates backend servers based on DNS queries to Consul

## Configuration

- HAProxy uses DNS resolution with `server-template` for dynamic service discovery
- Consul runs in development mode with UI and DNS interface enabled on port 8600
- App service runs 3 replicas on port 3000 with health checks
- Registrator monitors Docker events for automatic service registration/deregistration

## Files

- `docker-compose.yml`: Service definitions with Registrator integration
- `haproxy/haproxy.cfg`: HAProxy configuration with DNS-based service discovery
- `app/server.js`: Simple Bun.js server application
