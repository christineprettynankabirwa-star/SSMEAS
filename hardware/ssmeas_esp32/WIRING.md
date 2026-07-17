# ESP32 sensor wiring

The production sketch targets an ESP32 DevKit, HC-SR04 ultrasonic module,
MQ-series gas module, three status LEDs, and a buzzer. All grounds must be common.

```text
                              +----------------------+
 USB / regulated 5 V --------| 5V/VIN          ESP32|
 Common ground --------------| GND                  |
                              |                      |
 HC-SR04 TRIG ----------------| GPIO 5               |
 HC-SR04 ECHO --[1 kΩ]--+-----| GPIO 18              |
                         |    |                      |
                       [2 kΩ] |                      |
                         |    |                      |
 GND --------------------+    |                      |
                              |                      |
 MQ-135 AO ----[10 kΩ]---+----| GPIO 34 (ADC1)       |
                         |    |                      |
                       [20 kΩ]|                      |
                         |    |                      |
 GND --------------------+    |                      |
                              |                      |
 TMP36 VOUT ------------------| GPIO 35 (ADC1)       |
                              |                      |
 Battery + ----[100 kΩ]--+----| GPIO 32 (ADC1)       |
                         |    |                      |
                       [100kΩ]|                      |
                         |    +----------------------+
 Battery - / GND --------+
```

## Connection table

| Device | Device pin | Connect to | Notes |
|---|---|---|---|
| HC-SR04 | VCC | 5 V/VIN | The module normally requires 5 V. |
| HC-SR04 | GND | Common GND | Share ground with the ESP32. |
| HC-SR04 | TRIG | GPIO 5 | Direct 3.3 V output from ESP32. |
| HC-SR04 | ECHO | GPIO 18 through 1 kΩ/2 kΩ divider | Reduces the 5 V echo to about 3.3 V. |
| MQ-135 module | VCC | 5 V/VIN | Heater requires a stable supply; allow warm-up time. |
| MQ-135 module | GND | Common GND | — |
| MQ-135 module | AO | GPIO 34 through 10 kΩ/20 kΩ divider | Protects ESP32 ADC if AO reaches 5 V. Do not use DO. |
| Red LED | Anode | GPIO 25 through a current-limiting resistor | Turns on for danger. Connect cathode to common GND. |
| Yellow LED | Anode | GPIO 26 through a current-limiting resistor | Turns on for warning. Connect cathode to common GND. |
| Green LED | Anode | GPIO 27 through a current-limiting resistor | Turns on for safe status. Connect cathode to common GND. |
| Active buzzer/driver | Signal | GPIO 14 | Use a transistor driver if the buzzer exceeds the GPIO current rating. |
| TMP36 | `+Vs` | ESP32 3.3 V | Flat face forward: left pin is `+Vs`. |
| TMP36 | VOUT | GPIO 35 | Flat face forward: centre pin. |
| TMP36 | GND | Common GND | Flat face forward: right pin. |
| Battery | Positive | GPIO 32 through 100 kΩ/100 kΩ divider | Suitable only for batteries up to 6.6 V with the configured 2:1 ratio. |
| Battery | Negative | Common GND | Never connect an unscaled battery directly to an ADC pin. |

## Power notes

- ESP32 GPIO and ADC pins are **not 5 V tolerant**. Keep both voltage dividers
  in place.
- Use a regulated supply sized for the ESP32 Wi-Fi current peaks and MQ-135
  heater. Do not power the MQ-135 heater from the ESP32 3.3 V pin.
- For batteries above 6.6 V, redesign the divider so the maximum GPIO 32
  voltage remains below 3.3 V and update `BATTERY_DIVIDER_RATIO`.
- Long outdoor sensor cables need appropriate waterproofing, strain relief,
  surge protection, and a suitable enclosure.
