#ifndef WEIGHT_SENSOR_H
#define WEIGHT_SENSOR_H

#include <Arduino.h>

void sensor_init();
float sensor_getWeight();
bool sensor_isConnected();
void sensor_tare();
#endif