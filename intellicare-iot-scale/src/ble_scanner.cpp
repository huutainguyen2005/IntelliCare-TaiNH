#include "ble_scanner.h"
#include "config.h"
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

BLEScan *pBLEScan;

#define QUEUE_SIZE 12
String queueBuf[QUEUE_SIZE];
volatile int queueHead = 0;
volatile int queueTail = 0;

#define DEDUP_SIZE 8
String recentHex[DEDUP_SIZE];
int recentIdx = 0;

bool isDuplicate(const String &hex)
{
    for (int i = 0; i < DEDUP_SIZE; i++)
        if (recentHex[i] == hex)
            return true;
    recentHex[recentIdx] = hex;
    recentIdx = (recentIdx + 1) % DEDUP_SIZE;
    return false;
}

void enqueue(const String &hex)
{
    int next = (queueTail + 1) % QUEUE_SIZE;
    if (next == queueHead)
        return; // đầy, bỏ qua
    queueBuf[queueTail] = hex;
    queueTail = next;
}

bool ble_get_frame(String &outHex)
{
    if (queueHead == queueTail)
        return false;
    outHex = queueBuf[queueHead];
    queueHead = (queueHead + 1) % QUEUE_SIZE;
    return true;
}

class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks
{
    void onResult(BLEAdvertisedDevice advertisedDevice)
    {
        if (advertisedDevice.getAddress().toString() != TARGET_MAC)
            return;
        if (!advertisedDevice.haveServiceData())
            return;

        int count = advertisedDevice.getServiceDataCount();
        for (int i = 0; i < count; i++)
        {
            if (!advertisedDevice.getServiceDataUUID(i).equals(BLEUUID((uint16_t)0xFE95)))
                continue;

            std::string strData = advertisedDevice.getServiceData(i);
            uint8_t *cData = (uint8_t *)strData.data();
            if (strData.length() < 13)
                continue;

            // Chỉ lấy frame có bit "object include"
            if ((cData[0] & 0x40) == 0)
                continue;

            String rawHex = "";
            for (size_t j = 0; j < strData.length(); j++)
            {
                char hex[3];
                sprintf(hex, "%02X", cData[j]);
                rawHex += hex;
            }

            if (isDuplicate(rawHex))
                return;

            Serial.printf("[BLE] Frame length=%d hex=%s\n", strData.length(), rawHex.c_str());
            enqueue(rawHex);
        }
    }
};

void ble_init()
{
    Serial.println("[BLE] Khoi tao module BLE...");
    BLEDevice::init("");
    pBLEScan = BLEDevice::getScan();
    pBLEScan->setAdvertisedDeviceCallbacks(new MyAdvertisedDeviceCallbacks());
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);
}

void ble_scan_loop()
{
    // Quét mỗi giây
    pBLEScan->start(1, false);
    pBLEScan->clearResults();
}
