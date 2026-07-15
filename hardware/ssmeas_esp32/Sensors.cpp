#include "Sensors.h"

#include <Arduino.h>

#include "Config.h"

namespace {

float clampValue(float value, float minimum, float maximum) {
  return min(max(value, minimum), maximum);
}

#if SSMEAS_SIMULATION_MODE

float simulatedLevel = 55.0F;
float simulatedGas = 120.0F;
float simulatedTemperature = 25.0F;
float simulatedBattery = 4.05F;

float randomStep(float maximumMagnitude) {
  return static_cast<float>(random(-1000L, 1001L)) / 1000.0F * maximumMagnitude;
}

SensorReadings readSimulatedSensors() {
  // Random walks look more like successive physical readings than unrelated
  // random numbers while still occasionally reaching warning conditions.
  simulatedLevel = clampValue(simulatedLevel + randomStep(2.0F), 15.0F, 99.0F);
  simulatedGas = clampValue(simulatedGas + randomStep(35.0F), 40.0F, 450.0F);
  simulatedTemperature = clampValue(simulatedTemperature + randomStep(0.6F), 18.0F, 42.0F);
  simulatedBattery = clampValue(simulatedBattery + randomStep(0.015F) - 0.002F, 3.1F, 4.2F);
  return {simulatedLevel, simulatedGas, simulatedTemperature, simulatedBattery, true};
}

#else

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

float adcVoltage(uint8_t pin) {
  return static_cast<float>(analogRead(pin)) / Config::ADC_MAX_READING * Config::ADC_REFERENCE_VOLTAGE;
}

SensorReadings readHardwareSensors() {
  const float distance = readUltrasonicDistanceCm();
  const float usableDepth = Config::TANK_EMPTY_DISTANCE_CM - Config::TANK_FULL_DISTANCE_CM;
  const float level = (Config::TANK_EMPTY_DISTANCE_CM - distance) / usableDepth * 100.0F;

  // The basic conversion provides a stable 0-1000 scale. For accurate ppm,
  // replace this with an Rs/R0 curve calibrated for the target gas.
  const float gas = static_cast<float>(analogRead(Config::MQ135_ANALOG_PIN))
    / Config::ADC_MAX_READING * Config::MQ135_MAX_SIMULATED_PPM;

  // TMP36 output is 500 mV at 0 C and changes by 10 mV per degree Celsius.
  const float temperature = (adcVoltage(Config::TEMPERATURE_ANALOG_PIN) - 0.5F) * 100.0F;
  const float battery = adcVoltage(Config::BATTERY_ANALOG_PIN) * Config::BATTERY_DIVIDER_RATIO;
  const bool valid = !isnan(distance) && usableDepth > 0.0F;

  return {clampValue(level, 0.0F, 100.0F), gas, temperature, battery, valid};
}

#endif

}  // namespace

namespace Sensors {

void begin() {
#if SSMEAS_SIMULATION_MODE
  randomSeed(static_cast<unsigned long>(analogRead(0)) ^ micros());
#else
  pinMode(Config::ULTRASONIC_TRIGGER_PIN, OUTPUT);
  pinMode(Config::ULTRASONIC_ECHO_PIN, INPUT);
  digitalWrite(Config::ULTRASONIC_TRIGGER_PIN, LOW);
  analogSetPinAttenuation(Config::MQ135_ANALOG_PIN, ADC_11db);
  analogSetPinAttenuation(Config::TEMPERATURE_ANALOG_PIN, ADC_11db);
  analogSetPinAttenuation(Config::BATTERY_ANALOG_PIN, ADC_11db);
#endif
}

SensorReadings read() {
#if SSMEAS_SIMULATION_MODE
  return readSimulatedSensors();
#else
  return readHardwareSensors();
#endif
}

}  // namespace Sensors
