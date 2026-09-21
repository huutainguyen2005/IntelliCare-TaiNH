#include "height_sensor.h"
#include "config.h"
#include <Arduino.h>
#include <Wire.h>
#include <VL53L1X.h>

VL53L1X sensor;

int baseline_height = 0;
int min_distance = 9999;
unsigned long start_measure_time = 0;

enum KioskState
{
    WAITING,
    MEASURING,
    LOCKED
};
KioskState currentState = WAITING;

float locked_height_cm = 0;

void height_init()
{
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
    Wire.setClock(400000); // 400kHz fast mode
    sensor.setTimeout(500);

    if (!sensor.init())
    {
        Serial.println("[HEIGHT] LỖI: Không tìm thấy VL53L1X!");
        // Không block vĩnh viễn để mạch còn chạy BLE nếu VL53L1X lỏng dây
        return; 
    }

    sensor.setDistanceMode(VL53L1X::Long);
    sensor.setMeasurementTimingBudget(50000); // 50ms
    sensor.startContinuous(50);

    Serial.println("[HEIGHT] Đang hiệu chuẩn (lấy khoảng cách mặt sàn)...");
    
    long sum = 0;
    int valid_samples = 0;
    for (int i = 0; i < 20; i++)
    {
        sensor.read();
        if (!sensor.timeoutOccurred())
        {
            sum += sensor.ranging_data.range_mm;
            valid_samples++;
        }
        delay(50);
    }

    if (valid_samples > 0)
    {
        baseline_height = sum / valid_samples;
        Serial.printf("[HEIGHT] CHIỀU CAO GỐC KIOSK: %d mm\n", baseline_height);
    }
    else
    {
        Serial.println("[HEIGHT] LỖI: Không lấy được khoảng cách mặt sàn!");
    }
}

void height_loop()
{
    sensor.read();
    if (sensor.timeoutOccurred())
        return;

    int raw_distance = sensor.ranging_data.range_mm;

    switch (currentState)
    {
    case WAITING:
        // Phát hiện khách (nhỏ hơn sàn 20cm)
        if (baseline_height > 0 && raw_distance < baseline_height - 200)
        {
            Serial.println("[HEIGHT] Phát hiện khách. Đo trong 3s...");
            currentState = MEASURING;
            start_measure_time = millis();
            min_distance = 9999;
            locked_height_cm = 0;
        }
        break;

    case MEASURING:
        if (raw_distance > 200) // Lọc nhiễu
        {
            if (raw_distance < min_distance)
            {
                min_distance = raw_distance;
            }
        }

        if (millis() - start_measure_time >= 3000)
        {
            int human_height_mm = (baseline_height - min_distance) + HEIGHT_OFFSET_MM - SCALE_THICKNESS_MM;
            locked_height_cm = human_height_mm / 10.0;
            
            Serial.printf("[HEIGHT] ĐÃ CHỐT: %.1f cm\n", locked_height_cm);
            currentState = LOCKED;
        }
        break;

    case LOCKED:
        if (raw_distance > baseline_height - 100)
        {
            Serial.println("[HEIGHT] Khách đã rời đi. Kiosk đã reset.");
            currentState = WAITING;
            // KHÔNG reset locked_height_cm ở đây, giữ lại cho gói BLE muộn
        }
        break;
    }
}

float height_get_result()
{
    return locked_height_cm;
}

bool height_is_locked()
{
    return currentState == LOCKED;
}

void height_reset()
{
    currentState = WAITING;
    locked_height_cm = 0;
    min_distance = 9999;
}
