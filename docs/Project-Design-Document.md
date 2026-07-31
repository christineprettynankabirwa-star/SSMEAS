# Project Design Document

SSMEAS Project Design Document (Version 1.0)

Project Name

Smart Sewage Monitoring and Environmental Alert System (SSMEAS)

1. Project Overview

Objective

To develop an IoT-based sewage monitoring system that:

- Monitors septic tank fill levels.
- Detects hazardous gases.
- Displays real-time information on a web dashboard.
- Uses historical sewage readings and statistical trends to forecast threshold and overflow times.
- Schedules maintenance.
- Optimizes cesspool truck routes.

1. System Architecture

```text
                  +---------------------------+
                  |      ESP32 Controller     |
                  +---------------------------+
                     |      |
                     |      |
             Ultrasonic   Gas
               Sensor    Sensor
                     |
                     v
               Wi-Fi Network
                     |
                     v
         Node.js + Express Backend API
                     |
       +-------------+-------------+
       |                           |
 PostgreSQL              Predictive Analytics
 Database                     Module
       |                           |
       +-------------+-------------+
                     |
                     v
          Next.js Dashboard (Web)
                     |
      +--------------+--------------+
      |              |              |
  Administrator  Maintenance   Supervisor
```

1. Technology Stack

| Component | Technology |
| --- | --- |
| Frontend | Next.js + TypeScript |
| Backend | Express + TypeScript |
| Database | PostgreSQL |
| Predictive analytics | TypeScript statistical trend analysis |
| Maps | Leaflet + OpenStreetMap |
| Charts | Recharts |
| Authentication | JWT |
| Embedded | ESP32 |
| Version Control | Git + GitHub |

1. Project Folder Structure

```text
SSMEAS/
|-- backend/
|-- dashboard/
|-- backend/src/services/prediction.service.ts
|-- hardware/
|-- database/
|-- docs/
|-- README.md
`-- .gitignore
```

Backend Structure

```text
backend/
`-- src/
    |-- config/
    |-- controllers/
    |-- middleware/
    |-- models/
    |-- routes/
    |-- services/
    |-- types/
    |-- utils/
    |-- app.ts
    `-- server.ts
```

Dashboard Structure

```text
dashboard/
|-- app/
|-- components/
|-- services/
|-- hooks/
|-- types/
`-- styles/
```

1. User Roles

We only need three roles.

Administrator can:

- View all tanks.
- Register tanks.
- Manage users.
- View reports.
- Configure alert thresholds.

Maintenance Officer can:

- View assigned tanks.
- View alerts.
- Record maintenance.
- Update tank status.

Supervisor can:

- View dashboard.
- View reports.
- View truck routes.
- View predictive analytics forecasts.

Supervisor cannot modify data.

1. Database Design

Users

| Field | Type |
| --- | --- |
| id | UUID |
| full_name | VARCHAR |
| email | VARCHAR |
| password | VARCHAR |
| role | VARCHAR |
| created_at | TIMESTAMP |

Tanks

| Field | Type |
| --- | --- |
| id | UUID |
| tank_name | VARCHAR |
| location | VARCHAR |
| latitude | DOUBLE |
| longitude | DOUBLE |
| capacity | INTEGER |
| owner | VARCHAR |

Sensor Readings

| Field | Type |
| --- | --- |
| id | UUID |
| tank_id | UUID |
| level | FLOAT |
| gas_level | FLOAT |
| recorded_at | TIMESTAMP |

Tank coordinates are fixed registration data. `sensor_readings.tank_id` references `tanks.id`; latitude and longitude are stored only in `tanks`.

Alerts

| Field | Type |
| --- | --- |
| id | UUID |
| tank_id | UUID |
| alert_type | VARCHAR |
| status | VARCHAR |
| message | TEXT |
| created_at | TIMESTAMP |

Maintenance

| Field | Type |
| --- | --- |
| id | UUID |
| tank_id | UUID |
| officer | VARCHAR |
| emptied_at | TIMESTAMP |
| remarks | TEXT |

Predictive Analytics (Week 3)

| Field | Type |
| --- | --- |
| id | UUID |
| tank_id | UUID |
| predicted_date | DATE |
| confidence | FLOAT |

Truck Routes (Week 3)

| Field | Type |
| --- | --- |
| id | UUID |
| truck_number | VARCHAR |
| route_date | DATE |

1. API Design

Every endpoint starts with `/api`.

Health

- `GET /api/health`

Tanks

- `GET /api/tanks`
- `GET /api/tanks/:id`
- `POST /api/tanks`
- `PUT /api/tanks/:id`
- `DELETE /api/tanks/:id`

Sensor readings

- `GET /api/readings`
- `GET /api/readings/live`
- `GET /api/readings/history/:tankId`

Alerts

- `GET /api/alerts`
- `POST /api/alerts`

Maintenance

- `GET /api/maintenance`
- `POST /api/maintenance`

Predictive analytics

- `GET /api/predictions`

Routes

- `GET /api/routes`

1. Dashboard Pages

Login

- User authentication.

Dashboard

- Live tank cards.
- Statistics.
- Alerts.
- System status.

Tanks

- Tank list.
- Status.
- Details.

Tank Details

- Current level.
- Gas level.
- Historical graphs.
- Tank map using the registered tank coordinates.
- Maintenance history.

Alerts

- Active alerts.
- Alert history.

Maintenance

- Previous maintenance.
- New maintenance form.

Reports

- Weekly reports.
- Monthly reports.

Settings

- Users.
- Alert thresholds.

1. Data Flow

```text
ESP32
  v
ThingSpeak
  v
Backend
  v
Database
  v
Dashboard
  v
User
```

ThingSpeak field mapping is: `field1` sewage level, `field2` gas level, `field5` registered tank UUID, and `field6` device status. The backend validates `field5`, resolves it against `tanks`, and persists telemetry with that `tank_id`. GPS is not sent by ESP32 or stored in ThingSpeak.

1. Predictive Analytics Module and Route Optimization (Week 3)

The Predictive Analytics Module reads historical sewage-level data from PostgreSQL.
It calculates average fill rates and a linear statistical trend, estimates time
remaining before configured warning and danger conditions and expected overflow,
and calculates confidence from sample count, recency, and trend consistency.

Inputs:

- Tank ID.
- Historical level readings.
- Timestamps.
- Tank capacity.

Outputs:

- Estimated time to warning and danger thresholds.
- Expected overflow date and time.
- Average tank fill rate.
- Confidence score.
- Maintenance recommendation and urgency priority.

The backend exposes these forecasts through the backward-compatible
`/api/predictions` endpoint. The Route Optimization Module consumes the forecast
and urgency information to rank tanks, group nearby work, minimize travel
distance and response time, and improve fuel and operational efficiency.

No artificial intelligence, machine learning, deep learning, neural networks,
or learned models are used.
