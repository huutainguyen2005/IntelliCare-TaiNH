#include "api_client.h"
#include "config.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <Preferences.h>
#include <DNSServer.h>
#include <esp_system.h> // Thêm thư viện để kiểm tra lý do khởi động mạch

Preferences preferences;
WebServer server(80);
DNSServer dnsServer;
const byte DNS_PORT = 53;

// Giao diện Web Portal siêu nhẹ
const char *htmlPage = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta charset="UTF-8">
  <title>Kết nối Wi-Fi cho thiết bị IntelliCare-SCALE_001</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f9; text-align: center; margin-top: 40px; }
    .container { background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); display: inline-block; width: 85%; max-width: 350px; }
    input[type=text], input[type=password] { width: 90%; padding: 12px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
    input[type=submit] { background-color: #4CAF50; color: white; padding: 14px 20px; margin: 10px 0; border: none; border-radius: 5px; cursor: pointer; width: 90%; font-weight: bold; }
    input[type=submit]:hover { background-color: #45a049; }
    .note { font-size: 12px; color: #666; text-align: left; margin-left: 5%; }
    .section-title { text-align: left; margin-left: 5%; color: #333; font-size: 14px; margin-bottom: -5px; margin-top: 15px;}
  </style>
</head>
<body>
  <div class="container">
    <h2>Cấu hình Wi-Fi</h2>
    <form action="http://192.168.4.1/save" method="POST">
      <div class="section-title">1. Kết nối Wi-Fi</div>
      <input type="text" name="ssid" placeholder="Tên Wi-Fi (SSID)" required><br>
      <input type="password" name="pass" placeholder="Mật khẩu"><br>
      <input type="text" name="user" placeholder="Username"><br>
      <p class="note">* Bỏ trống Username nếu dùng Wi-Fi cá nhân.</p>
      
      <div class="section-title">2. Kết nối Server (API)</div>
      <input type="text" name="server_ip" placeholder="Để trống nếu dùng Server chính thức (Render)"><br>
      <p class="note">* Chỉ điền khi test Server chạy trên máy cá nhân cùng mạng LAN (VD: 192.168.x.x). Để trống = tự dùng Server chính thức.</p><br>
      <p class="note">* Mở cmd gõ ipconfig để xem IPv4 Address.</p>

      <input type="submit" value="Save & Restart">
    </form>
  </div>
</body>
</html>
)rawliteral";

void setupWiFi()
{
    Serial.println("\r\n[WiFi] Khoi dong trinh quan ly Mang...");

    preferences.begin("wifi_config", false);

    // ========================================================
    // TÍNH NĂNG: TỰ ĐỘNG QUÊN MẠNG KHI RÚT ĐIỆN
    // ========================================================
    esp_reset_reason_t reason = esp_reset_reason();

    // ESP_RST_SW là mã khi khởi động lại bằng phần mềm (Lệnh ESP.restart())
    // Nếu lý do khác ESP_RST_SW (Nghĩa là bạn vừa cắm nguồn hoặc bấm nút Reset cứng)
    if (reason != ESP_RST_SW)
    {
        preferences.clear(); // XÓA SẠCH BỘ NHỚ WIFI VÀ IP
        Serial.println("[WiFi] Phat hien cam dien moi -> DA XOA CAU HINH CU!");
    }
    else
    {
        Serial.println("[WiFi] Mach vua tu khoi dong lai -> GIU NGUYEN CAU HINH!");
    }
    // ========================================================

    String saved_ssid = preferences.getString("ssid", "");
    String saved_pass = preferences.getString("pass", "");
    String saved_user = preferences.getString("user", "");
    String saved_ip = preferences.getString("server_ip", "");

    if (saved_ssid != "")
    {
        Serial.printf("[WiFi] Dang thu ket noi mang: %s\n", saved_ssid.c_str());
        WiFi.mode(WIFI_STA);
        WiFi.setAutoReconnect(true); // BẬT TỰ ĐỘNG KẾT NỐI LẠI KHI CÓ MẠNG LẠI

        if (saved_user != "")
        {
            Serial.println("[WiFi] Che do: WPA2 Enterprise (Mang Truong hoc)");
            WiFi.begin(saved_ssid.c_str(), WPA2_AUTH_PEAP, saved_user.c_str(), saved_user.c_str(), saved_pass.c_str());
        }
        else
        {
            Serial.println("[WiFi] Che do: WPA2 Personal (Mang Ca nhan)");
            WiFi.begin(saved_ssid.c_str(), saved_pass.c_str());
        }

        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 15)
        {
            delay(1000);
            Serial.print(".");
            attempts++;
        }

        if (WiFi.status() == WL_CONNECTED)
        {
            preferences.end(); // Đóng bộ nhớ khi không dùng nữa
            Serial.println("\n[WiFi] KET NOI THANH CONG!");
            Serial.print("[WiFi] IP cua Can: ");
            Serial.println(WiFi.localIP());
            Serial.print("[API] IP Server da luu: ");
            Serial.println(saved_ip);
            return;
        }

        Serial.println("\n[WiFi] Ket noi that bai! Chuyen sang che do AP...");
    }

    // ====== CHẾ ĐỘ PHÁT WI-FI (CAPTIVE PORTAL) ======
    WiFi.disconnect();
    WiFi.mode(WIFI_AP);
    WiFi.softAP("IntelliCare-SCALE_001", NULL, 6);

    dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

    Serial.println("\n[WiFi] DA PHAT WI-FI SETUP!");
    Serial.println("[WiFi] 1. Ket noi dien thoai vao mang: IntelliCare-SCALE_001");
    Serial.print("[WiFi] 2. Mo trinh duyet, truy cap IP: ");
    Serial.println(WiFi.softAPIP());

    server.on("/", HTTP_GET, []()
              { server.send(200, "text/html", htmlPage); });

    server.on("/save", HTTP_ANY, []()
              {
                  String new_ssid = server.arg("ssid");
                  String new_pass = server.arg("pass");
                  String new_user = server.arg("user"); 
                  String new_ip = server.arg("server_ip"); 

                  Serial.println("\n====================================");
                  Serial.println("[WiFi] NHAN DU LIEU TU DIEN THOAI:");
                  Serial.println("SSID: " + new_ssid);
                  Serial.println("PASS: " + new_pass);
                  Serial.println("USER: " + new_user);
                  Serial.println("IP  : " + new_ip);
                  Serial.println("====================================");

                  if(new_ssid.length() > 0) 
                  {
                      preferences.putString("ssid", new_ssid);
                      preferences.putString("pass", new_pass);
                      preferences.putString("user", new_user);
                      preferences.putString("server_ip", new_ip);
                      
                      preferences.end(); 

                      server.send(200, "text/html", "<h3>Da luu thanh cong! Can se tu dong khoi dong lai...</h3>");
                      Serial.println("[WiFi] Da chot luu vao Flash. Dang Restart sau 2 giay...");
                      delay(2000);
                      ESP.restart(); 
                  }
                  else 
                  {
                      server.send(400, "text/html", "<h3>LOI: Ten Wi-Fi (SSID) bi trong! Vui long nhan nut Back quay lai.</h3>");
                  } });

    server.onNotFound([]()
                      {
        server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString() + "/", true);
        server.send(302, "text/plain", ""); });

    server.begin();

    while (true)
    {
        dnsServer.processNextRequest();
        server.handleClient();
        delay(10);
    }
}

bool sendWeightData(float weightKg)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[API] Loi: Mat ket noi WiFi!");
        return false;
    }

    preferences.begin("wifi_config", true);
    String serverIp = preferences.getString("server_ip", "");
    preferences.end();

    String full_url;
    bool useHttps;

    // Nếu bỏ trống HOẶC người dùng lỡ gõ thẳng domain production vào ô
    // "IPv4 Address" -> LUÔN dùng đúng SERVER_URL (HTTPS) định nghĩa sẵn
    // trong config.h. Chỉ khi gõ đúng 1 IP local (dạng 192.168.x.x hoặc
    // 10.x.x.x...) mới build URL HTTP cho mục đích test mạng LAN nội bộ.
    bool looksLikeLocalIp = serverIp.length() > 0 &&
                            (serverIp.indexOf("192.168.") == 0 ||
                             serverIp.indexOf("10.") == 0 ||
                             serverIp.indexOf("172.") == 0);

    if (looksLikeLocalIp)
    {
        full_url = "http://" + serverIp + ":8080/api/measurements/submit";
        useHttps = false;
        Serial.println("[API] Dung IP LOCAL (HTTP, test mang LAN noi bo)");
    }
    else
    {
        full_url = SERVER_URL; // https://intellicare-tainh.onrender.com/...
        useHttps = true;
        Serial.println("[API] Dung SERVER_URL production (HTTPS Render)");
    }

    HTTPClient http;
    WiFiClientSecure secureClient;

    if (useHttps)
    {
        // Bỏ qua xác thực chứng chỉ CA (đủ dùng cho đồ án/demo). Muốn chặt
        // chẽ hơn, thay bằng secureClient.setCACert(RENDER_ROOT_CA).
        secureClient.setInsecure();
        http.begin(secureClient, full_url);
    }
    else
    {
        http.begin(full_url);
    }

    http.addHeader("Content-Type", "application/json");
    // Render free tier có thể "ngủ" sau 15 phút không hoạt động, lần gọi
    // đầu tiên sau khi ngủ mất 10-30s để "tỉnh" - 1000ms là chắc chắn timeout.
    http.setTimeout(30000);
    http.setConnectTimeout(30000);

    StaticJsonDocument<200> doc;
    doc["deviceId"] = DEVICE_ID;
    doc["weightKg"] = weightKg;

    String requestBody;
    serializeJson(doc, requestBody);
    Serial.printf("[API] Dang gui den %s: %s\r\n", full_url.c_str(), requestBody.c_str());

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