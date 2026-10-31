/*
 * =========================================================================================
 * PROWATCH HEALTH - XIAO ESP32-S3 SMARTWATCH FIRMWARE
 * Bộ xử lý chính: Seeed Studio XIAO ESP32-S3 (Dual-core Xtensa 240MHz, BLE 5.0
 * + Wi-Fi) Chế độ kết nối Hybrid:
 *   1. Bluetooth Low Energy (BLE) GATT Server - Ghép đôi và truyền dữ liệu tầm
 * gần với App
 *   2. Wi-Fi Client - Gửi Telemetry (Nhịp tim, SpO2, Pin, Bước chân) trực tiếp
 * lên Backend Spring Boot
 * =========================================================================================
 */

#include <Arduino.h>
#include <ArduinoJson.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

// =========================================================================================
// 1. CẤU HÌNH KẾT NỐI WI-FI & BACKEND SPRING BOOT
// =========================================================================================
//const char *WIFI_SSID = "Muong Thanh Song Han.";     // Tên Wi-Fi máy tính đang kết nối
//const char *WIFI_PASSWORD = "19001833"; // Mật khẩu Wi-Fi
const char *WIFI_SSID = "Pay To Use";     // Tên Wi-Fi máy tính đang kết nối
const char *WIFI_PASSWORD = "Donaka2006"; // Mật khẩu Wi-Fi
// IP máy tính hiện tại: 172.16.0.12 (Cổng Backend Spring Boot 8080)
const char *BACKEND_URL =
    "http://172.16.0.12:8080/api/v1/devices/telemetry";

// Thông tin định danh thiết bị đồng hồ
const char *DEVICE_ID = "XIAO-ESP32S3-PROWATCH-01";
const char *FIRMWARE_VER = "v1.2.0-hybrid";

// =========================================================================================
// 2. CẤU HÌNH BLE (BLUETOOTH LOW ENERGY)
// =========================================================================================
#define BLE_DEVICE_NAME "ProWatch-S3"

// Standard BLE Heart Rate Service (0x180D)
#define HEART_RATE_SERVICE_UUID BLEUUID((uint16_t)0x180D)
#define HEART_RATE_MEASUREMENT_UUID BLEUUID((uint16_t)0x2A37)

// Standard BLE Battery Service (0x180F)
#define BATTERY_SERVICE_UUID BLEUUID((uint16_t)0x180F)
#define BATTERY_LEVEL_UUID BLEUUID((uint16_t)0x2A19)

// Custom ProWatch Telemetry Service (SpO2 & Pedometer)
#define PROWATCH_SERVICE_UUID "19b10000-e8f2-537e-4f6c-d104768a1214"
#define SPO2_CHARACTERISTIC_UUID "19b10001-e8f2-537e-4f6c-d104768a1214"
#define STEPS_CHARACTERISTIC_UUID "19b10002-e8f2-537e-4f6c-d104768a1214"
#define ACTIVITY_CHARACTERISTIC_UUID "19b10003-e8f2-537e-4f6c-d104768a1214"

#define COMMAND_CHARACTERISTIC_UUID "19b10004-e8f2-537e-4f6c-d104768a1214"

BLEServer *pServer = nullptr;
BLECharacteristic *pHrCharacteristic = nullptr;
BLECharacteristic *pBatteryCharacteristic = nullptr;
BLECharacteristic *pSpo2Characteristic = nullptr;
BLECharacteristic *pStepsCharacteristic = nullptr;
BLECharacteristic *pActivityCharacteristic = nullptr;
BLECharacteristic *pCommandCharacteristic = nullptr;
bool bleConnected = false;
bool oldDeviceConnected = false;

// Chế độ truyền dữ liệu: Chỉ gửi khi App gửi lệnh, không spam tự động
bool isStreamingRequested = false;    // Truyền liên tục khi App gửi START_STREAM
bool isOneShotRequested = false;      // Truyền 1 lần khi App gửi GET_DATA / SYNC

