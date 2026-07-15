# SSMEAS API Documentation

All endpoints are served by the Express backend under `/api`. The dashboard communicates only with this backend; it never requests ThingSpeak directly.

Except for health and login, send `Authorization: Bearer <JWT>`. Errors use `{ "message": "..." }`. Missing/invalid authentication returns `401`; an authenticated but unauthorized role returns `403`.

## Authentication

- `POST /api/login` — body `{ "email": string, "password": string }`; returns `{ "token": string }`.
- `GET /api/profile` — returns the authenticated user without a password hash.

## Health

- `GET /api/health` — confirms API availability.

## Tanks

- `GET /api/tanks` — administrator, supervisor; returns tanks, including fixed registration coordinates.
- `GET /api/tanks/:id` — administrator, supervisor.
- `POST /api/tanks` — administrator; body includes `tank_name`, `owner_name`, `location`, `latitude`, `longitude`, `capacity_liters`, optional status and ThingSpeak configuration.
- `PUT /api/tanks/:id` — administrator; accepts editable tank fields.
- `DELETE /api/tanks/:id` — administrator; returns `204` when deleted.

## Readings

- `GET /api/readings/live` — retrieves the latest ThingSpeak feed through the backend, validates it, resolves `field5` to a registered tank, checks its configured channel when present, stores the idempotent historical reading, and returns it.
- `GET /api/readings/history/:tankId` — returns stored readings for a tank in chart order.

All three roles may read telemetry.

ThingSpeak mapping:

| Field | Meaning |
| --- | --- |
| field1 | sewage level |
| field2 | gas level |
| field3 | temperature |
| field4 | battery voltage |
| field5 | registered tank UUID |
| field6 | optional device status (not persisted) |

Reading responses contain `tank_id`, telemetry values, the source ThingSpeak identifiers, and `recorded_at`. They never contain latitude or longitude. Use `GET /api/tanks` for tank location data.

## Dashboard and alerts

- `GET /api/dashboard/summary` — administrator, supervisor; returns `totalTanks`, `onlineTanks`, `activeAlerts`, and `averageFillLevel`.
- `GET /api/alerts` — administrator, supervisor; returns alerts. The dashboard displays records whose status is `ACTIVE`.

## Maintenance

- `GET /api/maintenance` — all three roles; returns maintenance records joined with tank display data.
- `POST /api/maintenance` — administrator, maintenance officer; body `{ "tank_id": UUID, "task": string, "scheduled_for": ISO-8601 timestamp, "status"?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" }`; returns `201`.

## Authorization matrix

| Endpoint group | Administrator | Maintenance officer | Supervisor |
| --- | --- | --- | --- |
| Dashboard summary and alerts | Allow | 403 | Allow |
| Readings | Allow | Allow | Allow |
| List maintenance | Allow | Allow | Allow |
| Create maintenance | Allow | Allow | 403 |
| Read tanks | Allow | 403 | Allow |
| Create/update/delete tanks | Allow | 403 | 403 |

## Common status codes

`200` success, `201` created, `204` deleted, `400` invalid request, `401` missing/invalid login, `403` role denied, `404` resource not found, `409` conflicting data, and `500` server/configuration failure.
