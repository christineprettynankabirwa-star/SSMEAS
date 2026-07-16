#include "ApiPublisher.h"

#include <HTTPClient.h>
#include <WiFi.h>
#include <esp_system.h>

#include "Config.h"

namespace {
String makeReadingId() {
  const uint32_t a = esp_random();
  const uint32_t b = esp_random();
  const uint32_t c = esp_random();
  const uint32_t d = esp_random();
  char id[37];
  snprintf(
    id, sizeof(id), "%08lx-%04lx-4%03lx-%04lx-%08lx%04lx",
    static_cast<unsigned long>(a),
    static_cast<unsigned long>((b >> 16) & 0xffff),
    static_cast<unsigned long>(b & 0x0fff),
    static_cast<unsigned long>(0x8000 | ((c >> 16) & 0x3fff)),
    static_cast<unsigned long>(c & 0xffff),
    static_cast<unsigned long>(d & 0xffff)
  );
  return String(id);
}
}

bool ApiPublisher::publish(const SensorReadings& readings, const char* deviceStatus) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("API upload skipped: Wi-Fi is disconnected.");
    return false;
  }

  const String payload =
    String("{\"tank_id\":\"") + Config::TANK_UUID
    + "\",\"reading_id\":\"" + makeReadingId()
    + "\",\"level\":" + String(readings.sewageLevelPercent, 2)
    + ",\"gas_level\":" + String(readings.gasLevel, 2)
    + ",\"temperature\":" + String(readings.temperatureCelsius, 2)
    + ",\"battery\":" + String(readings.batteryVoltage, 2)
    + ",\"status\":\"" + deviceStatus + "\"}";

  HTTPClient http;
  if (!http.begin(Config::SSMEAS_DEVICE_READINGS_URL)) {
    Serial.println("Could not initialize the SSMEAS API request.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", Config::DEVICE_API_KEY);
  const int statusCode = http.POST(payload);
  const String response = http.getString();
  http.end();

  Serial.printf("SSMEAS API response: %d\n", statusCode);
  if (statusCode < 200 || statusCode >= 300) {
    Serial.println(response);
    return false;
  }
  return true;
}
