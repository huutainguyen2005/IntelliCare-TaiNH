#include <Arduino.h>
#include "HX711.h"
#include "config.h"

HX711 scale;
float known_weight_kg = 0.029; 

void setup()
{
    Serial.begin(9600);
    Serial.println("=== CHUONG TRINH HIEU CHUAN CAN TU DONG ===");
    
    scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
    
    Serial.println("1. Vui long LAY HET DO VAT ra khoi can.");
    Serial.println("2. Doi 3 giay de thiet lap moc 0 (Tare)...");
    delay(3000);
    
    scale.set_scale(); // Reset hệ số về mặc định (1.0)
    scale.tare();      // Trừ bì
    Serial.println("-> Da thiet lap moc 0 xong!");
    
    Serial.println("\n3. BAY GIO: Dat cuc ta 916g len giua mat can.");
    Serial.println("4. Click chuot vao day, go phim 'c' roi nhan Enter de bat dau tinh toan...");
    
    // Vòng lặp chờ bạn gõ phím để xác nhận đã đặt tạ xong
    while (!Serial.available()) {
        delay(10);
    }
    
    // Đọc bỏ ký tự thừa trong bộ đệm
    while (Serial.available()) {
        Serial.read();
    }

    Serial.println("\nDang tinh toan he so (Doc 20 mau de lay trung binh)...");
    
    // Đọc giá trị thô (đã trừ bì) 20 lần để chống nhiễu tuyệt đối
    long raw_value = scale.get_value(20); 
    
    // Tính toán hệ số (Ép kiểu float để chia lấy số thập phân)
    float calibration_factor = (float)raw_value / known_weight_kg;
    
    Serial.println("=========================================");
    Serial.print("Gia tri tho doc duoc: ");
    Serial.println(raw_value);
    Serial.print(">> HE SO HIEU CHUAN CUA BAN LA: ");
    Serial.println(calibration_factor);
    Serial.println("=========================================");
    Serial.println("=> Hay COPY con so tren dan vao bien CALIBRATION_FACTOR trong file config.h");
    Serial.println("=> Ban co the nhan nut Reset tren mach de do lai lan nua neu muon kiem tra chéo.");
}

void loop()
{
    // Không cần làm gì trong loop nữa vì mọi thứ đã xử lý xong ở setup
}