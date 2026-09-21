#ifndef BLE_SCANNER_H
#define BLE_SCANNER_H

#include <Arduino.h>

void ble_init();
void ble_scan_loop();
bool ble_get_frame(String &outHex);

#endif
