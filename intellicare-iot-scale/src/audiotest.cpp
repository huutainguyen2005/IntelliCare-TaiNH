#include <Arduino.h>
#include <driver/i2s.h>

// BỘ CHÂN MỚI SIÊU AN TOÀN CHO ESP32-S3
#define I2S_LRC  15  // Dịch từ 10 sang 15
#define I2S_BCLK 16  // Dịch từ 11 sang 16
#define I2S_DOUT 17  // Dịch từ 12 sang 17

void setup() {
  Serial.begin(9600);
  delay(1000);
  Serial.println("=== TEST I2S TREN CHAN MOI (15, 16, 17) ===");

  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = 44100,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 64,
    .use_apll = false,
    .tx_desc_auto_clear = true,
    .fixed_mclk = 0
  };

  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCLK,
    .ws_io_num = I2S_LRC,
    .data_out_num = I2S_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };

  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);
  
  Serial.println("Da thiet lap xong I2S. Chuan bi phat am thanh...");
}

void loop() {
  size_t bytes_written;
  int16_t samples[64];

  Serial.println("-> Dang phat tieng Bip...");
  
  for (int j = 0; j < 400; j++) {
    for (int i = 0; i < 64; i++) {
      // Âm lượng 4000. Nếu rụt rè quá bạn có thể sửa thành 10000 cho nó kêu to lên
      samples[i] = (i % 32 < 16) ? 4000 : -4000; 
    }
    i2s_write(I2S_NUM_0, samples, sizeof(samples), &bytes_written, portMAX_DELAY);
  }

  Serial.println("-> Ngat am thanh 0.5 giay...");
  
  for (int j = 0; j < 400; j++) {
    for (int i = 0; i < 64; i++) {
      samples[i] = 0; 
    }
    i2s_write(I2S_NUM_0, samples, sizeof(samples), &bytes_written, portMAX_DELAY);
  }
}