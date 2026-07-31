#include "display_ui.h"
#include "config.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Đã sửa lại cấu hình thành 16 cột, 2 hàng
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Biến quản lý nhấp nháy
unsigned long lastBlinkTime = 0;
const int BLINK_INTERVAL = 1500;
bool toggleScreen = false;
int lastScreenId = 0;

void ui_init()
{
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  lcd.init();
  lcd.backlight();
}

void ui_showBooting()
{
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  HE THONG CAN  ");
  lcd.setCursor(0, 1);
  lcd.print("Dang ket noi... ");
}

void ui_showSensorInit()
{
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("  HE THONG CAN  ");
  lcd.setCursor(0, 1);
  lcd.print("Khoi dong Cam...");
}

void ui_showDisconnectError()
{
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("! MAT KET NOI ! ");
  lcd.setCursor(0, 1);
  lcd.print(" Kiem tra day!  ");
}

void ui_update(float currentWeight, bool isDisplayingError)
{
  int currentScreenId = 1;

  // Xử lý logic nhấp nháy đan xen nếu có lỗi
  if (isDisplayingError)
  {
    if (millis() - lastBlinkTime > BLINK_INTERVAL)
    {
      toggleScreen = !toggleScreen;
      lastBlinkTime = millis();
    }
    currentScreenId = toggleScreen ? 2 : 1;
  }
  else
  {
    toggleScreen = false;
    currentScreenId = 1;
  }

  // Clear màn hình mượt mà
  if (currentScreenId != lastScreenId)
  {
    lcd.clear();
    lastScreenId = currentScreenId;
  }

  // Vẽ giao diện (Giới hạn tối đa 16 ký tự)
  if (currentScreenId == 1)
  {
    lcd.setCursor(0, 0);
    lcd.print("* TRONG LUONG * ");
    lcd.setCursor(0, 1);

    // Thuật toán canh giữa số cân nặng tự động
    String weightStr = String(currentWeight, 3) + " kg";
    int padding = (16 - weightStr.length()) / 2; // Chia đều khoảng trắng 2 bên

    String displayStr = "";
    for (int i = 0; i < padding; i++)
      displayStr += " ";
    displayStr += weightStr;

    // Bơm thêm khoảng trắng phía sau để ghi đè xóa sạch số cũ
    while (displayStr.length() < 16)
      displayStr += " ";

    lcd.print(displayStr);
  }
  else if (currentScreenId == 2)
  {
    lcd.setCursor(0, 0);
    lcd.print("! LOI DONG BO ! ");
    lcd.setCursor(0, 1);
    lcd.print("  QUET MA QR!   ");
  }
}