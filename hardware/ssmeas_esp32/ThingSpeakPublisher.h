#pragma once

#include "Sensors.h"

namespace ThingSpeakPublisher {

bool publish(const SensorReadings& readings, const char* deviceStatus);

}  // namespace ThingSpeakPublisher
