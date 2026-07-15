# SSMEAS ESP32 telemetry firmware

This Arduino sketch publishes simulated or physical tank telemetry to the
existing SSMEAS ThingSpeak channel every 30 seconds. It does not call or change
the backend API. The backend continues to retrieve the latest channel feed and
map it to the registered tank.

## ThingSpeak mapping

| ThingSpeak field | Value |
|---|---|
| `field1` | Sewage fill level (%) |
| `field2` | Gas level |
| `field3` | Temperature (C) |
| `field4` | Battery voltage (V) |
| `field5` | Registered SSMEAS tank UUID |
| `field6` | `SIMULATION` or `ONLINE` device status |

## Configure and upload

1. Open `ssmeas_esp32.ino` in Arduino IDE 2.x.
2. Install Espressif's **esp32** board package using Boards Manager.
3. Select the appropriate ESP32 Dev Module board and serial port.
4. Edit `Config.h` and provide:
   - `WIFI_SSID`
   - `WIFI_PASSWORD`
   - `THINGSPEAK_WRITE_API_KEY`
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
