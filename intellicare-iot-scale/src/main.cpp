#include <Arduino.h>
#include "config.h"
#include "api_client.h"
#include "weight_sensor.h"
#include "display_ui.h"

volatile bool needToSend = false;
volatile float weightToSend = 0.0;
volatile bool isSent = false;
volatile bool isDisplayingError = false;

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
  ui_showSensorInit();
  sensor_init();

  xTaskCreatePinnedToCore(apiTaskCode, "APITask", 8192, NULL, 1, NULL, 0);
}

void loop()
{
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
        lastCheckedWeight = 0.0;
        emptyStartTime = millis();
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

    if (current_weight > 0.02 && !isSent)
    {
      if (current_weight != lastCheckedWeight)
      {
        lastCheckedWeight = current_weight;
        stableStartTime = millis();
      }

      // --- LOGIC CHỐT SỐ SAU KHI ỔN ĐỊNH (STABILIZE_DURATION) ---
      if (millis() - stableStartTime > STABILIZE_DURATION)
      {
        // Đọc số cân giờ do Web (iPad/laptop) đảm nhiệm sau khi nhận API
        // trả về - ESP32 chỉ còn nhiệm vụ gửi số liệu lên Backend.
        if (!needToSend && (millis() - lastApiTime > API_RETRY_DELAY))
        {
          weightToSend = current_weight;
          needToSend = true;
          lastApiTime = millis();
        }
      }
    }

    if (current_weight < 0.01)
    {
      if (millis() - emptyStartTime > 1000)
      {
        isSent = false;
        isDisplayingError = false;
        needToSend = false;
        lastCheckedWeight = 0.0;
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

  yield();
}