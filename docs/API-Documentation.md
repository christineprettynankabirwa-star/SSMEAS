# SSMEAS API Documentation

All endpoints are served by the Express backend under `/api`. The dashboard communicates only with this backend; it never requests ThingSpeak directly.

## Health

- `GET /api/health` — confirms API availability.

## Tanks

- `GET /api/tanks` — returns tanks, including their fixed `latitude` and `longitude` registration coordinates.
- `GET /api/tanks/:id`
- `POST /api/tanks`
- `PUT /api/tanks/:id`
- `DELETE /api/tanks/:id`

## Readings

- `GET /api/readings/live` — retrieves the latest ThingSpeak feed through the backend, validates it, resolves `field5` to a registered tank, checks its configured channel when present, stores the idempotent historical reading, and returns it.

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
