# SSMEAS Installation Guide

## Prerequisites

- Node.js 20 or newer and npm
- PostgreSQL with permission to create the `pgcrypto` extension
- Arduino IDE or PlatformIO with ESP32 board support

## Database

Create a database, then apply the SQL files in `database/` in this order: users, tanks, sensor readings, maintenance, alerts. Apply the GPS-removal migration only to an older installation that still has reading GPS columns.

## Backend

From `backend/`, run `npm install`. Create `.env` with PostgreSQL connection settings, `JWT_SECRET`, a long random `DEVICE_API_KEY`, and alert thresholds used by the service. Apply `database/add_direct_device_readings.sql` and `database/remove_temperature_and_battery.sql`, run `npm run build`, then create accounts:

```text
npm run create-user -- "System Administrator" admin@example.com StrongPassword ADMINISTRATOR
npm run create-user -- "Maintenance Officer" maintenance@example.com StrongPassword MAINTENANCE_OFFICER
npm run create-user -- "Supervisor" supervisor@example.com StrongPassword SUPERVISOR
```

Start with `npm run dev` for development or `npm start` after a build.

## Dashboard

From `dashboard/`, run `npm install`. Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api` in `.env.local`, then use `npm run dev`. For production, run `npm run build` and `npm start`.

## ESP32 device

Register a tank first. In `hardware/ssmeas_esp32/SewerGuard_ESP32.ino`, set Wi-Fi credentials, the backend readings URL, device API key, and registered tank UUID. Wire and calibrate the HC-SR04 and MQ gas sensor, then compile and upload from Arduino IDE. Open the serial monitor at 115200 baud; a reading and backend API result should appear every 30 seconds.

## Verify

Run `npm test` and `npm run build` in `backend/`; run `npm run lint` and `npm run build` in `dashboard/`. Then follow `Acceptance-Test-Report.md` and `Demonstration-Script.md`.
