-- Agenta OSS bootstrap: create the three databases the API/migrations expect.
-- Runs once, on a fresh Postgres data dir, as the POSTGRES_USER superuser
-- (agenta), which then owns the databases the app connects with.
\c postgres

SELECT 'CREATE DATABASE agenta_oss_core'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agenta_oss_core')\gexec

SELECT 'CREATE DATABASE agenta_oss_tracing'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agenta_oss_tracing')\gexec

SELECT 'CREATE DATABASE agenta_oss_supertokens'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'agenta_oss_supertokens')\gexec
