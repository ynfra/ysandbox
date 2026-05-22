#!/bin/bash
# Creates the supertokens database alongside the main agenta database
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE supertokens;
EOSQL
