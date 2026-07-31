#include <Arduino.h>
#include "config.h"
#include "api_client.h"
#include "mqtt_client.h"
#include "weight_sensor.h"
#include "display_ui.h"
#include "audio_manager.h"

volatile bool needToSend = false;
volatile float weightToSend = 0.0;
volatile bool isSent = false;
volatile bool isDisplayingError = false;

bool isVoicePlayed = false;
bool isWeightSpoken = false; // Cờ kiểm soát việc đọc số cân

unsigned long lastApiTime = 0;
unsigned long stableStartTime = 0;
float lastCheckedWeight = 0.0;
unsigned long emptyStartTime = 0;

unsigned long lastUiUpdateTime = 0;
unsigned long lastDebounceTime = 0;
int lastButtonState = HIGH;
int buttonState = HIGH;

void apiTaskCode(void *pvParameters)
{
  for (;;)
  {
    if (needToSend)
    {
      bool success = sendWeightData(weightToSend);
      mqtt_publishWeight(weightToSend); // Song song với HTTP, không chặn nhau
      if (success)
      {
        isSent = true;
        isDisplayingError = false;
      }
      else
      {
        isDisplayingError = true;
      }
      needToSend = false;
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

void setup()
{
  Serial.begin(9600);
  pinMode(TARE_BUTTON_PIN, INPUT_PULLUP);

  ui_init();
  ui_showBooting();
  setupWiFi();
  mqtt_setup();
  ui_showSensorInit();
  sensor_init();

  audio_init();
  audio_playBoot();
  xTaskCreatePinnedToCore(apiTaskCode, "APITask", 8192, NULL, 1, NULL, 0);
}

void loop()
{
  mqtt_loop();

  int reading = digitalRead(TARE_BUTTON_PIN);
  if (reading != lastButtonState)
    lastDebounceTime = millis();

  if ((millis() - lastDebounceTime) > 50)
  {
    if (reading != buttonState)
    {
      buttonState = reading;
      if (buttonState == LOW)
      {
        sensor_tare();
        isSent = false;
        isDisplayingError = false;
        needToSend = false;
        isVoicePlayed = false;
        isWeightSpoken = false;
        lastCheckedWeight = 0.0;
        emptyStartTime = millis();
        // Nếu file audio_manager.h của bạn có hàm audio_stopAll(); thì bạn có thể bỏ comment dòng dưới
        // audio_stopAll();
      }
    }
  }
  lastButtonState = reading;

  float current_weight = sensor_getWeight();
  if (sensor_isConnected())
  {
    // Tối ưu UI: Cập nhật màn hình 200ms/lần
    if (millis() - lastUiUpdateTime > 200)
    {
      ui_update(current_weight, isDisplayingError);
      lastUiUpdateTime = millis();
    }

    if (current_weight > 0.2 && !isSent)
    {
      if (!isVoicePlayed)
      {
        audio_playVoice();
        isVoicePlayed = true;
      }

      if (current_weight != lastCheckedWeight)
      {
        lastCheckedWeight = current_weight;
        stableStartTime = millis();
      }

      // --- LOGIC CHỐT SỐ SAU 1.5 GIÂY ---
      if (millis() - stableStartTime > STABILIZE_DURATION)
      {
        // 1. Gọi hệ thống đọc số cân (Chỉ gọi 1 lần)
        if (!isWeightSpoken)
        {
          audio_speakWeight(current_weight);
          isWeightSpoken = true;
        }

        // 2. GỬI DỮ LIỆU API (ĐÃ TỐI ƯU)
        if (!audio_isPlaying() && !needToSend && (millis() - lastApiTime > API_RETRY_DELAY))
        {
          weightToSend = current_weight;
          needToSend = true;
          lastApiTime = millis();
        }
      }
    }

    if (current_weight < 0.1)
    {
      if (millis() - emptyStartTime > 1000)
      {
        isSent = false;
        isDisplayingError = false;
        needToSend = false;
        isVoicePlayed = false;
        isWeightSpoken = false; // Reset cờ đọc số khi nhấc đồ vật ra
        lastCheckedWeight = 0.0;
        // Nếu file audio_manager.h của bạn có hàm audio_stopAll(); thì bạn có thể bỏ comment dòng dưới
        // audio_stopAll();
      }
    }
    else
    {
      emptyStartTime = millis();
    }
  }
  else
  {
    if (millis() - lastUiUpdateTime > 200)
    {
      ui_showDisconnectError();
      lastUiUpdateTime = millis();
    }
  }

  audio_loop();

  yield();
}