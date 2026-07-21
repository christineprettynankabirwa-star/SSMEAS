#include "ThingSpeakPublisher.h"

#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include "Config.h"
#include "WifiManager.h"

namespace ThingSpeakPublisher {

bool publish(const SensorReadings& readings, const char* deviceStatus) {
  if (!WifiManager::ensureConnected()) return false;

  // Field order matches the existing SSMEAS backend ThingSpeak parser.
  String body = "api_key=" + String(Config::THINGSPEAK_WRITE_API_KEY);
  body += "&field1=" + String(readings.sewageLevelPercent, 1);
  body += "&field2=" + String(readings.gasLevel, 1);
  body += "&field5=" + String(Config::TANK_UUID);
  body += "&field6=" + String(deviceStatus);

  WiFiClientSecure secureClient;
  secureClient.setCACert(Config::THINGSPEAK_ROOT_CA);

  HTTPClient http;
  if (!http.begin(secureClient, Config::THINGSPEAK_UPDATE_URL)) {
    Serial.println("Could not initialize the ThingSpeak HTTPS request.");
    return false;
  }
  http.addHeader("Content-Type", "application/x-www-form-urlencoded");
  const int responseCode = http.POST(body);
  const String responseBody = responseCode > 0 ? http.getString() : String();
  http.end();

  // ThingSpeak returns the new entry ID. A body of "0" means it rejected the
  // update (often because the channel update interval was too short).
  const bool success = responseCode == HTTP_CODE_OK && responseBody.toInt() > 0;
  Serial.printf(
    "ThingSpeak update: HTTP %d, response %s\n",
    responseCode,
    responseBody.c_str()
  );
  return success;
}

}  // namespace ThingSpeakPublisher
