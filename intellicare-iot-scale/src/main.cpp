#include <Arduino.h>
#include "config.h"
#include "api_client.h"
#include "ble_scanner.h"
#include "height_sensor.h"

// Task 1: Quét Chiều cao + BLE
void sensorTaskCode(void *pvParameters)
{
  for (;;)
  {
    // VL53L1X cần đọc liên tục (nhanh, ko block)
    height_loop();
    
    // BLE scan loop (mất 1s, nội bộ có yield ko? start(1, false) sẽ block 1s.
    // Việc này có thể làm chậm quá trình lấy mẫu của height_sensor.
    // Thay vào đó, ta sẽ gọi pBLEScan->start() ở một Task khác nếu cần,
    // hoặc pBLEScan chạy nền. start(time, false) chạy đồng bộ, nên block task này.
    
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

// Task riêng cho BLE (để tránh block Height)
void bleTaskCode(void *pvParameters)
{
  for (;;)
  {
    ble_scan_loop(); // Block 1s mỗi lần
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

// Task 2: Đẩy API
void apiTaskCode(void *pvParameters)
{
  for (;;)
  {
    String hexFrame;
    if (ble_get_frame(hexFrame))
    {
      // Nếu bắt được gói BLE, lấy chiều cao hiện tại (có thể đang đo hoặc đã chốt)
      // Lấy chiều cao đã chốt gần nhất (nếu có)
      float h = height_get_result();

      Serial.println("[API] Pushing data...");
      sendKioskData(hexFrame, h);
    }
    vTaskDelay(100 / portTICK_PERIOD_MS);
  }
}

void setup()
{
  Serial.begin(9600);

  setupWiFi();

  height_init();
  ble_init();

  // Chạy Task đo chiều cao (Core 1)
  xTaskCreatePinnedToCore(sensorTaskCode, "HeightTask", 8192, NULL, 2, NULL, 1);
  
  // Chạy Task BLE (Core 1) - ưu tiên thấp hơn chút để Height mượt
  xTaskCreatePinnedToCore(bleTaskCode, "BleTask", 8192, NULL, 1, NULL, 1);

  // Chạy Task API (Core 0)
  xTaskCreatePinnedToCore(apiTaskCode, "APITask", 16384, NULL, 1, NULL, 0);
}

void loop()
{
  // Main loop ko làm gì, nhường lại CPU cho các Task FreeRTOS
  vTaskDelay(1000 / portTICK_PERIOD_MS);
}