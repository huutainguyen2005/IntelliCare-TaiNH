#include "api_client.h"
#include "config.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

void setupWiFi()
{
    Serial.printf("\r\n[WiFi] Dang ket noi toi SSID: %s\r\n", WIFI_SSID);

    // Ngắt toàn bộ kết nối cũ (nếu có) để tránh lỗi kẹt mạng
    WiFi.disconnect(true);
    WiFi.mode(WIFI_STA);
    delay(100);

// KÍCH HOẠT LOGIC THEO LOẠI MẠNG
#if WIFI_AUTH_TYPE == 1
    Serial.println("[WiFi] Che do: OPEN (Khong co mat khau)");
    WiFi.begin(WIFI_SSID);

#elif WIFI_AUTH_TYPE == 2
    Serial.println("[WiFi] Che do: WPA2 Personal (Mat khau tieu chuan)");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

#elif WIFI_AUTH_TYPE == 3
    Serial.println("[WiFi] Che do: WPA2 Enterprise (Tai khoan Sinh vien)");
    // Dùng chuẩn PEAP cho mạng trường học
    WiFi.begin(WIFI_SSID, WPA2_AUTH_PEAP, WIFI_USERNAME, WIFI_USERNAME, WIFI_PASSWORD);

#else
    Serial.println("[WiFi] LOI: WIFI_AUTH_TYPE khong hop le trong config.h!");
#endif

    // Vòng lặp chờ kết nối
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(1000);
        Serial.print(".");
        attempts++;

        // Mạng Enterprise quét khá lâu, cho nó chờ tối đa 20 giây (20 lần)
        if (attempts >= 20)
        {
            Serial.println("\n[WiFi] Qua lau khong the ket noi. Vui long kiem tra lai thong tin Mang!");
            attempts = 0; // Reset đếm để tiếp tục thử
        }
    }

    Serial.println("\n[WiFi] KET NOI THANH CONG!");
    Serial.print("[WiFi] IP ESP32: ");
    Serial.println(WiFi.localIP());
}

bool sendWeightData(float weightKg)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[API] Loi: Mat ket noi WiFi!");
        return false;
    }

    // Render bắt buộc HTTPS (TLS) - dùng WiFiClientSecure thay cho WiFiClient
    // thường. setInsecure() = bỏ qua xác thực chứng chỉ CA (đơn giản, đủ
    // dùng cho đồ án/demo). Muốn chặt chẽ hơn (chống man-in-the-middle),
    // thay bằng client.setCACert(RENDER_ROOT_CA) với đúng chứng chỉ gốc
    // Let's Encrypt/DigiCert mà Render đang dùng.
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    http.begin(client, SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    // Render free tier có thể "ngủ" sau 15 phút không hoạt động, lần gọi
    // đầu tiên sau khi ngủ mất 10-30s để "tỉnh" - timeout mặc định 5s là
    // không đủ. Nếu nâng lên gói trả phí (không bị ngủ), có thể giảm lại.
    http.setTimeout(30000);
    http.setConnectTimeout(30000);

    StaticJsonDocument<200> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["weightKg"] = weightKg;

    String requestBody;
    serializeJson(doc, requestBody);
    Serial.printf("[API] Dang gui: %s\r\n", requestBody.c_str());

    int httpResponseCode = http.POST(requestBody);
    bool success = false;

    if (httpResponseCode > 0)
    {
        String response = http.getString();
        Serial.printf("[API] Ma phan hoi: %d | Body: %s\r\n", httpResponseCode, response.c_str());
        if (httpResponseCode == 200)
            success = true;
    }
    else
    {
        Serial.printf("[API] LOI MANG: %s\r\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
    return success;
}