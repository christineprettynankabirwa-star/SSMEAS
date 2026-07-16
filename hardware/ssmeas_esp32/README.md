# SSMEAS ESP32 telemetry firmware

This Arduino sketch publishes simulated or physical tank telemetry to the
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
| `status` | `SIMULATION` or `ONLINE` device status |

## Configure and upload

1. Open `ssmeas_esp32.ino` in Arduino IDE 2.x.
2. Install Espressif's **esp32** board package using Boards Manager.
3. Select the appropriate ESP32 Dev Module board and serial port.
4. Edit `Config.h` and provide:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `SSMEAS_DEVICE_READINGS_URL`
   - `DEVICE_API_KEY`, matching the backend `DEVICE_API_KEY`
   - `TANK_UUID`, matching a tank already registered in PostgreSQL
5. Keep `SSMEAS_SIMULATION_MODE` set to `1` for generated telemetry, or set it
   to `0` after wiring and calibrating the physical sensors.
6. Verify, upload, and open Serial Monitor at 115200 baud.

Only ESP32 core libraries are used: `WiFi`, `HTTPClient`, and
`WiFiClientSecure`. No third-party Arduino libraries are required.

HTTPS certificate validation uses the DigiCert Global Root G2 trust anchor in
`Config.h`. Before production firmware releases, verify that ThingSpeak still
uses a chain rooted there and rotate the trust anchor before its January 2038
expiry.

## Calibration

Hardware installations must adjust these constants in `Config.h`:

- `TANK_EMPTY_DISTANCE_CM` and `TANK_FULL_DISTANCE_CM` for tank geometry.
- `MQ135_MAX_SIMULATED_PPM` or the conversion in `Sensors.cpp` after MQ-135
  burn-in and clean-air calibration. The supplied linear conversion is a
  stable gas-level scale, not laboratory-grade gas concentration.
- `BATTERY_DIVIDER_RATIO` to match the installed resistor divider.
- `ADC_REFERENCE_VOLTAGE` if measurements show a consistent ADC offset.

See [WIRING.md](WIRING.md) before enabling hardware mode.
