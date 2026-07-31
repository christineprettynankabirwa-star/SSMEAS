# SSMEAS Deployment Guide

Deploy PostgreSQL, the Express backend, and the Next.js dashboard as separate services. Use TLS for all public endpoints.

## Backend

For an existing installation, apply `database/remove_temperature_and_battery.sql` before deploying the updated backend.

Set production database credentials, a long random `JWT_SECRET`, a separate long random `DEVICE_API_KEY`, any retained ThingSpeak channel/read key, allowed frontend origin, and alert thresholds in the hosting platform’s secret store. Apply `database/add_direct_device_readings.sql`, build with `npm ci && npm run build`, and start with `npm start`. Expose the service health endpoint at `/api/health`. Do not commit `.env` files.

## Dashboard

Set `NEXT_PUBLIC_API_BASE_URL` to the public backend URL ending in `/api`. Build with `npm ci && npm run build`; start with `npm start`. Permit the dashboard origin in backend CORS configuration before going live.

## Database and release

Back up the database before applying migrations. Apply schema changes once, deploy the backend, then deploy the dashboard. Use a non-production ThingSpeak channel for smoke testing. Confirm `/api/health`, login, 30-second refresh, role restrictions, and one complete alert-to-maintenance workflow.

## Operations

Monitor API errors, database capacity, and ThingSpeak request failures. Rotate secrets and user passwords, retain database backups, keep the ESP32 CA certificate current, and verify device clocks/network connectivity after outages. Roll back application releases by restoring the prior artifact; restore the database only from a validated backup when a migration is incompatible.
