// Smart Lamp RGB - baseado em examples/esp32-smart-lamp do FIWARE Made Simple (Fábio Cabrini)
//
// Mudanças em relação ao original:
//   - LED RGB por PWM (pinos 25, 26, 27) no lugar do LED onboard
//   - novo comando "color" com valor hexadecimal: <device_id>@color|FF8800
//   - "on" volta para a última cor usada; "off" apaga sem esquecer a cor
//   - publica a cor atual em c (atributo "color" no Orion)
//
//   publica    /<apikey>/<device_id>/attrs/l   luminosidade (0 a 100)
//   publica    /<apikey>/<device_id>/attrs     s|on|c|FF8800  ou  s|off|c|FF8800
//   assina     /<apikey>/<device_id>/cmd       lamp001@on|  lamp001@off|  lamp001@color|FF8800
//   publica    /<apikey>/<device_id>/cmdexe    lamp001@color|FF8800
//
// Bibliotecas: WiFi (core do ESP32) e PubSubClient (Nick O'Leary).
// Testado para o core ESP32 2.x/3.x (analogWrite funciona nos dois).

#include <WiFi.h>
#include <PubSubClient.h>

// ============================== Configuração ==============================
const char* WIFI_SSID     = "sua_rede_wifi";
const char* WIFI_PASSWORD = "sua_senha_wifi";

const char* MQTT_BROKER   = "ip_publico_da_vm";
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "";
const char* MQTT_PASSWORD = "";

const char* APIKEY    = "TEF";
const char* DEVICE_ID = "lamp001";

const int PIN_R   = 25;
const int PIN_G   = 26;
const int PIN_B   = 27;
const int LDR_PIN = 34;

// LED RGB de ânodo comum (perna comum no 3V3)? -> true. Cátodo comum (perna comum no GND)? -> false.
const bool COMMON_ANODE = false;

const unsigned long LUMINOSITY_INTERVAL_MS = 5000;
const unsigned long STATE_INTERVAL_MS      = 60000;
const unsigned long RECONNECT_INTERVAL_MS  = 2000;
// ===========================================================================

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

String attrsTopic, luminosityTopic, cmdTopic, cmdExeTopic, clientId;

bool ledOn = false;
uint8_t curR = 255, curG = 255, curB = 255;  // última cor escolhida (branco no início)
unsigned long lastLuminosityPublish = 0;
unsigned long lastStatePublish = 0;
unsigned long lastMqttAttempt = 0;

String colorHex() {
  char buf[7];
  snprintf(buf, sizeof(buf), "%02X%02X%02X", curR, curG, curB);
  return String(buf);
}

void writeRgb(uint8_t r, uint8_t g, uint8_t b) {
  if (COMMON_ANODE) { r = 255 - r; g = 255 - g; b = 255 - b; }
  analogWrite(PIN_R, r);
  analogWrite(PIN_G, g);
  analogWrite(PIN_B, b);
}

void applyLed() {
  if (ledOn) writeRgb(curR, curG, curB);
  else writeRgb(0, 0, 0);
}

void publishState() {
  String message = String("s|") + (ledOn ? "on" : "off") + "|c|" + colorHex();
  mqtt.publish(attrsTopic.c_str(), message.c_str());
  lastStatePublish = millis();
  Serial.printf("-> %s %s\n", attrsTopic.c_str(), message.c_str());
}

void publishLuminosity() {
  int reading = analogRead(LDR_PIN);
  int luminosity = map(reading, 0, 4095, 0, 100);
  String message = String(luminosity);
  mqtt.publish(luminosityTopic.c_str(), message.c_str());
  Serial.printf("-> %s %s\n", luminosityTopic.c_str(), message.c_str());
}

void confirmCommand(const String& command, const String& result) {
  String message = String(DEVICE_ID) + "@" + command + "|" + result;
  mqtt.publish(cmdExeTopic.c_str(), message.c_str());
  Serial.printf("-> %s %s\n", cmdExeTopic.c_str(), message.c_str());
}

