# SSMEAS ESP32 telemetry firmware

This Arduino sketch publishes physical tank telemetry to the
SSMEAS backend every 30 seconds. The backend validates the device key and writes
the reading to PostgreSQL; database credentials are never stored on the ESP32.

## API payload

| JSON property | Value |
|---|---|
| `level` | Sewage fill level (%) |
| `gas_level` | Gas level |
| `temperature` | Temperature (C) |
| `battery` | Battery voltage (V) |
| `tank_id` | Registered SSMEAS tank UUID |
| `reading_id` | Unique UUID generated for idempotency |
| `status` | `ONLINE` device status |

## Configure and upload

1. Open `SewerGuard_ESP32.ino` in Arduino IDE 2.x.
2. Install Espressif's **esp32** board package using Boards Manager.
3. Select the appropriate ESP32 Dev Module board and serial port.
4. Edit `SewerGuard_ESP32.ino` and provide:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `API_URL`
   - `DEVICE_API_KEY`, matching the backend `DEVICE_API_KEY`
   - `TANK_UUID`, matching a tank already registered in PostgreSQL
5. Wire the physical sensors and outputs as described in `WIRING.md`.
6. Verify, upload, and open Serial Monitor at 115200 baud.

Only ESP32 core libraries are used: `WiFi` and `HTTPClient`. No third-party
Arduino libraries are required.

## Calibration

Hardware installations must adjust these constants in `SewerGuard_ESP32.ino`:

- `TANK_EMPTY_DISTANCE_CM` and `TANK_FULL_DISTANCE_CM` for tank geometry.
- `GAS_SCALE_MAX` and the warning/danger thresholds after MQ sensor
  burn-in and clean-air calibration. The supplied linear conversion is a
  stable gas-level scale, not laboratory-grade gas concentration.

See [WIRING.md](WIRING.md) before powering the device.