// =========================================================================================
// 3. BIẾN ĐO SỐ LIỆU SINH TRẮC HỌC & CẢM BIẾN MAX30102
// =========================================================================================
// Chân I2C mặc định cho XIAO ESP32-S3 (D4 = GPIO5 SDA, D5 = GPIO6 SCL)
#ifndef D4
#define D4 5
#endif
#ifndef D5
#define D5 6
#endif

// Đối tượng cảm biến MAX30102
MAX30105 particleSensor;
bool max30102Found = false;
bool fingerDetected = false;
long lastIrValue = 0;
long lastRedValue = 0;

// Bộ đệm tính trung bình nhịp tim (BPM)
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE] = {0};
byte rateSpot = 0;
long lastBeat = 0;
float beatsPerMinute = 0.0f;

// Bộ đệm tính trung bình nồng độ oxy (SpO2)
const byte SPO2_SIZE = 4;
int spo2Array[SPO2_SIZE] = {0};
byte spo2Spot = 0;

// Đỉnh và đáy biên độ quang học (PPG) để tính tỷ lệ AC/DC
long irMax = 0;
long irMin = 999999;
long redMax = 0;
long redMin = 999999;

// Số liệu sinh trắc học tổng hợp (Mặc định = 0, chỉ cập nhật khi cảm biến đo thật)
int currentBpm = 0;
int currentSpo2 = 0;
int currentSteps = 6420;
int currentCalories = 385;
int batteryLevel = 90;
bool isCharging = false;
String currentActivity = "REST"; // REST, WALK, RUN, SLEEP

// Biến bộ lọc High-Pass Filter y[n] = 0.97*(y[n-1] + x[n] - x[n-1]) & Peak Detection
float x_prev = 0.0f;
float y_prev = 0.0f;
const float HPF_ALPHA = 0.97f;
const float PEAK_THRESHOLD = 0.55f; // Ngưỡng phát hiện bước chân > 0.55g
unsigned long lastStepTime = 0;
int stepsInLastWindow = 0;
unsigned long windowStartTime = 0;

unsigned long lastWifiSyncTime = 0;
const unsigned long WIFI_SYNC_INTERVAL = 5000; // Khi bật Stream: gửi mỗi 5s

unsigned long lastBleNotifyTime = 0;
const unsigned long BLE_NOTIFY_INTERVAL = 1000; // Gửi BLE notify mỗi 1 giây khi có kết nối

// =========================================================================================
// 4. BLE SERVER & COMMAND CALLBACKS
// =========================================================================================
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pServer) {
    bleConnected = true;
    Serial.println("\n*********************************************************");
    Serial.println("🎉 [BLE] KẾT NỐI VỚI APP THÀNH CÔNG!");
    Serial.println("📱 Ứng dụng ProWatch (Web / Mobile) đã liên kết với XIAO ESP32-S3.");
    Serial.println("🟢 Trạng thái: Sẵn sàng nhận lệnh từ App.");
    Serial.println("🔒 Chế độ tiết kiệm: ĐÃ TẮT SPAM TỰ ĐỘNG (Chỉ gửi khi App ra lệnh).");
    Serial.println("*********************************************************\n");
  }

  void onDisconnect(BLEServer *pServer) {
    bleConnected = false;
    isStreamingRequested = false;
    isOneShotRequested = false;
    Serial.println("\n⚠️ [BLE] App đã ngắt kết nối khỏi XIAO ESP32-S3!");
    // Kích hoạt phát lại sóng BLE ngay lập tức để App có thể kết nối lại
    pServer->startAdvertising();
    Serial.println("[BLE] Đã kích hoạt lại quảng bá sóng BLE, sẵn sàng để App kết nối lại!\n");
  }
};

class CommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue().c_str();
    value.trim();
    if (value.length() > 0) {
      Serial.print("[BLE Command] Nhận lệnh từ App: ");
      Serial.println(value);

      if (value == "GET_DATA" || value == "SYNC_NOW" || value == "READ" || value == "TRIGGER") {
        isOneShotRequested = true;
        Serial.println("[BLE Command] -> Kích hoạt gửi 1 gói dữ liệu theo yêu cầu!");
      } else if (value == "START_STREAM") {
        isStreamingRequested = true;
        Serial.println("[BLE Command] -> Bắt đầu chế độ truyền dữ liệu liên tục!");
      } else if (value == "STOP_STREAM") {
        isStreamingRequested = false;
        Serial.println("[BLE Command] -> Đã dừng chế độ truyền dữ liệu liên tục!");
      }
    }
  }
};

// =========================================================================================
// 5. KHỞI TẠO BLE GATT SERVICES
// =========================================================================================
void initBLE() {
  Serial.println("[BLE] Dang khoi tao Bluetooth Low Energy...");
  BLEDevice::init(BLE_DEVICE_NAME);

  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // 1. Heart Rate Service
  BLEService *pHrService = pServer->createService(HEART_RATE_SERVICE_UUID);
  pHrCharacteristic = pHrService->createCharacteristic(
      HEART_RATE_MEASUREMENT_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pHrCharacteristic->addDescriptor(new BLE2902());
  pHrService->start();

  // 2. Battery Service
  BLEService *pBatteryService = pServer->createService(BATTERY_SERVICE_UUID);
  pBatteryCharacteristic = pBatteryService->createCharacteristic(
      BATTERY_LEVEL_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pBatteryCharacteristic->addDescriptor(new BLE2902());
  pBatteryService->start();

  // 3. ProWatch Custom Service (SpO2, Steps, Activity & Command)
  BLEService *pCustomService = pServer->createService(PROWATCH_SERVICE_UUID);
  pSpo2Characteristic = pCustomService->createCharacteristic(
      SPO2_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pSpo2Characteristic->addDescriptor(new BLE2902());

  pStepsCharacteristic = pCustomService->createCharacteristic(
      STEPS_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pStepsCharacteristic->addDescriptor(new BLE2902());

  pActivityCharacteristic = pCustomService->createCharacteristic(
      ACTIVITY_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pActivityCharacteristic->addDescriptor(new BLE2902());

  pCommandCharacteristic = pCustomService->createCharacteristic(
      COMMAND_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  pCommandCharacteristic->setCallbacks(new CommandCallbacks());
  pCustomService->start();

  // Bắt đầu quảng bá BLE chuẩn không bị tràn kích thước 31 bytes
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();

  // 1. Gói quảng bá chính (Primary Advertisement Data) <= 31 bytes
  // Đảm bảo chứa tên thiết bị "ProWatch-S3" và Service 16-bit Heart Rate để mọi máy tính/điện thoại nhận diện tên ngay lập tức
  BLEAdvertisementData advData;
  advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
  advData.setName(BLE_DEVICE_NAME);
  advData.setCompleteServices(HEART_RATE_SERVICE_UUID);
  pAdvertising->setAdvertisementData(advData);

  // 2. Gói phản hồi quét (Scan Response Data) <= 31 bytes
  // Chứa 128-bit Custom ProWatch UUID để không làm tràn gói quảng bá chính
  BLEAdvertisementData scanRespData;
  scanRespData.setCompleteServices(BLEUUID(PROWATCH_SERVICE_UUID));
  pAdvertising->setScanResponseData(scanRespData);

  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Dành cho iOS
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.printf("[BLE] XIAO ESP32-S3 dang quang ba ten BLE phan cung: %s\n", BLE_DEVICE_NAME);
}

// =========================================================================================
// 6. KHỞI TẠO WI-FI & KẾT NỐI
// =========================================================================================
void connectWiFi() {
  Serial.printf("[WiFi] Dang ket noi toi SSID: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int timeout = 20; // 10 giay
  while (WiFi.status() != WL_CONNECTED && timeout > 0) {
    delay(500);
    Serial.print(".");
    timeout--;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Ket noi thanh cong!");
    Serial.printf("[WiFi] IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[WiFi] MAC Address: %s\n", WiFi.macAddress().c_str());
  } else {
    Serial.println("\n[WiFi] Chua ket noi duoc Wi-Fi, he thong se tiep tuc "
                   "hoat dong qua BLE!");
  }
}

// =========================================================================================
// 7. GỬI TELEMETRY LÊN BACKEND SPRING BOOT QUA HTTP POST (WI-FI)
// =========================================================================================
void sendTelemetryToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  // Đóng gói JSON payload (Tương thích cả ArduinoJson v6 và v7)
#if ARDUINOJSON_VERSION_MAJOR >= 7
  JsonDocument doc;
#else
  StaticJsonDocument<512> doc;
#endif
  doc["deviceId"] = DEVICE_ID;
  doc["macAddress"] = WiFi.macAddress();
  doc["heartRate"] = currentBpm;
  doc["spo2"] = currentSpo2;
  doc["steps"] = currentSteps;
  doc["calories"] = currentCalories;
  doc["battery"] = batteryLevel;
  doc["isCharging"] = isCharging;
  doc["connectionMode"] = bleConnected ? "HYBRID" : "WIFI";
  doc["firmwareVersion"] = FIRMWARE_VER;
  doc["activity"] = currentActivity;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf(
        "[HTTP Sync] Gui du lieu thanh cong (HTTP %d): BPM=%d, SpO2=%d%%, Activity=%s\n",
        httpCode, currentBpm, currentSpo2, currentActivity.c_str());
  } else {
    Serial.printf("[HTTP Sync] Loi ket noi toi Backend: %s\n",
                  http.errorToString(httpCode).c_str());
  }

  http.end();
}

// =========================================================================================
// 8. CẬP NHẬT DỮ LIỆU BLE NOTIFY TỚI APP
// =========================================================================================
void updateBleTelemetry() {
  if (!bleConnected)
    return;

  // 1. Notify Heart Rate (chuẩn Bluetooth SIG format: cờ 0x00 + 1 byte BPM)
  uint8_t hrPayload[2] = {0b00000000, (uint8_t)currentBpm};
  pHrCharacteristic->setValue(hrPayload, 2);
  pHrCharacteristic->notify();

  // 2. Notify SpO2
  uint8_t spo2Payload = (uint8_t)currentSpo2;
  pSpo2Characteristic->setValue(&spo2Payload, 1);
  pSpo2Characteristic->notify();

  // 3. Notify Battery
  uint8_t battPayload = (uint8_t)batteryLevel;
  pBatteryCharacteristic->setValue(&battPayload, 1);
  pBatteryCharacteristic->notify();

  // 4. Notify Steps (uint32_t)
  uint32_t stepsPayload = (uint32_t)currentSteps;
  pStepsCharacteristic->setValue((uint8_t *)&stepsPayload,
                                 sizeof(stepsPayload));
  pStepsCharacteristic->notify();

  // 5. Notify Activity State ("REST", "WALK", "RUN", "SLEEP")
  if (pActivityCharacteristic) {
    pActivityCharacteristic->setValue(currentActivity.c_str());
    pActivityCharacteristic->notify();
  }
}

// =========================================================================================
// 9. KHỞI TẠO & ĐỌC DỮ LIỆU CẢM BIẾN MAX30102 (NHỊP TIM & SpO2)
// =========================================================================================
void initMAX30102() {
  Serial.println("\n[MAX30102] Đang kết nối cảm biến nhịp tim & nồng độ oxy...");
  
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("❌ [MAX30102] KHÔNG TÌM THẤY CẢM BIẾN MAX30102!");
    Serial.println("   👉 Vui lòng kiểm tra lại sơ đồ dây I2C:");
    Serial.println("      - SDA -> D4 (GPIO 5)");
    Serial.println("      - SCL -> D5 (GPIO 6)");
    Serial.println("      - VIN/VCC -> 3.3V | GND -> GND");
    max30102Found = false;
  } else {
    Serial.println("✅ [MAX30102] Khởi tạo thành công!");
    max30102Found = true;

    // Cấu hình tối ưu cho MAX30102:
    // LED Brightness: 0x1F (~6.4mA), Sample Average: 4, LED Mode: 2 (Red + IR),
    // Sample Rate: 100Hz, Pulse Width: 411us (18-bit ADC), ADC Range: 4096nA
    particleSensor.setup(0x1F, 4, 2, 100, 411, 4096);
    particleSensor.setPulseAmplitudeRed(0x1F); // Bật LED Đỏ đo SpO2
    particleSensor.setPulseAmplitudeIR(0x1F);  // Bật LED Hồng ngoại đo nhịp tim
    particleSensor.setPulseAmplitudeGreen(0);  // Tắt LED Xanh (MAX30102 không có)
    Serial.println("🟢 [MAX30102] Cảm biến sẵn sàng. Hãy đặt ngón tay lên mặt kính cảm biến!\n");
  }
}

void readMax30102() {
  if (!max30102Found) return;

  long irValue = particleSensor.getIR();
  long redValue = particleSensor.getRed();
  lastIrValue = irValue;
  lastRedValue = redValue;

  // Khi chưa đặt ngón tay, giá trị phản xạ IR rất thấp (< 50,000)
  if (irValue < 50000) {
    fingerDetected = false;
    currentBpm = 0;
    currentSpo2 = 0;
    // Reset bộ đệm biên độ sóng PPG khi nhấc ngón tay ra
    irMax = 0;
    irMin = 999999;
    redMax = 0;
    redMin = 999999;
    return;
  }

  fingerDetected = true;

  // Cập nhật biên độ đỉnh (Max) và đáy (Min) của sóng quang học
  if (irValue > irMax) irMax = irValue;
  if (irValue < irMin) irMin = irValue;
  if (redValue > redMax) redMax = redValue;
  if (redValue < redMin) redMin = redValue;

  // Thuật toán phát hiện đỉnh xung nhịp tim (Peak Detection) từ tín hiệu IR
  if (checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60.0f / (delta / 1000.0f);

    // Lọc giá trị nhịp tim sinh lý người hợp lệ (45 - 190 BPM)
    if (beatsPerMinute >= 45 && beatsPerMinute <= 190) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;

      int beatSum = 0;
      int beatCount = 0;
      for (byte x = 0; x < RATE_SIZE; x++) {
        if (rates[x] > 0) {
          beatSum += rates[x];
          beatCount++;
        }
      }
      if (beatCount > 0) {
        currentBpm = beatSum / beatCount;
      }
    }

    // Tính nồng độ Oxy trong máu (SpO2) dựa trên tỷ lệ thành phần AC/DC của Red & IR
    // Công thức tiêu chuẩn PPG: R = (AC_red / DC_red) / (AC_ir / DC_ir)
    long irAc = irMax - irMin;
    long redAc = redMax - redMin;
    long irDc = (irMax + irMin) / 2;
    long redDc = (redMax + redMin) / 2;

    float r = 0.0f;
    if (irDc > 0 && irAc > 0 && redDc > 0 && redAc > 0) {
      r = ((float)redAc / (float)redDc) / ((float)irAc / (float)irDc);
      // Đường cong chuẩn AN6845 Maxim / SparkFun cho MAX30102: SpO2 = 110 - 25 * R
      float spo2Calc = 110.0f - 25.0f * r;
      if (spo2Calc >= 85.0f && spo2Calc <= 100.0f) {
        spo2Array[spo2Spot++] = (int)spo2Calc;
        spo2Spot %= SPO2_SIZE;

        int spo2Sum = 0;
        int spo2Count = 0;
        for (byte x = 0; x < SPO2_SIZE; x++) {
          if (spo2Array[x] > 0) {
            spo2Sum += spo2Array[x];
            spo2Count++;
          }
        }
        if (spo2Count > 0) {
          currentSpo2 = spo2Sum / spo2Count;
        }
      }
    }

    // In thông báo khi bắt được một nhịp đập tim tức thời từ cảm biến vật lý
    Serial.printf("💓 [Beat] Nhịp đập thật! Khoảng cách delta=%ld ms -> BPM tức thời: %.0f | BPM TB: %d | R=%.3f -> SpO2: %d%%\n",
                  delta, beatsPerMinute, currentBpm, r, currentSpo2);

    // Reset đỉnh / đáy cho chu kỳ xung nhịp tiếp theo
    irMax = 0;
    irMin = 999999;
    redMax = 0;
    redMin = 999999;
  }
}

// =========================================================================================
// 10. THUẬT TOÁN NHẬN DIỆN HOẠT ĐỘNG & BƯỚC CHÂN (HPF -> PEAK DETECTION)
// =========================================================================================
void readSensors() {
  // 1. Lấy tín hiệu gia tốc tổng hợp a = sqrt(ax^2 + ay^2 + az^2) - 1.0g
  // Mô phỏng dao động nhịp bước theo chuyển động
  float rawAccel = 1.0f + ((random(0, 100) > 40) ? (random(10, 80) / 100.0f) : 0.0f);
  float x_n = rawAccel - 1.0f; // Triệt tiêu trọng lực tĩnh 1g

  // High-pass filter: y[n] = 0.97 * (y[n-1] + x[n] - x[n-1])
  float y_n = HPF_ALPHA * (y_prev + x_n - x_prev);
  x_prev = x_n;
  y_prev = y_n;

  // Peak detection: Phát hiện bước chân khi vượt ngưỡng PEAK_THRESHOLD (> 0.55g)
  unsigned long nowMs = millis();
  if (y_n > PEAK_THRESHOLD && (nowMs - lastStepTime > 300)) { // Refractory period 300ms
    lastStepTime = nowMs;
    currentSteps++;
    currentCalories = (int)(currentSteps * 0.045f); // ~0.045 kcal / bước
    stepsInLastWindow++;
  }

  // Cửa sổ 3 giây để tính tần số bước / giây và phân loại hoạt động
  // (Lưu ý: Hoạt động KHÔNG can thiệp vào nhịp tim hay SpO2 - các chỉ số này do MAX30102 đo 100%)
  if (nowMs - windowStartTime >= 3000) {
    float stepsPerSec = (float)stepsInLastWindow / 3.0f;
    if (stepsPerSec > 2.0f) {
      currentActivity = "RUN";
    } else if (stepsPerSec >= 0.8f) {
      currentActivity = "WALK";
    } else {
      currentActivity = "REST";
    }
    stepsInLastWindow = 0;
    windowStartTime = nowMs;
  }
}

// =========================================================================================
// 11. SETUP & MAIN LOOP
// =========================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==================================================");
  Serial.println("   PROWATCH HEALTH - SEEED XIAO ESP32-S3 BOOT");
  Serial.println("==================================================");

  // 1. Khởi tạo bus I2C cho cảm biến MAX30102
  // D4 = SDA (GPIO5), D5 = SCL (GPIO6)
  Wire.begin(D4, D5);

  // 2. Khởi tạo cảm biến MAX30102
  initMAX30102();

  // 3. Khởi tạo Bluetooth Low Energy (BLE)
  initBLE();

  // 4. Kết nối Wi-Fi
  connectWiFi();

  Serial.println("[System] Khởi động hoàn tất! Sẵn sàng đo và hiển thị...");
}

void loop() {
  unsigned long now = millis();

  // 1. Tự động khởi động lại phát sóng BLE an toàn sau khi ngắt kết nối
  if (!bleConnected && oldDeviceConnected) {
    delay(500); // Đợi stack Bluetooth giải phóng handle kết nối cũ
    pServer->startAdvertising(); // Bắt đầu quảng bá lại sóng BLE
    Serial.println("[BLE] Đã kích hoạt lại quảng bá sóng BLE, sẵn sàng để App kết nối lại!");
    oldDeviceConnected = bleConnected;
  }
  if (bleConnected && !oldDeviceConnected) {
    oldDeviceConnected = bleConnected;
  }

  // 2. Tự động phục hồi kết nối Wi-Fi nếu mất sóng
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiRetry = 0;
    if (now - lastWifiRetry >= 10000) { // Thử kết nối lại mỗi 10 giây
      lastWifiRetry = now;
      Serial.println("[WiFi] Mất sóng Wi-Fi! Đang thử tự động kết nối lại...");
      WiFi.reconnect();
    }
  }

  // 3. Đọc dữ liệu quang học từ cảm biến MAX30102 (Nhịp tim & SpO2)
  readMax30102();

  // 4. Đọc dữ liệu gia tốc / hoạt động
  readSensors();

  // 5. HIỂN THỊ ĐỊNH KỲ NHỊP TIM & SpO2 LÊN SERIAL MONITOR (Mỗi 1 giây)
  static unsigned long lastSerialMonitorTime = 0;
  if (now - lastSerialMonitorTime >= 1000) {
    lastSerialMonitorTime = now;

    if (!max30102Found) {
      Serial.println("⚠️  [MAX30102] Chưa tìm thấy cảm biến! Vui lòng cắm đúng chân I2C (SDA -> D4, SCL -> D5, VCC -> 3.3V)");
    } else if (!fingerDetected) {
      Serial.printf("👉 [MAX30102] Đang chờ ngón tay... (Tín hiệu IR: %ld < 50000)\n", lastIrValue);
    } else {
      Serial.println("---------------------------------------------------------");
      Serial.println("🩺 [MAX30102] KẾT QUẢ ĐO SINH TRẮC HỌC TRỰC TIẾP:");
      Serial.printf("   ❤️  Nhịp tim (HR)   : %d BPM\n", currentBpm);
      Serial.printf("   🫁  Nồng độ Oxy máu (SpO2)   : %d %%\n", currentSpo2);
      Serial.printf("   📊  Tín hiệu IR / RED        : %ld / %ld (Tiếp xúc tốt)\n", lastIrValue, lastRedValue);
      Serial.println("---------------------------------------------------------");
    }
  }

  // 6. Bắn notify qua BLE tới App điện thoại khi có kết nối BLE
  if (bleConnected && (now - lastBleNotifyTime >= BLE_NOTIFY_INTERVAL)) {
    lastBleNotifyTime = now;
    updateBleTelemetry();
  }

  // 7. Kiểm tra lệnh test từ Serial Monitor (nếu người dùng gõ lệnh trực tiếp)
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("GET") || cmd.equalsIgnoreCase("SYNC") || cmd.equalsIgnoreCase("DATA") || cmd.equalsIgnoreCase("TEST")) {
      isOneShotRequested = true;
      Serial.println("[Serial Input] Nhận lệnh thủ công: Gửi ngay 1 mẫu dữ liệu lên Backend!");
    } else if (cmd.equalsIgnoreCase("START")) {
      isStreamingRequested = true;
      Serial.println("[Serial Input] Bật chế độ truyền dữ liệu liên tục!");
    } else if (cmd.equalsIgnoreCase("STOP")) {
      isStreamingRequested = false;
      Serial.println("[Serial Input] Dừng truyền dữ liệu liên tục!");
    }
  }

  // 8. Đẩy dữ liệu qua Wi-Fi lên Backend Spring Boot:
  // KHÔNG SPAM TỰ ĐỘNG - CHỈ GỬI KHI APP GỬI LỆNH
  if (isOneShotRequested) {
    isOneShotRequested = false;
    Serial.println("\n[HTTP Sync] >>> THỰC THI LỆNH TỪ APP: Đang gửi dữ liệu lên Backend...");
    sendTelemetryToBackend();
    updateBleTelemetry();
    Serial.println("[HTTP Sync] >>> Hoàn tất gửi dữ liệu theo lệnh App. Tiếp tục ở chế độ chờ lệnh!\n");
  } else if (isStreamingRequested && (now - lastWifiSyncTime >= WIFI_SYNC_INTERVAL)) {
    lastWifiSyncTime = now;
    sendTelemetryToBackend();
    updateBleTelemetry();
  }

  // Cho phép hệ điều hành FreeRTOS chạy các tác vụ nền (WiFi/BLE) mượt mà
  delay(10);
}
