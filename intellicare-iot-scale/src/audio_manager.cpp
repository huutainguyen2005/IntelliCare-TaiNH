#include "audio_manager.h"
#include "config.h"
#include <LittleFS.h>
#include <AudioGeneratorMP3.h>
#include <AudioOutputI2S.h>
#include <AudioFileSourceLittleFS.h>
#include <queue>

AudioGeneratorMP3 *mp3;
AudioFileSourceLittleFS *file;
AudioOutputI2S *out;

bool isPlaying = false;
std::queue<String> audioQueue;

void audio_init()
{
    // ÉP LITTLEFS TỰ ĐỘNG FORMAT NẾU CHƯA CÓ PHÂN VÙNG
    if (!LittleFS.begin(true))
    {
        Serial.println("[AUDIO] LOI: Khong the khoi tao o dia LittleFS. He thong dang thu Format lai...");
        delay(1000);
    }
    else
    {
        Serial.println("[AUDIO] Khoi tao o dia LittleFS thanh cong!");
    }

    out = new AudioOutputI2S();
    out->SetPinout(I2S_BCLK_PIN, I2S_LRC_PIN, I2S_DOUT_PIN);
    out->SetGain(1.0);
    mp3 = new AudioGeneratorMP3();
}

void playNextInQueue()
{
    if (audioQueue.empty())
    {
        isPlaying = false;
        return;
    }

    String nextFile = audioQueue.front();
    audioQueue.pop();

    if (file)
    {
        delete file;
        file = nullptr;
    }

    // KIỂM TRA FILE CÓ TỒN TẠI KHÔNG TRƯỚC KHI MỞ
    if (LittleFS.exists(nextFile.c_str()))
    {
        file = new AudioFileSourceLittleFS(nextFile.c_str());
        mp3->begin(file, out);
        isPlaying = true;
        Serial.println("[AUDIO] Dang phat MP3: " + nextFile);
    }
    else
    {
        Serial.println("[AUDIO] LOI KHONG TIM THAY FILE: " + nextFile);
        // Bỏ qua file lỗi (vd thiếu file linh.mp3), đi tiếp file tiếp theo trong hàng đợi
        playNextInQueue();
    }
}
void audio_playBoot()
{
    audioQueue.push("/boot.mp3");
    playNextInQueue();
}
void audio_playVoice()
{
    while (!audioQueue.empty())
        audioQueue.pop();
    audioQueue.push("/phan_tich.mp3");

    if (mp3->isRunning())
        mp3->stop();
    playNextInQueue();
}

// ==============================================================
// THUẬT TOÁN ĐỌC SỐ TỰ NHIÊN CHUẨN NGỮ PHÁP TIẾNG VIỆT (1 -> 999)
// ==============================================================
void pushNaturalNumber(int num)
{
    if (num == 0)
        return;

    int tram = num / 100;
    int chuc = (num % 100) / 10;
    int donvi = num % 10;

    // 1. Xử lý Hàng Trăm
    if (tram > 0)
    {
        audioQueue.push("/" + String(tram) + ".mp3");
        audioQueue.push("/tram.mp3");

        // Đọc chữ "lẻ" nếu hàng chục = 0 và đơn vị > 0 (VD: Chín trăm lẻ năm)
        if (chuc == 0 && donvi > 0)
        {
            audioQueue.push("/linh.mp3");
        }
    }

    // 2. Xử lý Hàng Chục
    if (chuc > 0)
    {
        if (chuc == 1)
        {
            audioQueue.push("/10.mp3"); // Đọc là "Mười"
        }
        else
        {
            audioQueue.push("/" + String(chuc) + ".mp3");
            audioQueue.push("/muoi.mp3"); // Đọc là "Mươi" (VD: 2 mươi)
        }
    }

    // 3. Xử lý Hàng Đơn Vị
    if (donvi > 0)
    {
        if (chuc > 0 && donvi == 5)
        {
            audioQueue.push("/lam.mp3"); // 15, 25 đọc là "lăm"
        }
        else if (chuc > 1 && donvi == 1)
        {
            audioQueue.push("/mot.mp3"); // 21, 31 đọc là "mốt"
        }
        else if (chuc == 1 && donvi == 1)
        {
            audioQueue.push("/1.mp3"); // 11 vẫn đọc là "mười một"
        }
        else if (chuc == 0 && donvi > 0)
        {
            audioQueue.push("/" + String(donvi) + ".mp3"); // lẻ 1, lẻ 2
        }
        else
        {
            audioQueue.push("/" + String(donvi) + ".mp3"); // Các số bình thường
        }
    }
}

void audio_speakWeight(float weight)
{
    // Đổi ra gram và làm tròn để tránh sai số thập phân của chip
    long totalGrams = round(weight * 1000.0);

    int intPart = totalGrams / 1000;     // Phần Ký (Trước dấu phẩy)
    int decimalPart = totalGrams % 1000; // Phần Gram (Sau dấu phẩy)

    // --- ĐỌC PHẦN NGUYÊN (KÝ) ---
    if (intPart == 0)
    {
        audioQueue.push("/0.mp3");
    }
    else
    {
        pushNaturalNumber(intPart);
    }

    // --- ĐỌC PHẦN THẬP PHÂN ---
    if (decimalPart > 0)
    {
        audioQueue.push("/phay.mp3");

        // Tách 3 chữ số để xử lý các con số 0 đứng sát dấu phẩy
        int d1 = (decimalPart / 100) % 10;
        int d2 = (decimalPart / 10) % 10;
        int d3 = decimalPart % 10;

        if (d1 == 0)
        {
            audioQueue.push("/0.mp3"); // VD: 0.0xx -> Đọc "Không"
            if (d2 == 0)
            {
                audioQueue.push("/0.mp3");                  // VD: 0.00x -> Đọc "Không"
                audioQueue.push("/" + String(d3) + ".mp3"); // VD 0.005 -> "Không phẩy không không năm"
            }
            else
            {
                pushNaturalNumber(d2 * 10 + d3); // VD: 0.015 -> "Không phẩy không mười lăm"
            }
        }
        else
        {
            // Nút thắt của bạn nằm đây: Đọc phần thập phân tự nhiên như tiếng Việt
            pushNaturalNumber(decimalPart); // VD: 0.916 -> "Không phẩy chín trăm mười sáu"
        }
    }

    // Chốt đuôi đơn vị đo
    audioQueue.push("/kylogam.mp3");

    if (!isPlaying)
    {
        playNextInQueue();
    }
}

void audio_loop()
{
    if (isPlaying)
    {
        if (mp3->isRunning())
        {
            if (!mp3->loop())
            {
                mp3->stop();
                // MẸO CHỐNG NUỐT ÂM: Cho IC I2S 100ms để đẩy nốt nhạc cuối cùng ra màng loa
                delay(100);
                playNextInQueue();
            }
        }
        else
        {
            playNextInQueue();
        }
    }
}

bool audio_isPlaying()
{
    return isPlaying || !audioQueue.empty();
}