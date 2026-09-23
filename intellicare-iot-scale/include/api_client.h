#ifndef API_CLIENT_H
#define API_CLIENT_H

#include <Arduino.h>

void setupWiFi();
bool sendKioskData(String rawHex, float heightCm);

#endif