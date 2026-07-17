#pragma once

#include <Arduino.h>

namespace Config {

// Wi-Fi and SSMEAS API credentials. Replace these before uploading.
constexpr char WIFI_SSID[] = "YOUR_WIFI_SSID";
constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";
constexpr char SSMEAS_DEVICE_READINGS_URL[] = "http://192.168.1.100:4000/api/device/readings";
constexpr char DEVICE_API_KEY[] = "CHANGE_TO_A_LONG_RANDOM_DEVICE_KEY";

// Must match a UUID already registered in the SSMEAS tanks table. The backend
// rejects uploads for unknown tank UUIDs.
constexpr char TANK_UUID[] = "00000000-0000-4000-8000-000000000000";

constexpr char THINGSPEAK_UPDATE_URL[] = "https://api.thingspeak.com/update";
// DigiCert Global Root G2 trust anchor (expires 15 January 2038). Keep this
// certificate current if ThingSpeak changes its public TLS certificate chain.
constexpr char THINGSPEAK_ROOT_CA[] = R"PEM(-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBhMQswCQYDVQQG
EwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3d3cuZGlnaWNlcnQuY29tMSAw
HgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBHMjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUx
MjAwMDBaMGExCzAJBgNVBAYTAlVTMRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3
dy5kaWdpY2VydC5jb20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkq
hkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI2/Ou8jqJ
kTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx1x7e/dfgy5SDN67sH0NO
3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQq2EGnI/yuum06ZIya7XzV+hdG82MHauV
BJVJ8zUtluNJbd134/tJS7SsVQepj5WztCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyM
UNGPHgm+F6HmIcr9g+UQvIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQAB
o0IwQDAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV5uNu
5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY1Yl9PMWLSn/pvtsr
F9+wX3N3KjITOYFnQoQj8kVnNeyIv/iPsGEMNKSuIEyExtv4NeF22d+mQrvHRAiGfzZ0JFrabA0U
WTW98kndth/Jsw1HKj2ZL7tcu7XUIOGZX1NGFdtom/DzMNU+MeKNhJ7jitralj41E6Vf8PlwUHBH
QRFXGU7Aj64GxJUTFy8bJZ918rGOmaFvE7FBcf6IKshPECBV1/MUReXgRPTqh5Uykw7+U0b6LJ3/
iyK5S9kJRaTepLiaWN0bfVKfjllDiIGknibVb63dDcY3fe0Dkhvld1927jyNxF1WW6LZZm6zNTfl
MrY=
-----END CERTIFICATE-----)PEM";
constexpr unsigned long PUBLISH_INTERVAL_MS = 30UL * 1000UL;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20UL * 1000UL;

// ESP32 DevKit pin assignments. ADC inputs use ADC1 pins so they work while
// Wi-Fi is active.
constexpr uint8_t ULTRASONIC_TRIGGER_PIN = 5;
constexpr uint8_t ULTRASONIC_ECHO_PIN = 18;
constexpr uint8_t MQ135_ANALOG_PIN = 34;
constexpr uint8_t TEMPERATURE_ANALOG_PIN = 35;
constexpr uint8_t BATTERY_ANALOG_PIN = 32;

// Tank calibration: sensor-to-liquid distances at empty and full states.
constexpr float TANK_EMPTY_DISTANCE_CM = 180.0F;
constexpr float TANK_FULL_DISTANCE_CM = 20.0F;
constexpr unsigned long ULTRASONIC_TIMEOUT_US = 30000UL;

// Analog conversion/calibration constants. Calibrate these values against the
// actual MQ-135 module and battery divider before deployment.
constexpr float ADC_REFERENCE_VOLTAGE = 3.3F;
constexpr float ADC_MAX_READING = 4095.0F;
constexpr float MQ135_FULL_SCALE = 1000.0F;
constexpr float BATTERY_DIVIDER_RATIO = 2.0F;

}  // namespace Config
