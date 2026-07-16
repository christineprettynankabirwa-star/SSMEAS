#include "Config.h"
#include "Sensors.h"
#include "ApiPublisher.h"
#include "WifiManager.h"

unsigned long lastPublishAt = 0;
bool firstPublish = true;

void setup() {
  Serial.begin(115200);
  delay(250);
  Serial.println("Starting SSMEAS ESP32 telemetry device.");

  Sensors::begin();
  WifiManager::begin();
}

void loop() {
  const unsigned long now = millis();
  // Unsigned subtraction remains correct when millis() wraps after ~49 days.
  if (firstPublish || now - lastPublishAt >= Config::PUBLISH_INTERVAL_MS) {
    firstPublish = false;
    lastPublishAt = now;

    const SensorReadings readings = Sensors::read();
    Serial.printf(
      "Level %.1f%% | Gas %.1f | Temperature %.1f C | Battery %.2f V\n",
      readings.sewageLevelPercent,
      readings.gasLevel,
      readings.temperatureCelsius,
      readings.batteryVoltage
    );

    if (!readings.valid) {
      Serial.println("Sensor reading invalid; API upload skipped.");
    } else {
#if SSMEAS_SIMULATION_MODE
      ApiPublisher::publish(readings, "SIMULATION");
#else
      ApiPublisher::publish(readings, "ONLINE");
#endif
    }
  }

  // Yield to the ESP32 Wi-Fi/RTOS tasks without blocking the publish schedule.
  delay(10);
}
