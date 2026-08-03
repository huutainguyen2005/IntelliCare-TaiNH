#ifndef CONFIG_H
#define CONFIG_H


// ================= CẤU HÌNH PHẦN CỨNG =================
// Chân I2C (Màn hình LCD)
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9

// Chân Cảm biến HX711
#define LOADCELL_DOUT_PIN 4
#define LOADCELL_SCK_PIN 5

// Chân Nút nhấn Reset
#define TARE_BUTTON_PIN 6

// ================= CẤU HÌNH THUẬT TOÁN =================
// Hệ số hiệu chuẩn
#define CALIBRATION_FACTOR -213432.0
// -213710.0
// Ngưỡng lọc nhiễu chống rung (kg)
#define DEADBAND 0.005

// Thời gian chờ tĩnh (ms) - Đứng im 3s mới chốt số
#define STABILIZE_DURATION 3000

// ================= CẤU HÌNH MẠNG & API =================

// BẬT CÔNG TẮC CHỌN LOẠI MẠNG WIFI (Điền số 1, 2, hoặc 3)
// 1: Wi-Fi không mật khẩu (Open)
// 2: Wi-Fi cá nhân/gia đình bình thường (WPA2 Personal)
// 3: Wi-Fi doanh nghiệp/Trường học (WPA2 Enterprise)
// #define WIFI_AUTH_TYPE 2

// #define WIFI_SSID "TestESP32"
// #define WIFI_PASSWORD "12345678"
// #define WIFI_USERNAME "KienNTCE190036"

// #define SERVER_URL "http://192.168.137.1:8080/api/measurements/submit"
#define DEVICE_ID "SCALE_001"
#define API_RETRY_DELAY 3000 // Chờ 3s nếu API lỗi
#define SERVER_URL "https://intellicare-tainh.onrender.com/api/measurements/submit"
#endif