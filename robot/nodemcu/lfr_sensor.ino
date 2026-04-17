#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

const char* ssid     = "G_608";
const char* password = "srmcem@12345";

// ── Device identity ───────────────────────────────────────────────────────────
// 1. Sign up at http://13.63.247.80:5173
// 2. Copy your API Key from the dashboard profile/settings
// 3. Paste it below — device registers automatically on first boot
const char* api_key     = "YOUR_API_KEY";    // from dashboard → Profile → API Key
const char* device_name = "my_robot_1";      // any name you want

const char* server = "http://13.63.247.80:8000/sensor";

// IR sensor pins
int sensorPins[5] = {D0, D1, D2, D3, D4};

WiFiClient wifiClient;

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 5; i++) {
    pinMode(sensorPins[i], INPUT);
  }

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost, reconnecting...");
    WiFi.begin(ssid, password);
    delay(2000);
    return;
  }

  // Read all 5 IR sensors
  int ir[5];
  for (int i = 0; i < 5; i++) {
    ir[i] = digitalRead(sensorPins[i]);
  }

  // Build JSON payload — api_key identifies the user, device_name identifies the robot
  String payload = "{\"api_key\":\"" + String(api_key) + "\","
                   "\"device_name\":\"" + String(device_name) + "\","
                   "\"ir\":[";
  for (int i = 0; i < 5; i++) {
    payload += String(ir[i]);
    if (i < 4) payload += ",";
  }
  payload += "]}";

  // POST to FastAPI /sensor
  HTTPClient http;
  http.begin(wifiClient, server);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);

  Serial.print("Sent: ");
  Serial.print(payload);
  Serial.print("  Response: ");
  Serial.println(code);

  if (code > 0) {
    Serial.print("Body: ");
    Serial.println(http.getString());
  }

  http.end();
  delay(500);  // 2 Hz — matches receiver_node timer
}
