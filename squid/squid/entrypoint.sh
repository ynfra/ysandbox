#!/bin/bash
set -e

# Check if all required environment variables are set
if [ -z "$PROXY_HOST" ] || [ -z "$PROXY_PORT" ] || [ -z "$PROXY_USER" ] || [ -z "$PROXY_PASS" ]; then
  echo "ERROR: Missing required environment variables. Please set PROXY_HOST, PROXY_PORT, PROXY_USER, and PROXY_PASS."
  exit 1
fi

# Create cache and log directories if they don't exist
mkdir -p /srv/data
mkdir -p /srv/logs

# Process the template file and replace environment variables
envsubst < /etc/squid/squid.conf.template > /etc/squid/squid.conf

# Initialize the SSL certificate database used by ssl-bump (idempotent)
if [ ! -d /var/lib/ssl_db/certs ]; then
  echo "Initializing SSL certificate database..."
  /usr/lib/squid/security_file_certgen -c -s /var/lib/ssl_db -M 4MB
fi

# Initialize the cache directories
echo "Initializing Squid cache directories..."
squid -N -z -F && rm -f /run/squid.pid

# Start Squid in non-daemon mode
echo "Starting Squid..."
squid -N -d 1
