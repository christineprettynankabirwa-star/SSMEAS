#pragma once

struct SensorReadings {
  float sewageLevelPercent;
  float gasLevel;
  bool valid;
};

namespace Sensors {

void begin();
SensorReadings read();

}  // namespace Sensors