// Aceita "FF8800" ou "#FF8800". Retorna false se o valor for inválido.
bool parseHexColor(String value, uint8_t& r, uint8_t& g, uint8_t& b) {
  value.trim();
  if (value.startsWith("#")) value = value.substring(1);
  if (value.length() != 6) return false;
  for (unsigned int i = 0; i < 6; i++) if (!isxdigit(value[i])) return false;
  long rgb = strtol(value.c_str(), nullptr, 16);
  r = (rgb >> 16) & 0xFF;
  g = (rgb >> 8) & 0xFF;
  b = rgb & 0xFF;
  return true;
}

// Comandos UltraLight 2.0: <device_id>@<comando>|<parâmetro>
void onMessage(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  Serial.printf("<- %s %s\n", topic, message.c_str());

  int at = message.indexOf('@');
  if (at < 0) return;
  int bar = message.indexOf('|', at + 1);
  String device = message.substring(0, at);
  String command = message.substring(at + 1, bar < 0 ? message.length() : bar);
  String param = bar < 0 ? "" : message.substring(bar + 1);
  if (device != DEVICE_ID) return;

  if (command == "on") {
    ledOn = true;
    applyLed();
    confirmCommand(command, "ok");
  } else if (command == "off") {
    ledOn = false;
    applyLed();
    confirmCommand(command, "ok");
  } else if (command == "color") {
    uint8_t r, g, b;
    if (!parseHexColor(param, r, g, b)) {
      confirmCommand(command, "invalid color");
      return;
    }
    if (r == 0 && g == 0 && b == 0) {
      ledOn = false;  // preto = desligar, mas mantém a cor anterior para o "on"
    } else {
      curR = r; curG = g; curB = b;
      ledOn = true;
    }
    applyLed();
    confirmCommand(command, colorHex());
  } else {
    confirmCommand(command, "unknown command");
    return;
  }
  publishState();
}

void connectWiFi() {
  Serial.printf("Conectando ao Wi-Fi %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }
  Serial.printf("\nWi-Fi conectado. IP: %s\n", WiFi.localIP().toString().c_str());
}

void connectMqtt() {
  if (millis() - lastMqttAttempt < RECONNECT_INTERVAL_MS) return;
  lastMqttAttempt = millis();

  Serial.printf("Conectando ao broker %s:%d como %s... ", MQTT_BROKER, MQTT_PORT, clientId.c_str());
  bool connected = strlen(MQTT_USER) > 0
                       ? mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)
                       : mqtt.connect(clientId.c_str());
  if (!connected) {
    Serial.printf("falhou (estado %d)\n", mqtt.state());
    return;
  }
  Serial.println("conectado");
  mqtt.subscribe(cmdTopic.c_str());
  publishState();
  publishLuminosity();
  lastLuminosityPublish = millis();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_R, OUTPUT);
  pinMode(PIN_G, OUTPUT);
  pinMode(PIN_B, OUTPUT);

  // Teste de cores na inicialização: vermelho, verde, azul.
  writeRgb(255, 0, 0); delay(250);
  writeRgb(0, 255, 0); delay(250);
  writeRgb(0, 0, 255); delay(250);
  ledOn = false;
  applyLed();

  String base = String("/") + APIKEY + "/" + DEVICE_ID;
  attrsTopic      = base + "/attrs";
  luminosityTopic = base + "/attrs/l";
  cmdTopic        = base + "/cmd";
  cmdExeTopic     = base + "/cmdexe";
  clientId = String("fiware-") + DEVICE_ID + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);

  connectWiFi();
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }
  if (!mqtt.connected()) {
    connectMqtt();
    return;
  }
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastLuminosityPublish >= LUMINOSITY_INTERVAL_MS) {
    lastLuminosityPublish = now;
    publishLuminosity();
  }
  if (now - lastStatePublish >= STATE_INTERVAL_MS) {
    publishState();
  }
}
