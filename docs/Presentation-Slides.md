# SSMEAS Presentation Slides

## 1 — Smart Sewage Monitoring and Early Alert System

Real-time tank telemetry, early warnings, maintenance coordination, and role-based access.

## 2 — Problem

- Manual inspection is slow and inconsistent.
- Overflow and hazardous gas can go unnoticed.
- Maintenance teams lack one shared operational view.

## 3 — Solution

ESP32 sensors publish to ThingSpeak every 30 seconds. The backend validates and stores readings, generates alerts, and exposes a secured API. The web dashboard visualizes current and historical conditions.

## 4 — Architecture

ESP32 → ThingSpeak → Express API → PostgreSQL → Next.js dashboard.

## 5 — Core capabilities

- Live and historical telemetry
- Automatic dashboard refresh
- Threshold-based alerts
- Tank registry and maintenance scheduling
- Administrator, maintenance officer, and supervisor roles

## 6 — Security and data integrity

JWT authentication, endpoint-level role checks, bcrypt password hashes, validated telemetry, foreign keys, and idempotent ThingSpeak entry storage.

## 7 — Demonstration

Publish simulated ESP32 data; observe ThingSpeak; watch the dashboard refresh; switch roles; trigger an alert; schedule maintenance.

## 8 — Verification

Backend tests and builds pass. Dashboard lint and production build pass. The manual live-system checks are recorded in the acceptance report.

## 9 — Impact and next steps

Faster incident awareness and traceable maintenance. Next steps: field sensor calibration, notification delivery, audit logging, and production monitoring.

## 10 — Questions

Thank you.
