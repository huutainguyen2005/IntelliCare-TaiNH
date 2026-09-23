#ifndef CONFIG_H
#define CONFIG_H

// ================= CAU HINH PHAN CUNG =================
// Chan I2C (Cam bien laser VL53L1X - do chieu cao)
#define I2C_SDA_PIN 8
#define I2C_SCL_PIN 9

// ================= CAU HINH DO CHIEU CAO =================
#define HEIGHT_OFFSET_MM 85
#define SCALE_THICKNESS_MM 40

// ================= CAU HINH MANG & API - RIENG CHO WORKSHOP =================
#define DEVICE_ID "WORKSHOP_SCALE_01"
#define API_RETRY_DELAY 3000

// Backend deploy tren Render: https://intellicare-tainh-1.onrender.com
#define SERVER_URL "https://intellicare-tainh-1.onrender.com/api/workshop/measurements/submit"
#define SUBMIT_PATH "/api/workshop/measurements/submit"

// Khop dung DEVICE_API_KEY trong .env / bien moi truong Render cua backend
#define DEVICE_API_KEY "J9cBoTajOm2GSu-53EyPLKzZRMsyWnYTgsM3bMP0mD4"

// MAC cua can Xiaomi Mi Scale dung cho su kien Workshop
#define TARGET_MAC "34:fa:1c:3b:a7:13"

#endif
