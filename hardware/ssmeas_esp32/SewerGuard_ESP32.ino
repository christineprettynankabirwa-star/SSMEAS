// SSMEAS SewerGuard physical ESP32 firmware
// ESP32 + HC-SR04 + analog gas input + LEDs + buzzer
// Telemetry path: ESP32 -> SSMEAS API -> PostgreSQL

#include <WiFi.h>
#include <HTTPClient.h>
#include <esp_system.h>

// ---------------- Pins ----------------
#define TRIG_PIN 5
#define ECHO_PIN 18
#define GAS_SENSOR 34
#define RED_LED 25
#define YELLOW_LED 26
#define GREEN_LED 27
#define BUZZER_PIN 14

// ---------------- Network and API ----------------
const char WIFI_SSID[] = "YOUR_WIFI_SSID";
const char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// Use the backend's LAN address while developing or its HTTPS URL in production.
// The ESP32 and a LAN-hosted backend must be reachable on the same network.
const char API_URL[] = "http://192.168.1.100:4000/api/device/readings";
const char DEVICE_API_KEY[] = "CHANGE_TO_THE_BACKEND_DEVICE_API_KEY";

// Must be the UUID of an existing row in the PostgreSQL tanks table.
const char TANK_UUID[] = "00000000-0000-4000-8000-000000000000";

// ---------------- Sensor calibration ----------------
// Measure these distances in the installed tank before deployment.
const float TANK_FULL_DISTANCE_CM = 20.0F;
const float TANK_EMPTY_DISTANCE_CM = 180.0F;

// Calibrate the MQ module after burn-in. This linear scale is an operational
// gas index, not a laboratory-grade concentration measurement.
const float GAS_SCALE_MAX = 500.0F;
const float GAS_WARNING = 200.0F;
const float GAS_DANGER = 300.0F;
const unsigned long UPLOAD_INTERVAL_MS = 30000;

unsigned long lastUploadAt = 0;

bool connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(250);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    return true;
  } else {
    Serial.println(" connection failed");
    return false;
  }
}

float getDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  const unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1.0F;
  return duration * 0.0343F / 2.0F;
}

String makeReadingUuid() {
  uint8_t bytes[16];
  for (int i = 0; i < 16; i += 4) {
    const uint32_t randomValue = esp_random();
    bytes[i] = randomValue >> 24;
    bytes[i + 1] = randomValue >> 16;
    bytes[i + 2] = randomValue >> 8;
    bytes[i + 3] = randomValue;
  }

  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;

  char uuid[37];
  snprintf(
    uuid, sizeof(uuid),
    "%02x%02x%02x%02x-%02x%02x-%02x%02x-%02x%02x-%02x%02x%02x%02x%02x%02x",
    bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5],
    bytes[6], bytes[7], bytes[8], bytes[9], bytes[10], bytes[11],
    bytes[12], bytes[13], bytes[14], bytes[15]
  );
  return String(uuid);
}

void setIndicators(const String& status) {
  digitalWrite(RED_LED, status == "DANGER");
  digitalWrite(YELLOW_LED, status == "WARNING");
  digitalWrite(GREEN_LED, status == "SAFE");
  digitalWrite(BUZZER_PIN, status == "DANGER");
}

bool uploadReading(float percentage, float gasValue, const String& status) {
  if (!connectWiFi()) return false;

  const String payload =
    String("{\"tank_id\":\"") + TANK_UUID
    + "\",\"reading_id\":\"" + makeReadingUuid()
    + "\",\"level\":" + String(percentage, 2)
    + ",\"gas_level\":" + String(gasValue, 2)
    + ",\"temperature\":null"
    + ",\"battery\":null"
    + ",\"status\":\"" + status + "\"}";

  WiFiClient client;
  HTTPClient http;
  if (!http.begin(client, API_URL)) {
    Serial.println("Could not initialize API request.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

  const int responseCode = http.POST(payload);
  const String responseBody = http.getString();

  Serial.print("API response: ");
  Serial.println(responseCode);
  if (responseCode < 0) {
    Serial.print("Connection error: ");
    Serial.println(http.errorToString(responseCode));
  }
  http.end();
  if (responseCode < 200 || responseCode >= 300) {
    Serial.println(responseBody);
    return false;
  }
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(250);
  Serial.println("Starting SSMEAS SewerGuard Device");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(GAS_SENSOR, INPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  analogSetPinAttenuation(GAS_SENSOR, ADC_11db);

  setIndicators("SAFE");
  connectWiFi();
}

void loop() {
  const float distance = getDistanceCm();
  if (distance < 0.0F) {
    Serial.println("HC-SR04 timeout; reading skipped.");
    delay(1000);
    return;
  }

  float percentage =
    ((TANK_EMPTY_DISTANCE_CM - distance)
      / (TANK_EMPTY_DISTANCE_CM - TANK_FULL_DISTANCE_CM)) * 100.0F;
  percentage = constrain(percentage, 0.0F, 100.0F);

  const int gasRaw = analogRead(GAS_SENSOR);
  const float gasValue = (gasRaw / 4095.0F) * GAS_SCALE_MAX;
  String status;

  if (percentage >= 95.0F || gasValue >= GAS_DANGER) {
    status = "DANGER";
  } else if (percentage >= 80.0F || gasValue >= GAS_WARNING) {
    status = "WARNING";
  } else {
    status = "SAFE";
  }

  setIndicators(status);

  Serial.print("Level: ");
  Serial.print(percentage, 1);
  Serial.print("% | Gas: ");
  Serial.print(gasValue, 1);
  Serial.print(" (raw ");
  Serial.print(gasRaw);
  Serial.print(")");
  Serial.print(" | Status: ");
  Serial.println(status);

  const unsigned long now = millis();
  if (lastUploadAt == 0 || now - lastUploadAt >= UPLOAD_INTERVAL_MS) {
    lastUploadAt = now;
    uploadReading(percentage, gasValue, status);
  }

  delay(250);
}
