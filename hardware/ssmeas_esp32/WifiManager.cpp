#include "WifiManager.h"

#include <Arduino.h>
#include <WiFi.h>

#include "Config.h"

namespace WifiManager {

bool isConnected() {
  return WiFi.status() == WL_CONNECTED;
}

bool ensureConnected() {
  if (isConnected()) return true;

  Serial.printf("Connecting to Wi-Fi network %s", Config::WIFI_SSID);
  WiFi.disconnect();
  WiFi.begin(Config::WIFI_SSID, Config::WIFI_PASSWORD);
  const unsigned long startedAt = millis();

  while (!isConnected() && millis() - startedAt < Config::WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print('.');
  }
  Serial.println();

  if (!isConnected()) {
    Serial.println("Wi-Fi connection timed out; it will be retried later.");
    return false;
  }

  Serial.print("Wi-Fi connected. IP address: ");
  Serial.println(WiFi.localIP());
  return true;
}

void begin() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  ensureConnected();
}

}  // namespace WifiManager
