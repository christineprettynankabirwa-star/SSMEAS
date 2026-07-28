# Project Title

Smart Sewage Monitoring and Environmental Alert System (SSMEAS)
Prepared by: Group 29

Table of Contents

1. Introduction
2. Overall Description
3. System Architecture
4. Functional Requirements
5. Non-functional Requirements
6. User Roles
7. System Modules
8. Database Requirements
9. API Requirements
10. User Interface Requirements
11. Predictive Analytics Module
12. External Interfaces
13. Security Requirements
14. Performance Requirements
15. Future Enhancements
16. Coding Standards
17. Folder Structure
18. Development Roadmap

Introduction

Purpose
Develop an IoT platform that continuously monitors septic tanks and assists sanitation authorities with monitoring, maintenance scheduling, statistical overflow forecasting, and route planning.

Problem Statement
Current septic tanks are inspected manually.

Problems include:
Overflow before detection
Hazardous gases
Poor maintenance planning
No centralized monitoring
High operational costs

Objectives
The system shall:
✔ Monitor tank levels
✔ Detect dangerous gases
✔ Display real-time information
✔ Store historical readings
✔ Predict overflow
✔ Recommend maintenance
✔ Optimize cesspool truck routes

2 Overall Description
The system consists of four major components.
ESP32
↓
Backend API
↓
PostgreSQL
↓
Dashboard

The Predictive Analytics Module operates in the TypeScript backend and reads historical sensor data from PostgreSQL.

3 System Architecture

                  +---------------------------+
                  |      ESP32 Controller     |
                  +---------------------------+
                     |      |
             Ultrasonic   Gas
                Sensor    Sensor
                     |
                     ▼
               Wi-Fi Network
                     |
                     ▼
         Express Backend API (TypeScript)
                     |
       +-------------+--------------+
       |                            |
 PostgreSQL Database      Predictive Analytics Module
       |                            |
       +-------------+--------------+
                     |
                     ▼
          Next.js Dashboard

4 Functional Requirements

Authentication
The system shall:
Login
Logout
Validate JWT
Manage users

Tank Management
The system shall:
Register tanks
Edit tanks
Delete tanks
View tanks
Display tank location

Live Monitoring
The system shall:
Display current fill level
Display gas concentration
Display last update time

Historical Monitoring
The system shall:
Store readings
Display graphs
Filter by day/week/month

Alerts
The system shall:
Detect critical levels
Detect dangerous gases
Notify users
Record alerts

Maintenance
The system shall:
Record maintenance
Display maintenance history
Schedule servicing

Reports
Generate:
Daily
Weekly
Monthly
Annual reports.

Predictive Analytics
Calculate using historical sensor readings and statistical trend analysis:
Average fill rate
Time remaining to warning and danger thresholds
Expected overflow date and time
Confidence based on data consistency
Maintenance recommendation
Urgency priority

Route Optimization
Generate:
Truck routes
Tank priority
Estimated travel sequence

5 Non-functional Requirements
Availability
99% uptime

Performance
Dashboard should load in under
2 seconds.

Scalability
Support
1000+ tanks.

Security
Passwords encrypted.
JWT authentication.
Role-based authorization.

Reliability
Sensor data should never be lost.

Maintainability
Modular architecture.

6 User Roles
Administrator
Manage:
Users
Tanks
Alerts
Reports

Maintenance Officer
Manage:
Maintenance
Assigned tanks

Supervisor
View:
Dashboard
Reports
Predictive analytics

7 System Modules
Backend
Authentication
Tanks
Sensors
Alerts
Maintenance
Reports

Dashboard
Login
Dashboard
Tank Details
Charts
Maps
Reports

Hardware
ESP32
Ultrasonic
Gas sensor
Wi-Fi

Predictive Analytics Module
Statistical forecasting
Maintenance recommendations
Urgency ranking for route optimization

8 Database Requirements
Tables:
Users
Tanks
SensorReadings
Alerts
Maintenance
PredictiveAnalyticsResults
TruckRoutes

