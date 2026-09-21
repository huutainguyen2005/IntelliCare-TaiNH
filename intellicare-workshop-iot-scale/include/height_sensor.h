#ifndef HEIGHT_SENSOR_H
#define HEIGHT_SENSOR_H

void height_init();
void height_loop();
float height_get_result();
bool height_is_locked();
void height_reset();

#endif
