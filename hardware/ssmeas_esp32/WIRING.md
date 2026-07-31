# ESP32 sensor wiring

The prototype uses an ESP32 DevKit, HC-SR04 ultrasonic module, MQ-series gas
module, three status LEDs, and a buzzer. All grounds must be common.

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
                         |    +----------------------+
 GND --------------------+
```

## Connection table

| Device | Device pin | Connect to | Notes |
|---|---|---|---|
| HC-SR04 | VCC | 5 V/VIN | The module normally requires 5 V. |
| HC-SR04 | GND | Common GND | Share ground with the ESP32. |
| HC-SR04 | TRIG | GPIO 5 | Direct 3.3 V output from ESP32. |
| HC-SR04 | ECHO | GPIO 18 through 1 kΩ/2 kΩ divider | Reduces the 5 V echo to about 3.3 V. |
| MQ-135 module | VCC | 5 V/VIN | Allow heater warm-up time. |
| MQ-135 module | GND | Common GND | Shared ground. |
| MQ-135 module | AO | GPIO 34 through 10 kΩ/20 kΩ divider | Protects the ESP32 ADC if AO reaches 5 V. Do not use DO. |
| Red LED | Anode | GPIO 25 through a resistor | Turns on for danger. Connect cathode to ground. |
| Yellow LED | Anode | GPIO 26 through a resistor | Turns on for warning. Connect cathode to ground. |
| Green LED | Anode | GPIO 27 through a resistor | Turns on for safe status. Connect cathode to ground. |
| Active buzzer/driver | Signal | GPIO 14 | Use a transistor driver if needed. |

## Power notes

- ESP32 GPIO and ADC pins are not 5 V tolerant; retain the sensor voltage dividers.
- Use a regulated supply sized for ESP32 Wi-Fi current peaks and the MQ module heater.
- Protect outdoor cables against water, strain, and electrical surges.
