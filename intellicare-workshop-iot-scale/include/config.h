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

// TODO: dien dung domain that sau khi deploy xong intellicare-workshop-backend
#define SERVER_URL "https://<DIEN-DOMAIN-WORKSHOP-BACKEND-THAT-VAO-DAY>/api/workshop/measurements/submit"
#define SUBMIT_PATH "/api/workshop/measurements/submit"

// PHAI khop dung DEVICE_API_KEY da set trong .env cua intellicare-workshop-backend
#define DEVICE_API_KEY "<DIEN-DEVICE-API-KEY-CUA-WORKSHOP-BACKEND-VAO-DAY>"

// MAC cua can Xiaomi Mi Scale dung cho su kien Workshop
#define TARGET_MAC "34:fa:1c:3b:a7:13"

#endif