Relationships:
Tank
↓
SensorReadings
↓
PredictiveAnalyticsResults
↓
Maintenance

9 API Requirements

Authentication
POST /api/login

Health
GET /api/health

Tanks
GET
POST
PUT
DELETE

Sensor Data
GET /api/readings/live

GET /api/readings/history

Alerts
GET /api/alerts

Maintenance
GET /api/maintenance

POST /api/maintenance

Predictive Analytics
GET /api/predictions

10 User Interface Requirements

Dashboard

Should display:
Tank cards
Charts
Maps
Alerts
Statistics

Tank Details

Display:
Current status
Historical graph
Maintenance history
Predictive analytics
Registered tank location on a map

11 Predictive Analytics Module
Input

Historical levels
Gas
Tank capacity
Time

Output

Average fill rate
Estimated time to warning threshold
Estimated time to danger threshold
Expected overflow date and time
Confidence
Urgency priority
Suggested maintenance date

The module shall use deterministic statistical trend analysis over historical
PostgreSQL readings. It shall not use a learned model. Its urgency outputs are
passed to the Route Optimization Module to prioritize tanks, group nearby work,
reduce travel distance, reduce response time, and improve fuel efficiency.

12 External Interfaces
ThingSpeak REST API
PostgreSQL
Leaflet
OpenStreetMap
ESP32 Wi-Fi

ThingSpeak field mapping:

- field1: sewage level
- field2: gas level
- field5: registered tank UUID
- field6: optional device status

The ESP32 does not send GPS coordinates. Tank latitude and longitude are entered once during registration, remain in the Tanks table, and are supplied to the dashboard only through the Tanks API.

13 Security Requirements
JWT
Role-based access
Input validation
Password hashing
Environment variables

14 Performance Requirements
Maximum response
500 ms
Maximum dashboard refresh
30 seconds

15 Future Enhancements
SMS
Email
Mobile App
Offline Mode
Additional field calibration and statistical reporting
Municipality Integration

16 Coding Standards

TypeScript throughout the dashboard and backend; C++ is used for ESP32 firmware.
Folder-based architecture.
Controllers never access database directly.
Services contain business logic.
Routes remain thin.
Environment variables stored only in .env.
Meaningful commit messages

17 Folder Structure
SSMEAS/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│
├── dashboard/
│
├── prediction-engine/
│
├── hardware/
│
├── database/
│
├── docs/
│
├── README.md
│
└── .gitignore

18 Development Roadmap
Week 1 (Started Last Friday)
Project setup
Git & GitHub
Project structure
Backend foundation
PostgreSQL connection
ThingSpeak integration
Health API

Week 2
Dashboard homepage
Live tank monitoring
Charts
Tank location map
Alerts
Maintenance history

Week 3 - Predictive Analytics and Route Optimization
Predictive analytics
Estimate time until warning threshold
Estimate time until danger threshold
Forecast overflow date
Maintenance recommendation
Route optimization
Prioritize tanks
Optimize cesspool truck routes
Reduce travel distance, fuel consumption, and response time
Testing
Documentation
Final presentation

Take Note:
npm run create-user -- "System Administrator" <admin@ssmeas.local> ChangeMe123! ADMINISTRATOR

npm run create-user -- "System Supervisor" <supervisor@ssmeas.local> ChangeMe123! SUPERVISOR

npm run create-user -- "Maintenance Officer" <maintenance@ssmeas.local> ChangeMe123! MAINTENANCE_OFFICER

protected endpoint = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjYWI1YWNlYi1iMGJmLTQ3OGItYWI0OC05MzRiYzUyNzU1ZTEiLCJlbWFpbCI6ImFkbWluQHNzbWVhcy5sb2NhbCIsInJvbGUiOiJBRE1JTklTVFJBVE9SIiwiaWF0IjoxNzg0MTQ1MDk5LCJleHAiOjE3ODQxNzM4OTl9.G202QySGjboTGl3s7ERu1OsRLBIoWGv5AlN-KL9WR3I"
