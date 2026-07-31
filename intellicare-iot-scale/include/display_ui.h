#ifndef DISPLAY_UI_H
#define DISPLAY_UI_H

#include <Arduino.h>

void ui_init();
void ui_showBooting();
void ui_showSensorInit();
void ui_showDisconnectError();
void ui_update(float currentWeight, bool isDisplayingError);

#endif