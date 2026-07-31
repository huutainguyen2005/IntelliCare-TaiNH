#include "weight_sensor.h"
#include "config.h"
#include "HX711.h"

HX711 scale;
float old_weight = 0.0;
unsigned long lastSuccessfulRead = 0;

void sensor_init()
{
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  delay(1000);
  scale.set_scale(CALIBRATION_FACTOR);
  scale.tare();
  lastSuccessfulRead = millis();
}

float sensor_getWeight()
{
  if (scale.is_ready())
  {
    lastSuccessfulRead = millis();

    // Đọc 1 mẫu duy nhất
    float raw_weight = scale.get_units(1);
    if (raw_weight < 0.002)
      raw_weight = 0.00;

    // Lọc nhiễu Deadband
    if (abs(raw_weight - old_weight) > DEADBAND)
    {
      old_weight = raw_weight;
    }
  }
  return old_weight; // Trả về giá trị đã lọc tĩnh
}

bool sensor_isConnected()
{
  // Quá 1 giây không có tín hiệu nghĩa là đứt dây
  return (millis() - lastSuccessfulRead <= 1000);
}
void sensor_tare()
{
  Serial.println("[SENSOR] Dang thuc hien tru bi (Tare)...");
  scale.tare();     // Ép phần cứng lấy mốc 0kg mới
  old_weight = 0.0; // Reset lại biến lọc nhiễu
  
  lastSuccessfulRead = millis(); // <--- THÊM DÒNG NÀY ĐỂ BƠM NHỊP TIM MỚI

  Serial.println("[SENSOR] Tru bi hoan tat!");
}