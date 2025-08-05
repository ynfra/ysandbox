# Skyvern

Skyvern is an AI-powered browser automation platform that allows you to automate complex workflows on any website using natural language instructions.

## Services

- **postgres**: PostgreSQL 14 database for storing Skyvern data
- **skyvern**: Main Skyvern application with browser automation capabilities
- **skyvern-ui**: Web interface for managing and monitoring Skyvern workflows

## Ports

- `5432`: PostgreSQL database
- `8000`: Skyvern API server
- `8080`: Skyvern web UI
- `9090`: Artifact server

## Setup

1. Set your Gemini API key in the docker-compose.yml:
   ```yaml
   GEMINI_API_KEY=YOUR_GEMINI_KEY
   ```

2. Set your Skyvern API key in the UI environment:
   ```yaml
   VITE_SKYVERN_API_KEY=YOUR_API_KEY
   ```

3. Start the services:
   ```bash
   docker compose up -d
   ```

## Access

- Skyvern UI: http://localhost:8080
- Skyvern API: http://localhost:8000
- PostgreSQL: localhost:5432
