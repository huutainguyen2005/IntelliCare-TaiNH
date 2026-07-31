#ifndef AUDIO_MANAGER_H
#define AUDIO_MANAGER_H

void audio_init();
void audio_playBoot();   
void audio_playVoice();               // Đọc câu "Đang phân tích"
void audio_speakWeight(float weight); // Phân tích và đọc số cân nặng
void audio_loop();                    // Bơm dữ liệu liên tục
bool audio_isPlaying();               // Kiểm tra loa có đang bận hát

#endif