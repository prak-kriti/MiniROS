#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid = "G_608";
const char* password = "srmcem@12345";

const char* server = "http://192.168.68.149:8000/telemetry";

// IR pins
int sensors[5] = {D0, D1, D2, D3, D4};

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 5; i++) {
    pinMode(sensors[i], INPUT);
  }

  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    http.begin(client, server);
    http.addHeader("Content-Type", "application/json");

    // Read sensors
    int values[5];
    for (int i = 0; i < 5; i++) {
      values[i] = digitalRead(sensors[i]);
    }

    // Create JSON
    String json = "{";
    json += "\"ir\":[";
    for (int i = 0; i < 5; i++) {
      json += String(values[i]);
      if (i < 4) json += ",";
    }
    json += "]";
    json += "}";

    int httpResponseCode = http.POST(json);

    Serial.print("Sent: ");
    Serial.println(json);

    Serial.print("Response: ");
    Serial.println(httpResponseCode);

    http.end();
  }

  delay(500); // same as ROS timer
}