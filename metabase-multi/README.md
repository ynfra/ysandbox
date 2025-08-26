# Metabase Multi

A multi-instance Metabase setup with two independent Metabase instances, each backed by its own PostgreSQL database for testing and development scenarios.

## Services

- **metabase1**: First Metabase instance connected to postgres1
- **postgres1**: PostgreSQL database for metabase1
- **metabase2**: Second Metabase instance connected to postgres2  
- **postgres2**: PostgreSQL database for metabase2

## Ports

- `3001`: Metabase instance 1 web interface
- `3002`: Metabase instance 2 web interface

## Usage

```bash
make up
```

## Configuration

Each Metabase instance has its own database configuration:

**Instance 1:**
- Database: `metabase1`
- User: `metabase1`
- Password: `metabase1`

**Instance 2:**
- Database: `metabase2`
- User: `metabase2` 
- Password: `metabase2`

Both instances include health checks and are accessible at their respective ports for independent testing and development.