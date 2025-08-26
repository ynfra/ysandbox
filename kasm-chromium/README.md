# Kasm Chromium

A containerized Chromium browser using Kasm Workspaces technology, providing a secure and isolated web browsing environment accessible via web interface.

## Services

- **chromium**: Kasm Chromium browser with VNC-based web access

## Ports

- `6901`: Web interface for accessing the Chromium browser via VNC

## Usage

```bash
make up
```

## Configuration

Key environment variables:
- `VNC_PW=password`: Password for accessing the VNC web interface
- `shm_size=512m`: Shared memory size for browser performance

Access the browser by navigating to `http://localhost:6901` and using the password `password`.