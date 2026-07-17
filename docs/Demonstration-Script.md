# SSMEAS Demonstration Script

## Preparation

Create one account per role, one demonstration tank, and one scheduled maintenance item. Start PostgreSQL, the backend, and the dashboard. Power the ESP32 and open its serial monitor, the dashboard, and an API client. Keep credentials off-screen.

## Live demonstration (8–10 minutes)

1. **Architecture (30 seconds):** explain the ESP32 → Backend API → PostgreSQL → Dashboard flow.
2. **Publish telemetry (1 minute):** open the serial monitor; point out the physical sensor values and successful backend upload. State that the upload interval is 30 seconds.
3. **Stored reading (1 minute):** show the new database-backed reading and confirm that it belongs to the registered tank UUID.
4. **Automatic dashboard (2 minutes):** sign in as administrator, show the live card, readings, chart, alerts, and maintenance. Wait for the next publish/refresh and show the “Last updated” time and chart changing without reloading the page.
5. **Administrator workflow (1 minute):** add a temporary tank, edit it, then delete it. Show readings and schedule maintenance for the demonstration tank.
6. **Maintenance officer (1 minute):** sign in, view readings and maintenance, create maintenance, then request `/api/dashboard/summary` and show HTTP 403.
7. **Supervisor (1 minute):** sign in, view dashboard and maintenance, then POST `/api/maintenance` and show HTTP 403.
8. **Alert workflow (1 minute):** expose the sensors to a value beyond a configured threshold, wait for refresh, show the active alert, and connect it to a maintenance action.
9. **Close (30 seconds):** summarize early detection, shared visibility, and enforced responsibilities.

## Recovery lines

If connectivity is delayed, show the last stored historical readings and the serial output, explain the boundary that failed, and continue with role checks. Never expose API keys, JWTs, or passwords on the projector.
