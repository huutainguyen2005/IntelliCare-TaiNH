#include "mqtt_client.h"
#include "config.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

static WiFiClient wifiClient;
static PubSubClient mqttClient(wifiClient);

static char topicWeight[64];
static char topicStatus[64];

static unsigned long lastReconnectAttempt = 0;

static void buildTopics()
{
    // scale/SCALE_001/weight  -> kết quả cân đã ổn định
    // scale/SCALE_001/status  -> "online" / "offline" (LWT)
    snprintf(topicWeight, sizeof(topicWeight), "scale/%s/weight", DEVICE_ID);
    snprintf(topicStatus, sizeof(topicStatus), "scale/%s/status", DEVICE_ID);
}

static bool mqttReconnect()
{
    Serial.printf("[MQTT] Dang ket noi toi broker %s:%d ...\r\n",
                   MQTT_BROKER_HOST, MQTT_BROKER_PORT);

    // Last Will and Testament: nếu ESP32 mất kết nối đột ngột (rớt mạng,
    // mất điện...) broker sẽ TỰ ĐỘNG publish "offline" vào topicStatus
    // giúp backend biết thiết bị đang offline mà không cần polling.
    bool connected = mqttClient.connect(
        DEVICE_ID,       // Client ID - PHẢI duy nhất trên toàn broker
        MQTT_USERNAME,
        MQTT_PASSWORD,
        topicStatus,      // willTopic
        1,                 // willQos
        true,              // willRetain
        "offline"          // willMessage
    );

    if (connected)
    {
        Serial.println("[MQTT] Ket noi THANH CONG!");
        mqttClient.publish(topicStatus, "online", true); // retained
    }
    else
    {
        Serial.printf("[MQTT] LOI ket noi, rc=%d (xem PubSubClient.h de tra ma loi)\r\n",
                       mqttClient.state());
    }
    return connected;
}

void mqtt_setup()
{
    buildTopics();
    mqttClient.setServer(MQTT_BROKER_HOST, MQTT_BROKER_PORT);
    mqttClient.setBufferSize(256);
}

void mqtt_loop()
{
    if (WiFi.status() != WL_CONNECTED)
        return;

    if (!mqttClient.connected())
    {
        unsigned long now = millis();
        if (now - lastReconnectAttempt > MQTT_RECONNECT_INTERVAL)
        {
            lastReconnectAttempt = now;
            mqttReconnect();
        }
    }
    else
    {
        // Bắt buộc gọi liên tục để xử lý PING/keepalive, không thì
        // broker sẽ tự ngắt kết nối sau ~15s im lặng.
        mqttClient.loop();
    }
}

bool mqtt_publishWeight(float weightKg)
{
    if (!mqttClient.connected())
    {
        Serial.println("[MQTT] Chua ket noi, bo qua publish.");
        return false;
    }

    StaticJsonDocument<128> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["weightKg"] = weightKg;
    doc["ts"] = millis();

    char payload[128];
    size_t len = serializeJson(doc, payload, sizeof(payload));

    // Lưu ý: thư viện PubSubClient chỉ hỗ trợ QoS 0 (fire-and-forget).
    // Nếu cần QoS 1/2 (đảm bảo broker nhận được), cân nhắc đổi sang
    // thư viện "256dpi/arduino-mqtt" hoặc ESP-IDF's esp-mqtt.
    bool ok = mqttClient.publish(topicWeight, (const uint8_t *)payload, len, false);
    Serial.printf("[MQTT] Publish %s -> %s (%s)\r\n",
                   topicWeight, payload, ok ? "OK" : "FAIL");
    return ok;
}
