# SSMEAS Acceptance Test Report

Test date: 15 July 2026

## Automated verification

| Check | Result | Evidence |
| --- | --- | --- |
| ESP32 publishes every 30 seconds | PASS (static) | `PUBLISH_INTERVAL_MS = 30 * 1000`; device loop publishes on that schedule |
| Dashboard updates automatically | PASS (static/build) | dashboard load interval is 30,000 ms |
| Historical chart updates | PASS (static/build) | chart reloads immediately and every 30,000 ms |
| Alerts appear | PASS (unit/static) | alert generation tests pass; active alerts are loaded and rendered |
| Maintenance records display | PASS (static/build) | maintenance API result is rendered by `MaintenanceTable` |
| Authentication works | PASS (automated) | every protected endpoint returns 401 without a token |
| Role restrictions work | PASS (automated/static) | role matrix tests pass and routes apply matching authorization middleware |
| Backend tests | PASS | 9 tests passed |
| Backend build | PASS | TypeScript compilation succeeded |
| Dashboard lint/build | PASS | ESLint and Next.js production build succeeded |

## Role acceptance matrix

| Action | Administrator | Maintenance officer | Supervisor |
| --- | ---: | ---: | ---: |
| Login | Allow | Allow | Allow |
| Add/edit/delete tank | Allow | Deny | Deny |
| View dashboard | Allow | 403 | Allow |
| View readings | Allow | Allow | Allow |
| View maintenance | Allow | Allow | Allow |
| Create maintenance | Allow | Allow | 403 |

## Manual integration checks still required

Automated tests do not prove external infrastructure is online. In the deployed environment, record tester, timestamp, and screenshot/reference for: real login with all three seeded users; administrator tank CRUD; database-backed maintenance creation/display; ESP32 serial publish; matching backend reading; two consecutive automatic dashboard/chart refreshes; threshold alert display; and exact 403 responses for maintenance-officer dashboard and supervisor POST maintenance.

Final acceptance is complete only after those live checks pass. Use `Demonstration-Script.md` as the execution order.
