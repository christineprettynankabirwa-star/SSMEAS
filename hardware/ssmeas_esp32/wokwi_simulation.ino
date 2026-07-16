// SSMEAS / SewerGuard Wokwi simulation
// ESP32 + HC-SR04 + analog gas input + LEDs + buzzer
// Telemetry path: ESP32 -> SSMEAS API -> PostgreSQL

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <esp_system.h>

// ---------------- Pins ----------------
#define TRIG_PIN 5
#define ECHO_PIN 18
#define GAS_SENSOR 34
#define RED_LED 25
#define YELLOW_LED 26
#define GREEN_LED 27
#define BUZZER_PIN 14

// ---------------- Wokwi Wi-Fi ----------------
const char WIFI_SSID[] = "Wokwi-GUEST";
const char WIFI_PASSWORD[] = "";

// Use the public HTTPS address of the deployed SSMEAS backend.
// Wokwi cannot reach localhost or a private 192.168.x.x address.
const char API_URL[] = "https://YOUR-PUBLIC-BACKEND/api/device/readings";
const char DEVICE_API_KEY[] = "CHANGE_TO_THE_BACKEND_DEVICE_API_KEY";

// Must be the UUID of an existing row in the PostgreSQL tanks table.
const char TANK_UUID[] = "00000000-0000-4000-8000-000000000000";

// ---------------- Simulation settings ----------------
const float TANK_HEIGHT_CM = 100.0F;
const int GAS_WARNING = 1800;
const int GAS_DANGER = 2800;
const unsigned long UPLOAD_INTERVAL_MS = 5000;

unsigned long lastUploadAt = 0;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("Connecting to Wokwi Wi-Fi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, 6);

  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < 20000) {
    delay(250);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" connection failed");
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

bool uploadReading(float percentage, int gasValue, const String& status) {
  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return false;

  const String payload =
    String("{\"tank_id\":\"") + TANK_UUID
    + "\",\"reading_id\":\"" + makeReadingUuid()
    + "\",\"level\":" + String(percentage, 2)
    + ",\"gas_level\":" + String(gasValue)
    + ",\"temperature\":null"
    + ",\"battery\":null"
    + ",\"status\":\"" + status + "\"}";

  WiFiClientSecure secureClient;
  // Simulation only. Production firmware must validate the server certificate.
  secureClient.setInsecure();

  HTTPClient http;
  if (!http.begin(secureClient, API_URL)) {
    Serial.println("Could not initialize API request.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

  const int responseCode = http.POST(payload);
  const String responseBody = http.getString();
  http.end();

  Serial.print("API response: ");
  Serial.println(responseCode);
  if (responseCode < 200 || responseCode >= 300) {
    Serial.println(responseBody);
    return false;
  }
  return true;
}

void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(GAS_SENSOR, INPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

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

  float percentage = ((TANK_HEIGHT_CM - distance) / TANK_HEIGHT_CM) * 100.0F;
  percentage = constrain(percentage, 0.0F, 100.0F);

  const int gasValue = analogRead(GAS_SENSOR);
  String status;

  if (percentage >= 85.0F || gasValue >= GAS_DANGER) {
    status = "DANGER";
  } else if (percentage >= 60.0F || gasValue >= GAS_WARNING) {
    status = "WARNING";
  } else {
    status = "SAFE";
  }

  setIndicators(status);

  Serial.print("Level: ");
  Serial.print(percentage, 1);
  Serial.print("% | Gas: ");
  Serial.print(gasValue);
  Serial.print(" | Status: ");
  Serial.println(status);

  const unsigned long now = millis();
  if (lastUploadAt == 0 || now - lastUploadAt >= UPLOAD_INTERVAL_MS) {
    lastUploadAt = now;
    uploadReading(percentage, gasValue, status);
  }

  delay(250);
}
