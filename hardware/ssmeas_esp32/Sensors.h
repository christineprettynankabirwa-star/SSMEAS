#pragma once

struct SensorReadings {
  float sewageLevelPercent;
  float gasLevel;
  float temperatureCelsius;
  float batteryVoltage;
  bool valid;
};

namespace Sensors {

void begin();
SensorReadings read();

}  // namespace Sensors
