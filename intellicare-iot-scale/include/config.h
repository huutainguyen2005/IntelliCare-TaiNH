#ifndef CONFIG_H
#define CONFIG_H

// ================= CẤU HÌNH PHẦN CỨNG =================
// Chân I2C (Cảm biến siêu âm/laser VL53L1X)
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9

// ================= CẤU HÌNH ĐO CHIỀU CAO =================
// Thông số bù trừ chiều cao (Giảm 38mm so với 123 cũ để hạ chiều cao xuống ~3.8cm)
#define HEIGHT_OFFSET_MM 85
// Độ dày mâm cân
#define SCALE_THICKNESS_MM 40

// ================= CẤU HÌNH MẠNG & API =================
#define DEVICE_ID "SCALE_001"
#define API_RETRY_DELAY 3000 // Chờ 3s nếu API lỗi
// Chú ý: Endpoint mới là submit-kiosk
#define SERVER_URL "https://intellicare-tainh.onrender.com/api/measurements/submit-kiosk"

// Khóa bí mật gửi kèm mọi request tới /api/measurements/** (đã cập nhật khớp với .env local của bạn)
#define DEVICE_API_KEY "tcXb8Fe3MN9lM2BqNGUk09XqlTw_jlcVm9nsgSNoco8"

// MAC của cân Xiaomi Mi Scale
#define TARGET_MAC "34:fa:1c:3b:a7:13"

#endif