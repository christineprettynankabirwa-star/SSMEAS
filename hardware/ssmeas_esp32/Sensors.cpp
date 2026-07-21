#include "Sensors.h"

#include <Arduino.h>

#include "Config.h"

namespace {

float clampValue(float value, float minimum, float maximum) {
  return min(max(value, minimum), maximum);
}

float readUltrasonicDistanceCm() {
  digitalWrite(Config::ULTRASONIC_TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(Config::ULTRASONIC_TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(Config::ULTRASONIC_TRIGGER_PIN, LOW);

  const unsigned long duration = pulseIn(
    Config::ULTRASONIC_ECHO_PIN,
    HIGH,
    Config::ULTRASONIC_TIMEOUT_US
  );
  return duration == 0 ? NAN : static_cast<float>(duration) * 0.0343F / 2.0F;
}

SensorReadings readHardwareSensors() {
  const float distance = readUltrasonicDistanceCm();
  const float usableDepth = Config::TANK_EMPTY_DISTANCE_CM - Config::TANK_FULL_DISTANCE_CM;
  const float level = (Config::TANK_EMPTY_DISTANCE_CM - distance) / usableDepth * 100.0F;

  // The basic conversion provides a stable 0-1000 scale. For accurate ppm,
  // replace this with an Rs/R0 curve calibrated for the target gas.
  const float gas = static_cast<float>(analogRead(Config::MQ135_ANALOG_PIN))
    / Config::ADC_MAX_READING * Config::MQ135_FULL_SCALE;

  const bool valid = !isnan(distance) && usableDepth > 0.0F;

  return {clampValue(level, 0.0F, 100.0F), gas, valid};
}

}  // namespace

namespace Sensors {

void begin() {
  pinMode(Config::ULTRASONIC_TRIGGER_PIN, OUTPUT);
  pinMode(Config::ULTRASONIC_ECHO_PIN, INPUT);
  digitalWrite(Config::ULTRASONIC_TRIGGER_PIN, LOW);
  analogSetPinAttenuation(Config::MQ135_ANALOG_PIN, ADC_11db);
}

SensorReadings read() {
  return readHardwareSensors();
}

}  // namespace Sensors
