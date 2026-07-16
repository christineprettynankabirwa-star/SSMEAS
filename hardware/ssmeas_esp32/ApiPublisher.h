#pragma once

#include "Sensors.h"

namespace ApiPublisher {
bool publish(const SensorReadings& readings, const char* deviceStatus);
}
