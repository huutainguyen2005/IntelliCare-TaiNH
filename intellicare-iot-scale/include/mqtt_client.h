#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H

#include <Arduino.h>

// Gọi 1 lần trong setup()
void mqtt_setup();

// Gọi liên tục trong loop() - giữ kết nối sống & tự reconnect khi rớt mạng
void mqtt_loop();

// Publish 1 lần cân đã chốt số lên topic "scale/<DEVICE_ID>/weight"
bool mqtt_publishWeight(float weightKg);

#endif
