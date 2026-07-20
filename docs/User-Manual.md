# SSMEAS User Manual

## Sign in

Open the dashboard, enter the account email and password, and select **Sign in**. Use **Sign out** when finished. Accounts and roles are created by an administrator using the backend user-creation command.

## Administrator

Administrators can view the dashboard, readings, alerts, tanks, and maintenance; add, edit, or delete tanks; and schedule maintenance. Register a tank before configuring its ESP32, then copy the tank UUID into `hardware/ssmeas_esp32/SewerGuard_ESP32.ino`.

## Maintenance officer

Maintenance officers can view live and historical readings, view maintenance records, and create maintenance work. Dashboard summary, alerts, and tank-management endpoints are restricted and return HTTP 403.

## Supervisor

Supervisors can view the dashboard, tank data, readings, alerts, and maintenance records. They cannot create maintenance or change tanks; forbidden operations return HTTP 403.

## Dashboard

The dashboard refreshes live readings, summary cards, active alerts, maintenance records, and historical telemetry every 30 seconds. Select a tank in the monitoring table to change the historical chart. The “Last updated” time confirms successful refreshes.

## Overflow prediction

The **Overflow prediction** card forecasts when the selected tank may reach 100% fill. It refreshes its PostgreSQL-based forecast every 30 seconds and displays a live countdown, overflow-risk percentage, confidence score, current level, and fill trend.

Risk colours are green for low risk, yellow for medium risk, orange for high risk, and red for critical risk. When the level is stable or falling, the card displays **No active overflow trend** instead of inventing an overflow time. Low confidence generally means there are too few readings, the data is old, or the trend is inconsistent; collect more recent telemetry before relying on that estimate for scheduling field work.

## Alerts and maintenance

Active alerts appear in the alerts panel after telemetry crosses a configured threshold. Schedule maintenance with a tank, task, and future date/time. Status values are `SCHEDULED`, `IN_PROGRESS`, and `COMPLETED`.

## Optimized collection route

The optimized route includes tanks needing collection and tanks with open work. Critical tanks are placed first, followed by high- and medium-priority stops arranged to reduce travel distance. The route panel shows estimated distance, duration, tank count, priority score, and ordered stops. On the operations map, the dashed cyan line starts at the depot and follows the numbered collection markers. Marker colours indicate collection priority: red is critical, orange is high, and yellow is medium.

## Troubleshooting

- “Unable to reach the monitoring API”: confirm the backend and database are running and `NEXT_PUBLIC_API_BASE_URL` is correct.
- No telemetry: confirm Wi-Fi, backend reachability, `DEVICE_API_KEY`, and that ESP32 `TANK_UUID` matches a registered tank.
- HTTP 401: sign in again. HTTP 403: the signed-in role is not permitted to perform that operation.
