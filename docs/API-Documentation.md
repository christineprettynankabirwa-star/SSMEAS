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

- `POST /api/device/readings` — device ingestion endpoint authenticated with
  `X-Device-API-Key`. The body contains `tank_id`, unique `reading_id`, `level`,
  `gas_level`, `temperature`, optional `battery`, and optional `recorded_at`.
  It validates the registered tank and writes the reading to PostgreSQL.

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

## Overflow predictions

- `GET /api/predictions` — all three roles; calculates predictions for every registered tank from its latest 100 PostgreSQL fill-level readings.
- `GET /api/predictions/:tankId` — all three roles; retains the detailed, backward-compatible prediction response for one tank.

The collection endpoint returns an array. Each item follows this contract:

```json
{
  "tank_id": "00000000-0000-4000-8000-000000000001",
  "predicted_overflow_time": "2026-07-20T16:30:00.000Z",
  "hours_remaining": 4.5,
  "risk": 92,
  "confidence": 87
}
```

`predicted_overflow_time` and `hours_remaining` are `null` when readings are stable or falling. `risk` and `confidence` are percentages from 0 to 100. The forecast uses least-squares regression over historical fill levels. Risk combines current fill level, positive fill rate, and estimated time to 100%; confidence combines sample count, regression fit, and reading recency.

## Collection route optimization

- `GET /api/routes/optimized` — all three roles; returns a critical-first, distance-optimized collection route.

Candidates include tanks at or above the configured fill warning threshold, tanks with active warning or critical alerts, and tanks with open maintenance work. Critical tanks are routed before high- and medium-priority tanks; nearest-neighbour distance optimization is applied within each tier. The response retains `depot`, `stops`, `totalDistanceKm`, and `generatedAt`, and also includes `estimatedDurationMinutes`, `tankCount`, and the route-wide `priorityScore`. Each stop includes its collection sequence, distance from the previous stop, fill level, priority category, and priority score.

## Maintenance

- `GET /api/maintenance` — all three roles; returns maintenance records joined with tank display data.
- `POST /api/maintenance` — administrator, maintenance officer; body `{ "tank_id": UUID, "task": string, "scheduled_for": ISO-8601 timestamp, "status"?: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" }`; returns `201`.

## Authorization matrix

| Endpoint group | Administrator | Maintenance officer | Supervisor |
| --- | --- | --- | --- |
| Dashboard summary and alerts | Allow | 403 | Allow |
| Readings | Allow | Allow | Allow |
| Overflow predictions | Allow | Allow | Allow |
| List maintenance | Allow | Allow | Allow |
| Create maintenance | Allow | Allow | 403 |
| Read tanks | Allow | 403 | Allow |
| Create/update/delete tanks | Allow | 403 | 403 |

## Common status codes

`200` success, `201` created, `204` deleted, `400` invalid request, `401` missing/invalid login, `403` role denied, `404` resource not found, `409` conflicting data, and `500` server/configuration failure.
