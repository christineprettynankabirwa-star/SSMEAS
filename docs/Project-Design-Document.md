SSMEAS Project Design Document (Version 1.0)

Project Name

Smart Sewage Monitoring and Environmental Alert System (SSMEAS)

1. Project Overview

Objective

To develop an IoT-based sewage monitoring system that:

- Monitors septic tank fill levels.
- Detects hazardous gases.
- Displays real-time information on a web dashboard.
- Predicts future overflow dates.
- Schedules maintenance.
- Optimizes cesspool truck routes.

2. System Architecture

```text
                  +---------------------------+
                  |      ESP32 Controller     |
                  +---------------------------+
                     |      |        |
                     |      |        |
             Ultrasonic   Gas     GPS Module
               Sensor    Sensor
                     |
                     v
               Wi-Fi Internet
                     |
                     v
              ThingSpeak Cloud
                     |
             REST API (Read)
                     |
                     v
         Node.js + Express Backend
                     |
       +-------------+-------------+
       |                           |
 PostgreSQL                 Prediction Engine
 Database                     (Python)
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

3. Technology Stack

| Component | Technology |
| --- | --- |
| Frontend | Next.js + TypeScript |
| Backend | Express + TypeScript |
| Database | PostgreSQL |
| AI | Python |
| IoT Cloud | ThingSpeak |
| Maps | Leaflet + OpenStreetMap |
| Charts | Recharts |
| Authentication | JWT |
| Embedded | ESP32 |
| Version Control | Git + GitHub |

4. Project Folder Structure

```text
SSMEAS/
|-- backend/
|-- dashboard/
|-- prediction-engine/
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

5. User Roles

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
- View predictions.

Supervisor cannot modify data.

6. Database Design

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
| temperature | FLOAT |
| battery | FLOAT |
| timestamp | TIMESTAMP |

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

Predictions (Week 3)

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

7. API Design

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

Predictions

- `GET /api/predictions`

Routes

- `GET /api/routes`

8. Dashboard Pages

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
- GPS map.
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

9. Data Flow

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

10. AI Module Interfaces (Week 3)

The prediction engine reads historical sensor data and writes results back to the database.

Inputs:

- Tank ID.
- Historical level readings.
- Timestamps.
- Tank capacity.

Outputs:

- Predicted overflow date.
- Estimated days remaining.
- Confidence score.

The backend exposes these predictions through `/api/predictions`.
