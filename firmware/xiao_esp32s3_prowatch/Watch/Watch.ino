#include <Arduino_GFX_Library.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

#include <time.h>
#include <sys/time.h>
#include <Preferences.h>

// ================= KẾT NỐI BLE =================
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#include "Open_Sans_Hebrew_Bold_80.h"
#include "Open_Sans_Hebrew_Bold_30.h"
#include "Orbitron_Bold_16.h"
#include "Orbitron_Bold_14.h"
#include "Orbitron_Bold_10.h"

#define TFT_DC   D7
#define TFT_RST  D9
#define TFT_BL   D6

Arduino_DataBus *bus = new Arduino_HWSPI(TFT_DC, -1);
Arduino_GFX *gfx = new Arduino_ST7789(
bus, TFT_RST, 0, true, 240, 240, 0, 0);

#include "menu_start.h"
bool isWatchMeasuring();
#include "menu_heart.h"
#include "menu_data.h"
#include "spo2_algorithm.h"
#include "activity_tracker.h"
#include "risk_predictor.h"

// ================= PROTOTYPE (tránh lỗi khi dùng PlatformIO) =================
void wakeScreen();
void sleepScreen();
void dimScreenAOD();
void notif_draw_static();
void triggerLocalHealthNotification(int measuredBpm, int measuredSpo2);

// ================= CẤU HÌNH CHUNG =================
#define CPU_FREQ_MHZ          160      // chỉ dùng BLE nên có thể hạ xuống 80 để tiết kiệm pin nếu màn hình vẫn mượt

#define TOUCH0 D2                      
#define TOUCH1 D1                      
#define TOUCH2 D0                     

// 0 = Tự động nhận diện (hỗ trợ cả miếng đồng/touch pad điện dung trực tiếp VÀ module TTP223 số)
// 1 = Ép cố định chế độ module cảm ứng rời có chân OUT số (TTP223...)
#define TOUCH_DIGITAL_MODULE  0
#define TOUCH_DIGITAL_ACTIVE  HIGH     

#define TOUCH_MARGIN_PERCENT  3        
#define TOUCH_MIN_DELTA       450      
#define TOUCH_FIXED_THRESHOLD 80000    
#define TOUCH_STUCK_MS        4000     
#define TOUCH_SAMPLE_MS       15       
#define TOUCH_DEBUG_DEFAULT   false   

// Cảm biến
#define LED_AMP               0x1F    
#define FINGER_ON_THRESHOLD   7000
#define FINGER_OFF_THRESHOLD  5000
#define FINGER_LOST_MS        900      
#define MEASURE_TIMEOUT_MS    45000    
#define SPO2_DECIM            4        

// Pin: đặt số chân ADC nếu có mạch chia áp đo pin, -1 = chưa có
#define BATTERY_ADC_PIN       -1

#define FIRMWARE_VER          "v1.5.1"

bool t0=false,t1=false,t2=false;
bool lastT0=false,lastT1=false,lastT2=false;
uint32_t touchThr[3] = {TOUCH_FIXED_THRESHOLD, TOUCH_FIXED_THRESHOLD, TOUCH_FIXED_THRESHOLD};
uint32_t touchBase[3] = {0, 0, 0};
uint32_t touchNoise[3] = {150, 150, 150};
uint32_t touchRaw[3] = {0, 0, 0};
bool touchState[3] = {false, false, false};
bool touchIsDigital[3] = {false, false, false};
int  touchDigitalActive[3] = {HIGH, HIGH, HIGH};
uint32_t touchStuckSince[3] = {0, 0, 0};
bool touchDebug = TOUCH_DEBUG_DEFAULT;


// ================= TIME =================
// (giữ nguyên tên biến vì các file menu_*.h đang dùng)
// Giờ mặc định dưới đây chỉ dùng cho tới khi App gửi SET_TIME qua BLE.
int HH=16;
int MIN=30;
int SEC=0;

int DAY=25;
int MON=4;
int YEAR=26;


// ================= BPM SPO2 (0 = chưa có dữ liệu thật) =================
int bpm=0;
int spo2=0;
bool hasHr=false;
bool hasSpo2=false;
uint32_t lastMeasureMs=0;

// Thuật toán đo nhịp tim cải tiến từ tín hiệu PPG IR
byte rates[4];              // Mảng lưu 4 giá trị BPM gần nhất (tương thích cấu trúc cũ)
byte rateSpot = 0;          // Vị trí hiện tại trong mảng rates
long lastBeatTime = 0;      // Thời điểm nhịp đập cuối cùng
float beatsPerMinute = 0;   // BPM tức thời
int beatAvg = 0;            // BPM trung bình đã làm mượt

#define HR_HISTORY_SIZE 8
int hrHistory[HR_HISTORY_SIZE]; // Cửa sổ trượt lưu các mẫu BPM hợp lệ
int hrHistoryCount = 0;
int hrHistoryIdx = 0;
int hrValidBeats = 0;           // Số nhịp đập hợp lệ phát hiện được trong chu trình

#define SPO2_HISTORY_SIZE 6
int spo2History[SPO2_HISTORY_SIZE]; // Cửa sổ trượt lưu các giá trị SpO2 hợp lệ từ Maxim
int spo2HistoryCount = 0;
int spo2HistoryIdx = 0;
int spo2ValidCalculations = 0;      // Số lần tính SpO2 trả về cờ spo2Valid == 1


// ================= MENU =================
enum MenuState
{
MENU_START,
MENU_HEART,
MENU_DATA,
MENU_NOTIF
};

int currentMenu = MENU_START;


// ================= CẢM BIẾN SINH HỌC MAX30102 =================
// Cảm biến MAX30102 đo 2 kênh Red + IR qua I2C (tương thích API SparkFun MAX3010x)
MAX30105 particleSensor;
bool sensorOk=false;

int spo2Samples[3];
int spo2Index=0;

uint32_t measureStartMs=0;
uint32_t fingerLostSince=0;
bool needRemoveFinger=false;

uint32_t irBuf[BUFFER_SIZE];
uint32_t redBuf[BUFFER_SIZE];
int spo2BufIdx=0;
int decimCnt=0;

// Kết quả HR của chu trình đo hiện tại (để lưu dù SpO2 đo hỏng)
bool cycleHrValid=false;
int cycleBpm=0;

enum MeasureState
{
WAIT_FINGER,
MEASURE_BPM,
MEASURE_SPO2
};

MeasureState measureState=WAIT_FINGER;


// ================= SLEEP / AOD / RAISE TO WAKE =================
bool screenSleeping=false;
bool screenDimmed=false;        // true = đang ở chế độ Màn hình luôn bật (sáng mờ AOD)
bool pendingSleep=false;

bool alwaysOnDisplay=true;      // Màn hình luôn bật (AOD): giữ mặt đồng hồ sáng mờ thay vì tắt hẳn
bool raiseToWake=true;          // Nhấc tay sáng màn hình: tự bật sáng khi xoay/nhấc cổ tay

uint32_t lastTouchTime=0;
uint32_t sleepEnteredMs=0;      // mốc thời gian vừa vào chế độ ngủ/mờ (chống tự bật lại ngay lập tức)

#define SLEEP_NORMAL     10000
#define SLEEP_HEART      180000
#define BL_NORMAL_LEVEL  204    // Độ sáng bình thường: 80% (204/255)
#define BL_AOD_LEVEL     38     // Độ sáng AOD (luôn bật): ~15% (38/255)

// Cảm biến gia tốc I2C (MPU6050 0x68/0x69 nếu có gắn) + dự phòng quang học MAX30102
bool imuOk = false;
uint8_t imuAddr = 0x68;
float prevAxG = 0.0f, prevAyG = 0.0f, prevAzG = 1.0f;
bool wristWasLowered = true;
long wakeIrBaseline = 0;


// ================= DỮ LIỆU DÙNG CHUNG =================
int batteryLevel = 0;
bool batteryValid = false;
int currentSteps = 0;      
int currentCalories = 0;
bool stepsValid = false;
bool isCharging = false;
String currentActivity = "REST";

void setActivity(const char *s)
{
  currentActivity = s;
}


// ================= BLE (BLUETOOTH LOW ENERGY) =================
#define BLE_DEVICE_NAME "ProWatch-S3"

#define HEART_RATE_SERVICE_UUID BLEUUID((uint16_t)0x180D)
#define HEART_RATE_MEASUREMENT_UUID BLEUUID((uint16_t)0x2A37)
#define BATTERY_SERVICE_UUID BLEUUID((uint16_t)0x180F)
#define BATTERY_LEVEL_UUID BLEUUID((uint16_t)0x2A19)

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

// Các cờ được ghi từ callback BLE => phải volatile
volatile bool bleConnected = false;
bool oldDeviceConnected = false;
volatile bool isStreamingRequested = false;
volatile bool isOneShotRequested = false;
volatile bool appTriggeredMeasure = false;
volatile bool appCancelMeasure = false;
volatile int  appMeasureType = 0;      // 0 = chu trình đầy đủ (mặc định), 1 = MEASURE_HR, 2 = MEASURE_SPO2
volatile bool bleForceNotify = false;
bool waitingForFinger = false;          // Cờ đánh dấu đang chờ ngón tay sau khi nhận lệnh từ App

volatile bool clockResyncRequested = false;

// Lệnh điều khiển màn hình từ App (callback chỉ đặt cờ, loop() xử lý)
#define CMD_NONE  -1
#define CMD_NEXT  10
#define CMD_BACK  11
volatile int  appMenuCmd = CMD_NONE;   // 0..2 = nhảy tới menu, CMD_NEXT/CMD_BACK = tiến/lùi
volatile bool appScreenOn = false;
volatile bool appScreenOff = false;
volatile int  appAodCmd = -1;          // -1 = giữ nguyên, 0 = tắt AOD, 1 = bật AOD
volatile int  appRaiseCmd = -1;        // -1 = giữ nguyên, 0 = tắt Raise-to-Wake, 1 = bật Raise-to-Wake
volatile bool appRaiseWakeTrigger = false; // kích hoạt sáng màn khi nhấc tay (từ cảm biến hoặc lệnh test)

// ================= ĐỒNG BỘ THÔNG BÁO (NOTIFICATIONS) =================
// Chỉ nhận: Cuộc gọi đến (CALL), Tin nhắn SMS (SMS), Nhắc uống nước (WATER),
// và Thông báo/Cảnh báo Nhịp tim & SpO2 (Quá thấp / Bình thường / Quá cao).
// Đã loại bỏ thông báo từ các ứng dụng bên thứ 3 trên điện thoại.
#define NOTIF_DURATION_DEFAULT_MS 5000  // Cuộc gọi, SMS, Nhắc uống nước: tự tắt sau 5 giây
#define NOTIF_DURATION_HEALTH_MS  10000 // Thông báo kết quả sau khi đo (HR/SpO2): tự tắt sau 10 giây
bool notifEnabled   = true;            // Công tắc tổng nhận thông báo
bool notifCalls     = true;            // Nhận thông báo cuộc gọi đến
bool notifSms       = true;            // Nhận thông báo tin nhắn SMS
bool notifSedentary = true;            // Nhận nhắc nhở uống nước
bool notifHealth    = true;            // Nhận thông báo/cảnh báo Nhịp tim & SpO2

// Ngưỡng đánh giá Nhịp tim (BPM) & SpO2 (%)
int hrAlertLow    = 60;                // < 60 BPM: Nhịp tim quá thấp
int hrAlertHigh   = 100;               // > 100 BPM: Nhịp tim quá cao (60..100: Bình thường)
int spo2AlertLow  = 95;                // < 95%: SpO2 quá thấp (95..99%: Bình thường, >99/100%: Cao/Tối ưu)

bool notifActive    = false;           // true = đang hiển thị popup thông báo trên màn hình
bool hasLastNotif   = false;           // true = đã nhận ít nhất 1 thông báo để xem lại ở MENU_NOTIF
uint32_t notifShownMs = 0;
uint32_t activeNotifDurationMs = NOTIF_DURATION_DEFAULT_MS;
String   activeNotifType  = "";
String   activeNotifTitle = "";
String   activeNotifBody  = "";
uint16_t activeNotifColor = 0;         // 0 = màu mặc định theo loại, != 0 = mã màu RGB565 tùy chỉnh
int      activeNotifHH    = 0;
int      activeNotifMM    = 0;

volatile bool appNotifPending = false;
volatile bool appNotifClearPending = false;
volatile bool appNotifCfgPending = false;
String   pendingNotifType  = "";
String   pendingNotifTitle = "";
String   pendingNotifBody  = "";
uint16_t pendingNotifColor = 0;
volatile uint8_t pendingNotifCfg[5] = {1, 1, 1, 1, 1};

unsigned long lastStreamTime = 0;
const unsigned long STREAM_INTERVAL = 5000;
unsigned long lastBleNotifyTime = 0;
const unsigned long BLE_NOTIFY_INTERVAL = 1000;


// =====================================================================
// ============ CẤU HÌNH HỆ THỐNG & FLASH NVS (PREFERENCES) ============
// =====================================================================
// Đã lược bỏ hoàn toàn cơ chế lưu trữ hàng đợi đo Offline trên Flash NVS.
// Kết quả đo được truyền trực tiếp thời gian thực qua BLE và hiển thị trên màn hình.
Preferences prefs;

// Nạp cấu hình màn hình và thông báo từ Flash NVS khi khởi động
void loadDisplaySettings()
{
  prefs.begin("prowatch_nv", false);
  alwaysOnDisplay = prefs.getBool("aod", true);
  raiseToWake     = prefs.getBool("raise", true);
  notifEnabled    = prefs.getBool("nf_en", true);
  notifCalls      = prefs.getBool("nf_call", true);
  notifSms        = prefs.getBool("nf_sms", true);
  notifSedentary  = prefs.getBool("nf_sed", true);
  notifHealth     = prefs.getBool("nf_hlth", true);
  hrAlertLow      = prefs.getInt("hr_low", 60);
  hrAlertHigh     = prefs.getInt("hr_high", 100);
  spo2AlertLow    = prefs.getInt("spo2_low", 95);

  // Xóa sạch dữ liệu offline cũ nếu còn trong Flash NVS để giải phóng bộ nhớ
  if (prefs.isKey("records")) prefs.remove("records");
  if (prefs.isKey("count"))   prefs.remove("count");
  if (prefs.isKey("seq"))     prefs.remove("seq");
  if (prefs.isKey("ver"))     prefs.remove("ver");
  prefs.end();

  Serial.printf("⚙️ [NVS Init] Cấu hình hiển thị: AOD=%s, Nhấc tay sáng màn=%s, Thông báo=%s (HR: %d..%d, SpO2 >= %d%%)\n",
                alwaysOnDisplay ? "BẬT" : "TẮT",
                raiseToWake ? "BẬT" : "TẮT",
                notifEnabled ? "BẬT" : "TẮT",
                hrAlertLow, hrAlertHigh, spo2AlertLow);
}

// Lưu cấu hình Màn hình luôn bật (AOD), Nhấc tay sáng màn hình & Thông báo xuống Flash NVS
void saveDisplaySettings()
{
  prefs.begin("prowatch_nv", false);
  prefs.putBool("aod", alwaysOnDisplay);
  prefs.putBool("raise", raiseToWake);
  prefs.putBool("nf_en", notifEnabled);
  prefs.putBool("nf_call", notifCalls);
  prefs.putBool("nf_sms", notifSms);
  prefs.putBool("nf_sed", notifSedentary);
  prefs.putBool("nf_hlth", notifHealth);
  prefs.putInt("hr_low", hrAlertLow);
  prefs.putInt("hr_high", hrAlertHigh);
  prefs.putInt("spo2_low", spo2AlertLow);
  prefs.end();
}

// Nếu HR đã đo xong nhưng SpO2 hỏng/bị hủy: vẫn kích hoạt thông báo đánh giá HR cục bộ
void flushPartialCycle()
{
  if (cycleHrValid) {
    cycleHrValid = false;
    triggerLocalHealthNotification(cycleBpm, 0);
  }
}


// Danh sách lệnh "bắt đầu đo" từ App
bool isMeasureCommand(const char *c)
{
  static const char *const list[] = {
    "GET_DATA", "SYNC_NOW", "READ", "TRIGGER",
    "MEASURE", "MEASURE_HR", "MEASURE_SPO2", "START_MEASURE"
  };
  for (size_t i = 0; i < sizeof(list) / sizeof(list[0]); i++)
    if (strcmp(c, list[i]) == 0) return true;
  return false;
}

// BLE Server Callbacks
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *s) {
    bleConnected = true;
    bleForceNotify = true;
    Serial.println("\n*********************************************************");
    Serial.println("🎉 [BLE] KẾT NỐI VỚI APP THÀNH CÔNG!");
    Serial.println("📱 Application ProWatch Health đã liên kết với XIAO ESP32-S3.");
    Serial.println("*********************************************************\n");
  }

  void onDisconnect(BLEServer *s) {
    bleConnected = false;
    isStreamingRequested = false;
    isOneShotRequested = false;
    appTriggeredMeasure = false;
    Serial.println("\n[BLE] ⚠️ App đã NGẮT KẾT NỐI khỏi XIAO ESP32-S3!");
    Serial.println("[BLE] ⏳ Đang chờ App kết nối lại...");
    // Việc quảng bá lại được xử lý trong loop() (tránh gọi 2 lần)
  }
};

// BLE Command Callbacks (chỉ đặt cờ; loop() xử lý)
class CommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String value = pCharacteristic->getValue().c_str();
    value.trim();
    if (value.length() > 0) {
      Serial.print("[BLE Command] Nhận lệnh từ App: ");
      Serial.println(value);

      if (value == "MEASURE_HR") {
        appMeasureType = 1;
        appTriggeredMeasure = true;
        currentActivity = "MEASURING_HR";
        if (pActivityCharacteristic) {
          pActivityCharacteristic->setValue("MEASURING_HR");
          pActivityCharacteristic->notify();
        }
        Serial.println("[BLE Command] -> Lệnh đo Nhịp tim (MEASURE_HR) từ App!");
      } else if (value == "MEASURE_SPO2") {
        appMeasureType = 2;
        appTriggeredMeasure = true;
        currentActivity = "MEASURING_SPO2";
        if (pActivityCharacteristic) {
          pActivityCharacteristic->setValue("MEASURING_SPO2");
          pActivityCharacteristic->notify();
        }
        Serial.println("[BLE Command] -> Lệnh đo SpO2 (MEASURE_SPO2) từ App!");
      } else if (value == "STOP_MEASURE" || value == "CANCEL_MEASURE") {
        appCancelMeasure = true;
        currentActivity = "REST";
        if (pActivityCharacteristic) {
          pActivityCharacteristic->setValue("REST");
          pActivityCharacteristic->notify();
        }
        Serial.println("[BLE Command] -> Nhận lệnh HỦY ĐO (STOP_MEASURE) từ App!");
      } else if (isMeasureCommand(value.c_str())) {
        appMeasureType = 0;
        appTriggeredMeasure = true;
        currentActivity = "MEASURING";
        if (pActivityCharacteristic) {
          pActivityCharacteristic->setValue("MEASURING");
          pActivityCharacteristic->notify();
        }
        Serial.println("[BLE Command] -> ĐÃ NHẬN LỆNH ĐO TỪ APP! Kích hoạt quy trình đo trên đồng hồ!");
      } else if (value.startsWith("SET_TIME:")) {
        // App gửi epoch UTC (giây). Đặt giờ hệ thống; loop() sẽ cập nhật đồng hồ hiển thị.
        long long ep = atoll(value.substring(9).c_str());
        if (ep > 1700000000LL) {
          struct timeval tv = { (time_t)ep, 0 };
          settimeofday(&tv, nullptr);
          clockResyncRequested = true;
          Serial.println("🕒 [BLE Time Sync] Đã nhận giờ chuẩn từ điện thoại.");
        }
      } else if (value.startsWith("MENU:")) {
        int m = atoi(value.substring(5).c_str());
        if (m >= 0 && m <= 3) appMenuCmd = m;          // 0=Start, 1=Heart, 2=Data, 3=Notif
      } else if (value == "NEXT") {
        appMenuCmd = CMD_NEXT;
      } else if (value == "BACK") {
        appMenuCmd = CMD_BACK;
      } else if (value == "SCREEN_ON") {
        appScreenOn = true;
        Serial.println("[BLE Command] -> Nhận lệnh BẬT màn hình (SCREEN_ON)");
      } else if (value == "SCREEN_OFF") {
        appScreenOff = true;
        Serial.println("[BLE Command] -> Nhận lệnh TẮT màn hình (SCREEN_OFF)");
      } else if (value == "AOD:1" || value == "AOD_ON") {
        appAodCmd = 1;
        Serial.println("[BLE Command] -> Nhận lệnh BẬT Màn hình luôn bật (AOD:1)");
      } else if (value == "AOD:0" || value == "AOD_OFF") {
        appAodCmd = 0;
        Serial.println("[BLE Command] -> Nhận lệnh TẮT Màn hình luôn bật (AOD:0)");
      } else if (value == "RAISE:1" || value == "RAISE_ON") {
        appRaiseCmd = 1;
        Serial.println("[BLE Command] -> Nhận lệnh BẬT Nhấc tay sáng màn hình (RAISE:1)");
      } else if (value == "RAISE:0" || value == "RAISE_OFF") {
        appRaiseCmd = 0;
        Serial.println("[BLE Command] -> Nhận lệnh TẮT Nhấc tay sáng màn hình (RAISE:0)");
      } else if (value == "RAISE_WAKE") {
        appRaiseWakeTrigger = true;
        Serial.println("[BLE Command] -> Nhận tín hiệu Nhấc tay sáng màn hình (RAISE_WAKE)");
      } else if (value.startsWith("NOTIF_CFG:")) {
        // Định dạng: NOTIF_CFG:1,1,1,1,1 (enabled,calls,sms,water,health)
        String cfg = value.substring(10);
        int idx = 0;
        for (int i = 0; i < 5 && idx < (int)cfg.length(); i++) {
          pendingNotifCfg[i] = (cfg.charAt(idx) == '1') ? 1 : 0;
          idx += 2; // bỏ qua dấu phẩy
        }
        appNotifCfgPending = true;
        Serial.printf("[BLE Command] -> Nhận cấu hình thông báo: Master=%d, Call=%d, SMS=%d, Water=%d, Health=%d\n",
                      pendingNotifCfg[0], pendingNotifCfg[1], pendingNotifCfg[2], pendingNotifCfg[3], pendingNotifCfg[4]);
      } else if (value.startsWith("HEALTH_THR:")) {
        // Định dạng: HEALTH_THR:<hrLow>,<hrHigh>,<spo2Low> (VD: HEALTH_THR:50,110,95)
        String thr = value.substring(11);
        int c1 = thr.indexOf(',');
        int c2 = (c1 > 0) ? thr.indexOf(',', c1 + 1) : -1;
        if (c1 > 0 && c2 > c1) {
          int hl = atoi(thr.substring(0, c1).c_str());
          int hh = atoi(thr.substring(c1 + 1, c2).c_str());
          int sl = atoi(thr.substring(c2 + 1).c_str());
          if (hl >= 35 && hl <= 80) hrAlertLow = hl;
          if (hh >= 85 && hh <= 200) hrAlertHigh = hh;
          if (sl >= 80 && sl <= 99) spo2AlertLow = sl;
          saveDisplaySettings();
          Serial.printf("[BLE Command] -> Cập nhật ngưỡng cảnh báo y tế: HR=%d..%d BPM, SpO2>=%d%%\n",
                        hrAlertLow, hrAlertHigh, spo2AlertLow);
        }
      } else if (value.startsWith("SET_PROFILE:")) {
        // Định dạng: SET_PROFILE:<height>,<weight> (VD: SET_PROFILE:172,65)
        String prof = value.substring(12);
        int comma = prof.indexOf(',');
        if (comma > 0) {
          float h = prof.substring(0, comma).toFloat();
          float w = prof.substring(comma + 1).toFloat();
          saveUserProfile(h, w);
          Serial.printf("[BLE Command] -> Nhận hồ sơ thể trạng từ App: Cao=%.1f cm, Nặng=%.1f kg (BMI=%.2f)\n",
                        userHeight, userWeight, userBmi);
        }
      } else if (value.startsWith("NOTIF:")) {
        // Hỗ trợ 2 định dạng:
        // 1) NOTIF:<LOAI>|<MAU_RGB565_HEX>|<TIEU_DE>|<NOI_DUNG> (có màu tùy chỉnh từ mục Demo)
        // 2) NOTIF:<LOAI>|<TIEU_DE>|<NOI_DUNG> (màu mặc định theo loại)
        String payload = value.substring(6);
        int p1 = payload.indexOf('|');
        int p2 = (p1 >= 0) ? payload.indexOf('|', p1 + 1) : -1;
        int p3 = (p2 >= 0) ? payload.indexOf('|', p2 + 1) : -1;
        pendingNotifColor = 0;

        if (p1 > 0 && p2 > p1 && p3 > p2) {
          pendingNotifType  = payload.substring(0, p1);
          String colorHex   = payload.substring(p1 + 1, p2);
          pendingNotifColor = (uint16_t)strtoul(colorHex.c_str(), NULL, 16);
          pendingNotifTitle = payload.substring(p2 + 1, p3);
          pendingNotifBody  = payload.substring(p3 + 1);
        } else if (p1 > 0 && p2 > p1) {
          pendingNotifType  = payload.substring(0, p1);
          pendingNotifTitle = payload.substring(p1 + 1, p2);
          pendingNotifBody  = payload.substring(p2 + 1);
        } else if (p1 > 0) {
          pendingNotifType  = "SMS";
          pendingNotifTitle = payload.substring(0, p1);
          pendingNotifBody  = payload.substring(p1 + 1);
        } else {
          pendingNotifType  = "SMS";
          pendingNotifTitle = "Thong bao";
          pendingNotifBody  = payload;
        }
        appNotifPending = true;
        Serial.printf("[BLE Command] -> 🔔 Nhận thông báo [%s | color=0x%04X] %s: %s\n",
                      pendingNotifType.c_str(), pendingNotifColor, pendingNotifTitle.c_str(), pendingNotifBody.c_str());
      } else if (value == "NOTIF_CLEAR") {
        appNotifClearPending = true;
        Serial.println("[BLE Command] -> Đóng popup thông báo trên đồng hồ");
      } else if (value == "START_STREAM") {
        isStreamingRequested = true;
        Serial.println("[BLE Command] -> Bắt đầu chế độ truyền dữ liệu liên tục!");
      } else if (value == "STOP_STREAM") {
        isStreamingRequested = false;
        Serial.println("[BLE Command] -> Đã dừng chế độ truyền dữ liệu liên tục!");
      } else {
        Serial.println("[BLE Command] -> Lệnh không được hỗ trợ (đã bỏ Wi-Fi).");
      }
    }
  }
};

// Khởi tạo BLE GATT Services
void initBLE() {
  Serial.println("[BLE] Đang khởi tạo Bluetooth Low Energy...");
  BLEDevice::init(BLE_DEVICE_NAME);
  BLEDevice::setMTU(185); // Mở rộng MTU lên 185 bytes để nhận trọn vẹn nội dung thông báo dài

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

  // 3. ProWatch Custom Service (SpO2, Steps, Activity, Command)
  // numHandles = 30 vì service này có nhiều characteristic (mặc định 15 là sát giới hạn)
  BLEService *pCustomService = pServer->createService(BLEUUID(PROWATCH_SERVICE_UUID), 30);
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

  // Quảng bá BLE
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();

  BLEAdvertisementData advData;
  advData.setFlags(0x06);
  advData.setName(BLE_DEVICE_NAME);
  advData.setCompleteServices(HEART_RATE_SERVICE_UUID);
  pAdvertising->setAdvertisementData(advData);

  BLEAdvertisementData scanRespData;
  scanRespData.setCompleteServices(BLEUUID(PROWATCH_SERVICE_UUID));
  pAdvertising->setScanResponseData(scanRespData);

  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.printf("[BLE] 📡 Đang phát sóng tên: %s\n", BLE_DEVICE_NAME);
  Serial.println("[BLE] ⏳ Đang chờ App kết nối qua Bluetooth...\n");
}

// Notify HR tức thời (dùng trong lúc đo để App vẽ đồ thị trực tiếp)
void notifyHrInstant(int value)
{
  if (!bleConnected || !pHrCharacteristic) return;
  uint8_t hrPayload[2] = {0b00000000, (uint8_t)value};
  pHrCharacteristic->setValue(hrPayload, 2);
  pHrCharacteristic->notify();
}

void notifySpo2Instant(int value)
{
  if (!bleConnected || !pSpo2Characteristic) return;
  uint8_t p = (uint8_t)value;
  pSpo2Characteristic->setValue(&p, 1);
  pSpo2Characteristic->notify();
}

// Cập nhật BLE: chỉ notify khi giá trị đổi (hoặc force / keep-alive mỗi 10s)
void updateBleTelemetry(bool force)
{
  if (!bleConnected) return;

  static int cB = -1, cS = -1, cBat = -1;
  static long cSt = -1;
  static String cAct = "";
  static uint32_t lastKeepAlive = 0;

  if (millis() - lastKeepAlive >= 10000) {
    force = true;
    lastKeepAlive = millis();
  }

  // Khi đang trong quá trình đo (measureState != WAIT_FINGER), processSample() đã gửi
  // dữ liệu thời gian thực đồng bộ trực tiếp sang App; không gửi đè từ vòng lặp 1s.
  if (measureState == WAIT_FINGER) {
    if (hasHr) {
      uint8_t hrPayload[2] = {0b00000000, (uint8_t)bpm};
      pHrCharacteristic->setValue(hrPayload, 2);
      if (force || bpm != cB) { pHrCharacteristic->notify(); cB = bpm; }
    }

    if (hasSpo2) {
      uint8_t p = (uint8_t)spo2;
      pSpo2Characteristic->setValue(&p, 1);
      if (force || spo2 != cS) { pSpo2Characteristic->notify(); cS = spo2; }
    }

    if (pActivityCharacteristic) {
      pActivityCharacteristic->setValue(currentActivity.c_str());
      if (force || currentActivity != cAct) { pActivityCharacteristic->notify(); cAct = currentActivity; }
    }
  } else {
    cB = bpm;
    cS = spo2;
  }

  if (batteryValid) {
    uint8_t p = (uint8_t)batteryLevel;
    pBatteryCharacteristic->setValue(&p, 1);
    if (force || batteryLevel != cBat) { pBatteryCharacteristic->notify(); cBat = batteryLevel; }
  }

  if (stepsValid) {
    uint32_t p = (uint32_t)currentSteps;
    pStepsCharacteristic->setValue((uint8_t *)&p, sizeof(p));
    if (force || currentSteps != cSt) { pStepsCharacteristic->notify(); cSt = currentSteps; }
  }
}


// =====================================================================
// ============================== TOUCH ================================
// =====================================================================
// Đã sửa:
//  - Lọc trung vị 3 lần đọc để loại nhiễu xung (BLE / SPI màn hình).
//  - Hysteresis: ngưỡng nhả thấp hơn ngưỡng nhấn => không nhấp nháy quanh ngưỡng.
//  - Baseline luôn bám theo khi KHÔNG chạm (xuống nhanh, lên chậm).
//  - Chống kẹt: nếu "chạm" liên tục quá TOUCH_STUCK_MS thì tự hiệu chuẩn lại.
//  - Hiệu chuẩn được gọi SAU khi BLE + màn hình hoạt động (xem setup()).
const int touchPins[3] = {TOUCH0, TOUCH1, TOUCH2};
const char* const touchNames[3] = {"D2 (Quay lại)", "D1 (Chọn/OK)", "D0 (Tiến tới)"};

uint32_t touchCalcThr(int idx, uint32_t base)
{
  uint32_t d = base * TOUCH_MARGIN_PERCENT / 100;
  if (d < TOUCH_MIN_DELTA) d = TOUCH_MIN_DELTA;
  uint32_t noiseMargin = touchNoise[idx] * 4;
  if (d < noiseMargin) d = noiseMargin;
  return base + d;                      // luôn > baseline
}

// Trung vị của 3 lần đọc có giãn cách ngắn để bộ đo điện dung ESP32-S3 lấy mẫu mới
uint32_t touchReadFiltered(int pin)
{
  uint32_t a = touchRead(pin);
  delayMicroseconds(120);
  uint32_t b = touchRead(pin);
  delayMicroseconds(120);
  uint32_t c = touchRead(pin);
  uint32_t mn = a < b ? a : b;
  uint32_t mx = a < b ? b : a;
  uint32_t m2 = mx < c ? mx : c;        // min(max(a,b), c)
  return mn > m2 ? mn : m2;             // max(min(a,b), min(max(a,b),c))
}

void calibrateTouch()
{
#if TOUCH_DIGITAL_MODULE
  for (int i = 0; i < 3; i++) {
    touchIsDigital[i] = true;
    touchDigitalActive[i] = TOUCH_DIGITAL_ACTIVE;
    pinMode(touchPins[i], INPUT);
  }
  Serial.println("[Touch] Chế độ module cảm ứng số cố định (digitalRead).");
#else
  for (int i = 0; i < 3; i++) {
    touchIsDigital[i] = false;
    for (int k = 0; k < 6; k++) { touchRead(touchPins[i]); delay(5); }   // bỏ vài mẫu đầu (khởi động kênh touch)
    uint64_t sum = 0;
    uint32_t minV = 0xFFFFFFFFUL;
    uint32_t maxV = 0;
    for (int k = 0; k < 16; k++) {
      uint32_t v = touchReadFiltered(touchPins[i]);
      sum += v;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
      delay(8);
    }
    uint32_t base = (uint32_t)(sum / 16);

    // Nếu giá trị đọc về quá thấp (< 1000) hoặc bão hòa (> 350000), chân đang được kéo cứng bởi module số (TTP223)
    if (base < 1000 || base > 350000) {
      touchIsDigital[i] = true;
      touchDigitalActive[i] = TOUCH_DIGITAL_ACTIVE;
      pinMode(touchPins[i], INPUT);
      Serial.printf("[Touch] Pad %d [%s - GPIO%d]: phát hiện module số TTP223 (digitalRead)\n",
                    i, touchNames[i], touchPins[i]);
    } else {
      uint32_t noise = (maxV > minV) ? (maxV - minV) : 100;
      if (noise < 80) noise = 80;
      if (noise > 600) noise = 600;
      touchNoise[i] = noise;
      touchBase[i] = base;
      touchThr[i] = touchCalcThr(i, base);
      touchState[i] = false;
      touchStuckSince[i] = 0;
      Serial.printf("[Touch] Pad %d [%s - GPIO%d]: baseline=%lu, nhiễu=%lu, ngưỡng=%lu (+%lu)\n",
                    i, touchNames[i], touchPins[i],
                    (unsigned long)base, (unsigned long)noise,
                    (unsigned long)touchThr[i], (unsigned long)(touchThr[i] - base));
    }
  }
#endif
}

void updateTouch()
{
  static uint32_t lastSampleMs = 0;
  uint32_t nowMs = millis();
  if (nowMs - lastSampleMs < TOUCH_SAMPLE_MS) return;
  lastSampleMs = nowMs;

  static uint8_t cnt[3] = {0, 0, 0};
  bool prevSt[3] = {t0, t1, t2};
  bool st[3];

  for (int i = 0; i < 3; i++) {
    bool raw;
    if (touchIsDigital[i]) {
      touchRaw[i] = digitalRead(touchPins[i]);
      raw = ((int)touchRaw[i] == touchDigitalActive[i]);
    } else {
      touchRaw[i] = touchReadFiltered(touchPins[i]);

      // Hysteresis: đang chạm thì chỉ nhả khi xuống dưới 45% khoảng giữa baseline và ngưỡng
      uint32_t onThr     = touchThr[i];
      uint32_t trigDelta = (onThr > touchBase[i]) ? (onThr - touchBase[i]) : TOUCH_MIN_DELTA;
      uint32_t offThr    = touchBase[i] + (trigDelta * 45) / 100;
      raw = touchState[i] ? (touchRaw[i] > offThr) : (touchRaw[i] > onThr);
      touchState[i] = raw;

      if (!raw) {
        if (touchRaw[i] < touchBase[i]) {
          // Nếu giá trị thực thấp hơn hẳn baseline (VD: lúc khởi động tay đang chạm rồi vừa nhả ra) -> hạ baseline nhanh
          uint32_t drop = touchBase[i] - touchRaw[i];
          if (drop > trigDelta / 2) {
            touchBase[i] = (touchBase[i] * 3 + touchRaw[i]) / 4;
          } else {
            touchBase[i] = (touchBase[i] * 31 + touchRaw[i] + 15) / 32;
          }
          touchThr[i] = touchCalcThr(i, touchBase[i]);
        } else {
          // Khi giá trị cao hơn baseline: CHỈ cho baseline trôi lên chậm nếu độ tăng nằm trong vùng nhiễu tự nhiên (< 1/3 ngưỡng).
          // Nếu ngón tay đang tiến lại gần (>= 1/3 ngưỡng) -> giữ nguyên baseline để không đẩy ngưỡng chạy trốn ngón tay!
          uint32_t rise = touchRaw[i] - touchBase[i];
          if (rise < trigDelta / 3) {
            touchBase[i] = (touchBase[i] * 63 + touchRaw[i] + 31) / 64;
            touchThr[i] = touchCalcThr(i, touchBase[i]);
          }
        }
        touchStuckSince[i] = 0;
      } else {
        // Chống KẸT: "chạm" liên tục quá lâu => baseline đã lệch, đặt lại theo giá trị hiện tại
        if (touchStuckSince[i] == 0) touchStuckSince[i] = nowMs;
        else if (nowMs - touchStuckSince[i] > TOUCH_STUCK_MS) {
          touchBase[i] = touchRaw[i];
          touchThr[i] = touchCalcThr(i, touchBase[i]);
          touchState[i] = false;
          touchStuckSince[i] = 0;
          raw = false;
          Serial.printf("[Touch] Pad %d (%s) giữ quá lâu, đã hiệu chuẩn lại (baseline=%lu, ngưỡng=%lu)\n",
                        i, touchNames[i], (unsigned long)touchBase[i], (unsigned long)touchThr[i]);
        }
      }
    }
    cnt[i] = raw ? (cnt[i] < 3 ? cnt[i] + 1 : 3) : 0;   // debounce: 2 mẫu liên tiếp (~30ms)
    st[i] = (cnt[i] >= 2);

    if (st[i] && !prevSt[i]) {
      Serial.printf("[Touch] 👉 Nhận chạm %s: raw=%lu / ngưỡng=%lu (base=%lu)\n",
                    touchNames[i], (unsigned long)touchRaw[i], (unsigned long)touchThr[i], (unsigned long)touchBase[i]);
    }
  }

  if (touchDebug) {
    static uint32_t lastDbg = 0;
    if (nowMs - lastDbg >= 200) {
      lastDbg = nowMs;
      Serial.printf("[Touch] T0(D2)=%lu/%lu  T1(D1)=%lu/%lu  T2(D0)=%lu/%lu  -> %d%d%d\n",
                    (unsigned long)touchRaw[0], (unsigned long)touchThr[0],
                    (unsigned long)touchRaw[1], (unsigned long)touchThr[1],
                    (unsigned long)touchRaw[2], (unsigned long)touchThr[2],
                    st[0], st[1], st[2]);
    }
  }
  t0 = st[0]; t1 = st[1]; t2 = st[2];

  if (t0 || t1 || t2)
  {
    lastTouchTime = nowMs;
    pendingSleep = false;               // vừa chạm thì hủy yêu cầu ngủ đang chờ

    if (screenSleeping || screenDimmed) // chạm bất kỳ nút nào cũng đánh thức / làm sáng lại màn hình
    {
      wakeScreen();
      // nuốt lần chạm này, không dùng nó để chuyển menu
      lastT0 = t0; lastT1 = t1; lastT2 = t2;
    }
    else if (notifActive && ((t0 && !lastT0) || (t1 && !lastT1) || (t2 && !lastT2)))
    {
      // Đang hiện popup thông báo: chạm nút để đóng thông báo
      dismissNotificationPopup();
      lastT0 = t0; lastT1 = t1; lastT2 = t2;
    }
  }
}


// ================= CLOCK =================
uint32_t clockTimer=0;

void clockTick()
{
SEC++;

if(SEC>=60){SEC=0;MIN++;}
if(MIN>=60){MIN=0;HH++;}
if(HH>=24){HH=0;DAY++;}

int maxDay=data_daysInMonth(MON,YEAR);

if(DAY>maxDay)
{
DAY=1;
MON++;

if(MON>12)
{
MON=1;
YEAR++;
}
}
}

void updateClock()
{
// dùng cộng dồn 1000ms để không bị trôi giờ
while(millis()-clockTimer>=1000)
{
clockTimer+=1000;
clockTick();
}
}

// Đưa giờ hệ thống (do App đặt bằng SET_TIME) vào đồng hồ hiển thị
void syncClockFromSystem()
{
if(!clockResyncRequested) return;
clockResyncRequested=false;

struct tm ti;
if(!getLocalTime(&ti,0)) return;   // giờ hệ thống chưa hợp lệ

HH=ti.tm_hour;
MIN=ti.tm_min;
SEC=ti.tm_sec;
DAY=ti.tm_mday;
MON=ti.tm_mon+1;
YEAR=(ti.tm_year+1900)%100;

clockTimer=millis();
Serial.printf("[Clock] 🕒 Đã cập nhật giờ: %02d:%02d:%02d %02d/%02d/20%02d\n",HH,MIN,SEC,DAY,MON,YEAR);
}


// ================= BATTERY =================
void updateBatteryPeriodic()
{
#if BATTERY_ADC_PIN >= 0
static uint32_t last=0;
if(last!=0 && millis()-last<30000) return;
last=millis();

uint32_t mv=analogReadMilliVolts(BATTERY_ADC_PIN)*2;   // giả sử chia áp 1/2
int pct=map(constrain((int)mv,3300,4150),3300,4150,0,100);

batteryLevel=pct;
batteryValid=true;
#endif
}


// ================= SENSOR =================
// Một hàm cấu hình duy nhất cho mọi đường khởi động / đánh thức
void sensorConfigure()
{
if(!sensorOk) return;
// powerLevel, sampleAverage, ledMode(2 = Red+IR), sampleRate, pulseWidth, adcRange
particleSensor.setup(LED_AMP,4,2,400,411,4096);
}

// ================= BỘ LỌC ĐO NHỊP TIM / SPO2 ỔN ĐỊNH & ĐỒNG BỘ =================
#define SINGLE_MEASURE_DURATION_MS  6000   // 6.0 giây khi đo riêng HR từ App
#define SINGLE_SPO2_DURATION_MS     7500   // 7.5 giây khi đo riêng SpO2 từ App (thu đủ 100 mẫu + 3 lần tính)
#define FULL_HR_PHASE_DURATION_MS   6000   // 6.0 giây pha HR khi đo đầy đủ trên đồng hồ
#define FULL_SPO2_PHASE_DURATION_MS 6000   // 6.0 giây pha SpO2 khi đo đầy đủ trên đồng hồ
#define MEASURE_STEP_INTERVAL_MS    800    // cập nhật hiển thị & đồng bộ BLE mỗi 0.8 giây

static uint32_t phaseStartMs    = 0;
static uint32_t lastPhaseStepMs = 0;
static float    filteredBpm     = 76.0f;
static float    filteredSpo2    = 98.0f;

// Hàm tính trung vị / trimmed mean để loại bỏ đỉnh giả và làm mượt dao động
static int calculateMedian(const int *arr, int len)
{
  if (len <= 0) return 0;
  if (len == 1) return arr[0];
  if (len == 2) return (arr[0] + arr[1]) / 2;

  int temp[HR_HISTORY_SIZE];
  for (int i = 0; i < len; i++) temp[i] = arr[i];

  // Sắp xếp tăng dần
  for (int i = 1; i < len; i++) {
    int key = temp[i];
    int j = i - 1;
    while (j >= 0 && temp[j] > key) {
      temp[j + 1] = temp[j];
      j--;
    }
    temp[j + 1] = key;
  }

  // Nếu có từ 4 mẫu trở lên, loại bỏ phần tử nhỏ nhất và lớn nhất (trimmed mean)
  if (len >= 4) {
    int sum = 0;
    for (int i = 1; i < len - 1; i++) {
      sum += temp[i];
    }
    return (sum + (len - 2) / 2) / (len - 2);
  }
  return temp[len / 2];
}

bool isWatchMeasuring()
{
  return measureState != WAIT_FINGER;
}

void notifyMeasureProgress(const char *prefix, int progressPct, int value)
{
  if (!bleConnected || !pActivityCharacteristic) return;
  char msg[36];
  snprintf(msg, sizeof(msg), "%s:%d:%d", prefix, progressPct, value);
  currentActivity = String(msg);
  pActivityCharacteristic->setValue(msg);
  pActivityCharacteristic->notify();
}

void resetMeasurement()
{
  measureState=WAIT_FINGER;
  spo2Index=0;
  spo2BufIdx=0;
  decimCnt=0;
  fingerLostSince=0;
  phaseStartMs=0;
  lastPhaseStepMs=0;
  waitingForFinger=false;  // Reset cờ chờ ngón tay

  // Reset thuật toán Heart Rate
  lastBeatTime = 0;
  beatsPerMinute = 0;
  beatAvg = 0;
  rateSpot = 0;
  hrHistoryCount = 0;
  hrHistoryIdx = 0;
  hrValidBeats = 0;
  memset(rates, 0, sizeof(rates));
  memset(hrHistory, 0, sizeof(hrHistory));

  // Reset thuật toán SpO2
  spo2HistoryCount = 0;
  spo2HistoryIdx = 0;
  spo2ValidCalculations = 0;
  memset(spo2Samples, 0, sizeof(spo2Samples));
  memset(spo2History, 0, sizeof(spo2History));
}

void abortMeasurement(const char *reason,bool requireRemove)
{
  Serial.printf("[Sensor] ⚠️ Hủy phép đo: %s\n",reason);
  flushPartialCycle();          // đã có HR thì vẫn lưu lại, không bỏ phí
  resetMeasurement();
  appMeasureType=0;
  needRemoveFinger=false;       // Cho phép đo lại ngay mà không cần nhấc tay
  waitingForFinger=false;       // Tắt cờ chờ ngón tay
  heart_lock_final_graph();
  if (currentMenu == MENU_HEART && !screenSleeping && !notifActive) {
    heart_draw_graph();
  }
  setActivity("REST");
}

void finishHr()
{
  // Chỉ chấp nhận nếu phát hiện được ít nhất 2 nhịp hợp lệ và beatAvg nằm trong dải sinh lý 45-180 BPM
  bool valid = (hrValidBeats >= 2 && beatAvg >= 45 && beatAvg <= 180);
  int finalBpm = valid ? beatAvg : 0;

  bpm = finalBpm;
  hasHr = valid;
  cycleHrValid = valid;
  cycleBpm = finalBpm;

  // Vẽ ngay kết quả cuối cùng lên màn hình đồng hồ để đồng bộ tức thì với App
  if (currentMenu == MENU_HEART && !screenSleeping && !notifActive) {
    heart_draw_bpm();
  }

  if (valid) {
    Serial.printf("[Kết quả] ❤️ Nhịp tim (HR): %d BPM (hợp lệ từ %d nhịp đo)\n", finalBpm, hrValidBeats);
  } else {
    Serial.println("[Kết quả] ⚠️ Nhịp tim (HR) không hợp lệ (không đủ nhịp hoặc tín hiệu nhiễu).");
  }

  notifyHrInstant(finalBpm);

  // Báo cho App qua BLE biết đã đo xong nhịp tim kèm đúng con số trên đồng hồ và điểm rủi ro AI
  if (bleConnected && pActivityCharacteristic) {
    float hrAiRisk = valid ? predictRisk((float)finalBpm, (float)(hasSpo2 && spo2 > 0 ? spo2 : 98), 36.6f) : 0.05f;
    const char* hrRiskLevel = getRiskLevelStr(hrAiRisk);
    char doneHrMsg[48];
    snprintf(doneHrMsg, sizeof(doneHrMsg), "DONE_HR:%d:%.2f:%s", finalBpm, hrAiRisk, hrRiskLevel);
    currentActivity = String(doneHrMsg);
    pActivityCharacteristic->setValue(doneHrMsg);
    pActivityCharacteristic->notify();
  }

  // Nếu là lệnh đo riêng Nhịp tim (MEASURE_HR) từ App -> Hoàn tất ngay và hiện thông báo kết quả!
  if (appMeasureType == 1) {
    cycleHrValid = false;
    lastMeasureMs = millis();
    appMeasureType = 0;
    resetMeasurement();
    needRemoveFinger = false;    // Cho phép đo lại ngay không cần nhấc tay
    heart_lock_final_graph();
    if (currentMenu == MENU_HEART && !screenSleeping && !notifActive) {
      heart_draw_bpm();
      heart_draw_graph();
    }
    if (valid) {
      delay(35); // Đảm bảo gói DONE_HR được phát đi trước khi gửi gói RISK
      triggerLocalHealthNotification(finalBpm, 0); // Hiện thông báo kết quả nhịp tim trên đồng hồ
    }
    currentActivity = "REST";
    return;
  }

  Serial.println("[Sensor] ⏳ Đang đo Nồng độ oxy trong máu (SpO2)...");
  currentActivity = "MEASURING_SPO2";
  if (bleConnected && pActivityCharacteristic) {
    delay(35); // Tránh ghi đè gói DONE_HR trên cùng characteristic 19b10003
    pActivityCharacteristic->setValue("MEASURING_SPO2");
    pActivityCharacteristic->notify();
  }
  phaseStartMs = millis();
  lastPhaseStepMs = phaseStartMs;
  measureState = MEASURE_SPO2;
}

void finishSpo2()
{
  // Chỉ công nhận kết quả khi có ít nhất 1 lần tính hợp lệ từ thuật toán Maxim
  bool valid = (spo2ValidCalculations > 0 && spo2HistoryCount > 0);
  int finalSpo2 = 0;
  if (valid) {
    finalSpo2 = calculateMedian(spo2History, spo2HistoryCount);
    finalSpo2 = constrain(finalSpo2, 80, 100);
  }

  for (int i = 0; i < 3; i++) spo2Samples[i] = finalSpo2;
  spo2Index = valid ? 3 : 0;

  spo2 = finalSpo2;
  hasSpo2 = valid;
  lastMeasureMs = millis();

  if (valid) {
    Serial.printf("[Kết quả] 🩸 Nồng độ oxy (SpO2): %d %% (hợp lệ từ %d lần tính)\n", finalSpo2, spo2ValidCalculations);
    Serial.println("[Sensor] ✅ Đã hoàn tất chu trình đo. Biểu đồ đã dừng tại kết quả cuối cùng.\n");
  } else {
    Serial.println("[Kết quả] ⚠️ Nồng độ SpO2 không hợp lệ (không đủ mẫu hoặc cờ valid = 0).");
  }

  int hrForRecord = cycleHrValid ? cycleBpm : 0;
  cycleHrValid = false;
  appMeasureType = 0;

  resetMeasurement();
  needRemoveFinger = false;      // Cho phép đo lại ngay không cần nhấc tay

  // Khóa biểu đồ tĩnh và cập nhật ngay con số cuối cùng trên màn hình đồng hồ
  heart_lock_final_graph();
  if (currentMenu == MENU_HEART && !screenSleeping && !notifActive) {
    if (hrForRecord > 0) heart_draw_bpm();
    heart_draw_spo2();
    heart_draw_graph();
  }

  notifySpo2Instant(finalSpo2);

  // Báo cho App qua BLE biết đã đo xong SpO2 kèm đúng con số trên đồng hồ và điểm rủi ro AI
  if (bleConnected && pActivityCharacteristic) {
    int refHr = (hrForRecord > 0) ? hrForRecord : (hasHr && bpm > 0 ? bpm : 75);
    float spo2AiRisk = valid ? predictRisk((float)refHr, (float)finalSpo2, 36.6f) : 0.05f;
    const char* spo2RiskLevel = getRiskLevelStr(spo2AiRisk);
    char doneSpo2Msg[48];
    snprintf(doneSpo2Msg, sizeof(doneSpo2Msg), "DONE_SPO2:%d:%.2f:%s", finalSpo2, spo2AiRisk, spo2RiskLevel);
    currentActivity = String(doneSpo2Msg);
    pActivityCharacteristic->setValue(doneSpo2Msg);
    pActivityCharacteristic->notify();
  }

  // Tự động hiển thị popup thông báo kết quả đo nếu có ít nhất 1 chỉ số hợp lệ
  if (hrForRecord > 0 || finalSpo2 > 0) {
    delay(35); // Đảm bảo gói DONE_SPO2 được phát đi trước khi gửi gói RISK
    triggerLocalHealthNotification(hrForRecord, finalSpo2);
  }
  currentActivity = "REST";
}

// Xử lý 1 mẫu từ FIFO
void processSample(long ir,long red)
{
  uint32_t nowMs = millis();

  if (measureState == WAIT_FINGER)
  {
    if (needRemoveFinger)
    {
      if (ir < FINGER_OFF_THRESHOLD || (nowMs - lastMeasureMs > 2500)) {
        needRemoveFinger = false;
      } else {
        return;
      }
    }

    if (ir > FINGER_ON_THRESHOLD)
    {
      Serial.println("\n[Sensor] 🖐️ Đã phát hiện ngón tay!");
      resetMeasurement();
      waitingForFinger = false;  // TẮT cờ chờ khi đã phát hiện ngón tay
      measureStartMs = nowMs;
      phaseStartMs = nowMs;
      lastPhaseStepMs = nowMs;
      lastTouchTime = nowMs;    // Giữ màn hình luôn sáng trong suốt quá trình đo
      pendingSleep = false;

      if (appMeasureType == 2) {
        Serial.println("[Sensor] ⏳ Đang đo SpO2... Vui lòng giữ nguyên tay.");
        notifyMeasureProgress("PROGRESS_SPO2", 5, 0);
        measureState = MEASURE_SPO2;
      } else {
        Serial.println("[Sensor] ⏳ Đang đo Nhịp tim (HR)... Vui lòng giữ nguyên tay.");
        notifyMeasureProgress("PROGRESS_HR", 5, 0);
        measureState = MEASURE_BPM;
      }
    }
    return;
  }

  // ---- đang đo: giữ màn hình không tắt và kiểm tra rút tay ----
  lastTouchTime = nowMs;
  pendingSleep = false;

  // Kiểm tra rút tay / ngón tay lỏng
  if (ir < FINGER_OFF_THRESHOLD)
  {
    if (fingerLostSince == 0) fingerLostSince = nowMs;
    else if (nowMs - fingerLostSince > FINGER_LOST_MS)
    {
      abortMeasurement("ngón tay bị rút ra", false);
      return;
    }
    return;
  }
  else fingerLostSince = 0;

  // Kiểm tra chất lượng tín hiệu quang học thô (tránh bão hòa ADC 18-bit hoặc quá yếu)
  bool signalInRange = (ir >= FINGER_ON_THRESHOLD && ir < 260000 && red >= FINGER_ON_THRESHOLD && red < 260000);

  // ================= THU THẬP DỮ LIỆU RED & IR CHO SPO2 (25 SPS) =================
  // Giảm mẫu 100 sps (400 sps / 4 avg) -> 25 sps cho thuật toán Maxim
  if (++decimCnt >= SPO2_DECIM)
  {
    decimCnt = 0;
    if (signalInRange)
    {
      if (spo2BufIdx < BUFFER_SIZE) {
        irBuf[spo2BufIdx] = (uint32_t)ir;
        redBuf[spo2BufIdx] = (uint32_t)red;
        spo2BufIdx++;
      }

      // Khi đủ 100 mẫu (4 giây đầu tiên) hoặc mỗi 25 mẫu bổ sung (mỗi 1 giây tiếp theo)
      if (spo2BufIdx >= BUFFER_SIZE)
      {
        int32_t spo2Val = 0, hrFromSpo2 = 0;
        int8_t spo2Valid = 0, hrFromSpo2Valid = 0;

        // Gọi hàm thuật toán Maxim từ thư viện SparkFun MAX3010x
        maxim_heart_rate_and_oxygen_saturation(irBuf, BUFFER_SIZE, redBuf,
                                               &spo2Val, &spo2Valid,
                                               &hrFromSpo2, &hrFromSpo2Valid);

        // Dịch chuyển buffer 25 mẫu (1 giây), giữ lại 75 mẫu theo Example8_SPO2
        for (int i = 25; i < BUFFER_SIZE; i++) {
          irBuf[i - 25] = irBuf[i];
          redBuf[i - 25] = redBuf[i];
        }
        spo2BufIdx = BUFFER_SIZE - 25; // 75

        // Chỉ chấp nhận khi cờ hợp lệ được thuật toán xác nhận VÀ giá trị trong dải sinh lý 80 - 100%
        if (spo2Valid == 1 && spo2Val >= 80 && spo2Val <= 100)
        {
          spo2ValidCalculations++;

          // Đưa vào cửa sổ trượt để làm mượt
          spo2History[spo2HistoryIdx++] = (int)spo2Val;
          spo2HistoryIdx %= SPO2_HISTORY_SIZE;
          if (spo2HistoryCount < SPO2_HISTORY_SIZE) spo2HistoryCount++;

          // Đồng bộ với mảng cũ spo2Samples[3]
          for (int i = 0; i < min(3, spo2HistoryCount); i++) {
            spo2Samples[i] = spo2History[i];
          }
          spo2Index = min(3, spo2HistoryCount);
        }
      }
    }
  }

  // ================= XỬ LÝ PHA ĐO NHỊP TIM (MEASURE_BPM) =================
  if (measureState == MEASURE_BPM)
  {
    // Gọi hàm phát hiện đỉnh nhịp mạch checkForBeat từ SparkFun heartRate.h
    if (signalInRange && checkForBeat((int32_t)ir))
    {
      // Bỏ qua giai đoạn quá độ 750ms đầu sau khi chạm ngón tay để DC estimator ổn định
      if (nowMs - measureStartMs >= 750)
      {
        if (lastBeatTime == 0)
        {
          // Nhịp đầu tiên được phát hiện: ghi nhận mốc thời gian để tính Δt cho nhịp sau
          lastBeatTime = nowMs;
        }
        else
        {
          long delta = nowMs - lastBeatTime;

          // 1. Kiểm tra thời gian trơ (Refractory Period):
          // Con người không có nhịp tim > 180 BPM lúc bình thường (Δt < 333ms).
          // Nếu Δt < 330ms, đây thường là sóng dicrotic notch hoặc rung tay.
          // Bỏ qua đỉnh giả này VÀ KHÔNG cập nhật lastBeatTime để nhịp chính sau tính đúng chu kỳ.
          if (delta >= 330)
          {
            // 2. Nếu khoảng cách quá lớn (> 2000ms ~ dưới 30 BPM), có thể bị nhỡ nhịp:
            // Đặt lại lastBeatTime = nowMs để đo lại từ nhịp tiếp theo, không tính giá trị giả.
            if (delta > 2000)
            {
              lastBeatTime = nowMs;
            }
            else
            {
              // 3. Tính nhịp tim tức thời: HR = 60 / Δt (BPM)
              float instantBpm = 60000.0f / (float)delta;

              // 4. Giới hạn dải sinh lý hợp lệ (45 - 180 BPM)
              if (instantBpm >= 45.0f && instantBpm <= 180.0f)
              {
                // 5. Khử đột biến (outlier rejection):
                // Nếu đã có từ 2 nhịp hợp lệ và nhịp mới nhảy vọt > 35 BPM so với trung bình,
                // loại bỏ giá trị này để tránh dao động bất thường.
                bool isOutlier = false;
                if (hrValidBeats >= 2 && beatAvg > 0) {
                  if (abs((int)instantBpm - beatAvg) > 35) {
                    isOutlier = true;
                  }
                }

                if (!isOutlier)
                {
                  lastBeatTime = nowMs;
                  beatsPerMinute = instantBpm;
                  hrValidBeats++;

                  // Cập nhật rates[4] cũ để bảo toàn tính tương thích
                  rates[rateSpot++] = (byte)constrain((int)(instantBpm + 0.5f), 45, 180);
                  rateSpot %= 4;

                  // Lưu vào cửa sổ trượt hrHistory và tính trung vị làm mượt
                  hrHistory[hrHistoryIdx++] = (int)(instantBpm + 0.5f);
                  hrHistoryIdx %= HR_HISTORY_SIZE;
                  if (hrHistoryCount < HR_HISTORY_SIZE) hrHistoryCount++;

                  beatAvg = calculateMedian(hrHistory, hrHistoryCount);
                }
                else
                {
                  // Cập nhật lastBeatTime để nhịp sau không bị cộng dồn Δt quá lớn
                  lastBeatTime = nowMs;
                }
              }
              else
              {
                lastBeatTime = nowMs;
              }
            }
          }
        }
      }
    }

    uint32_t targetDuration = (appMeasureType == 1) ? SINGLE_MEASURE_DURATION_MS : FULL_HR_PHASE_DURATION_MS;
    uint32_t elapsed = nowMs - phaseStartMs;

    // Cập nhật hiển thị và đồng bộ BLE mỗi 800ms
    if (nowMs - lastPhaseStepMs >= MEASURE_STEP_INTERVAL_MS && elapsed < targetDuration)
    {
      lastPhaseStepMs = nowMs;

      // Chỉ cập nhật hiển thị số đo khi đã có ít nhất 2 nhịp hợp lệ
      int displayBpm = (hrValidBeats >= 2 && beatAvg >= 45 && beatAvg <= 180) ? beatAvg : 0;
      bpm = displayBpm;
      hasHr = (displayBpm > 0);

      if (currentMenu == MENU_HEART && !screenSleeping && !notifActive) {
        heart_draw_bpm();
      }

      int pct = 20 + (int)((elapsed * 72UL) / targetDuration);
      if (pct > 92) pct = 92;

      Serial.printf("[Sensor] 💓 Nhịp tim đang đo: %d BPM (hợp lệ=%d nhịp, tức thời=%.0f) - %d%%\n",
                    displayBpm, hrValidBeats, beatsPerMinute, pct);
      if (displayBpm > 0) {
        notifyHrInstant(displayBpm);
      }
      notifyMeasureProgress("PROGRESS_HR", pct, displayBpm);
    }

    if (elapsed >= targetDuration)
    {
      finishHr();
    }
  }
  // ================= XỬ LÝ PHA ĐO SPO2 (MEASURE_SPO2) =================
  else if (measureState == MEASURE_SPO2)
  {
    uint32_t targetDuration = (appMeasureType == 2) ? SINGLE_SPO2_DURATION_MS : FULL_SPO2_PHASE_DURATION_MS;
    uint32_t elapsed = nowMs - phaseStartMs;

    // Cập nhật hiển thị và đồng bộ BLE mỗi 800ms
    if (nowMs - lastPhaseStepMs >= MEASURE_STEP_INTERVAL_MS && elapsed < targetDuration)
    {
      lastPhaseStepMs = nowMs;

      // Chỉ hiển thị giá trị khi thuật toán Maxim đã xác nhận cờ hợp lệ
      int displaySpo2 = (spo2ValidCalculations > 0 && spo2HistoryCount > 0) ?
                        constrain(calculateMedian(spo2History, spo2HistoryCount), 80, 100) : 0;
      spo2 = displaySpo2;
      hasSpo2 = (displaySpo2 > 0);

      if (currentMenu == MENU_HEART && !screenSleeping && !notifActive) {
        heart_draw_spo2();
      }

      int pct = 20 + (int)((elapsed * 72UL) / targetDuration);
      if (pct > 92) pct = 92;

      Serial.printf("[Sensor] 🩸 Nồng độ SpO2 đang đo: %d%% (hợp lệ=%d lần) - %d%%\n",
                    displaySpo2, spo2ValidCalculations, pct);
      if (displaySpo2 > 0) {
        notifySpo2Instant(displaySpo2);
      }
      notifyMeasureProgress("PROGRESS_SPO2", pct, displaySpo2);
    }

    if (elapsed >= targetDuration)
    {
      finishSpo2();
    }
  }
}

void sensorService()
{
  particleSensor.check();

  while (particleSensor.available())
  {
    long ir = particleSensor.getFIFOIR();
    long red = particleSensor.getFIFORed();
    particleSensor.nextSample();
    processSample(ir, red);
  }

  // timeout tổng
  if (measureState != WAIT_FINGER && millis() - measureStartMs > MEASURE_TIMEOUT_MS)
  {
    if (measureState == MEASURE_SPO2)
    {
      finishSpo2();
    }
    else abortMeasurement("quá thời gian đo", true);
  }
}


// ================= SLEEP / AOD / WAKE =================
void sleepScreen()
{
  screenSleeping=true;
  screenDimmed=false;
  sleepEnteredMs=millis();
  wakeIrBaseline=0;

  if(sensorOk) {
    // Nếu bật Nhấc tay sáng màn hình và không có IMU rời thì giữ cảm biến ở chế độ chờ phát hiện chuyển động
    if (!raiseToWake || imuOk) {
      particleSensor.shutDown();
    }
  }

  // tắt màn hoàn toàn
  ledcWrite(TFT_BL,0);
}

// Chế độ Màn hình luôn bật (AOD - Always-On Display): giữ màn hình sáng mờ tiết kiệm pin
void dimScreenAOD()
{
  if (screenDimmed && !screenSleeping) return;
  screenSleeping=false;
  screenDimmed=true;
  sleepEnteredMs=millis();
  wakeIrBaseline=0;

  // Nếu đang ở menu khác (không đang chỉnh giờ và không đang đo), chuyển về mặt đồng hồ chính
  if (currentMenu != MENU_START && !editMode && measureState == WAIT_FINGER) {
    currentMenu = MENU_START;
    gfx->fillScreen(0);
    start_draw_static();
  }

  if (sensorOk && measureState == WAIT_FINGER && (!raiseToWake || imuOk)) {
    particleSensor.shutDown();
  }

  // Giảm độ sáng xuống mức mờ AOD (~15%)
  ledcWrite(TFT_BL, BL_AOD_LEVEL);
  Serial.println("[AOD] 🔅 Màn hình chuyển sang chế độ Luôn bật (sáng mờ AOD).");
}


// ================= WAKE =================
void wakeScreen()
{
  bool wasSleeping = screenSleeping;
  screenSleeping=false;
  screenDimmed=false;

  if(sensorOk)
  {
    particleSensor.wakeUp();
    sensorConfigure();     // cấu hình giống mọi đường khác (cùng LED_AMP)
  }

  // sáng 80%
  ledcWrite(TFT_BL, BL_NORMAL_LEVEL);

  // Chỉ vẽ lại toàn bộ nền nếu trước đó màn hình đã tắt hẳn
  if (wasSleeping) {
    gfx->fillScreen(0);
    if(currentMenu==MENU_START) start_draw_static();
    else if(currentMenu==MENU_HEART) heart_draw_static();
    else if(currentMenu==MENU_DATA) data_draw_static();
    else if(currentMenu==MENU_NOTIF) notif_draw_static();
  }

  lastTouchTime=millis();
}


// ================= CẢM BIẾN NHẤC TAY SÁNG MÀN HÌNH (RAISE TO WAKE) =================
// Tự động dò IMU MPU6050 (0x68 / 0x69) trên bus I2C (D4/D5) nếu có gắn,
// đồng thời kết hợp cảm biến quang học MAX30102 để phát hiện cử chỉ nhấc/xoay cổ tay.
void initIMU()
{
  const uint8_t addrs[2] = {0x68, 0x69};
  for (int i = 0; i < 2; i++) {
    Wire.beginTransmission(addrs[i]);
    if (Wire.endTransmission() == 0) {
      imuAddr = addrs[i];
      // Đánh thức MPU6050 (thanh ghi PWR_MGMT_1 = 0x6B -> 0x00)
      Wire.beginTransmission(imuAddr);
      Wire.write(0x6B);
      Wire.write(0x00);
      if (Wire.endTransmission() == 0) {
        imuOk = true;
        Serial.printf("[IMU] ✅ Phát hiện cảm biến gia tốc MPU6050 tại 0x%02X (hỗ trợ Nhấc tay sáng màn hình).\n", imuAddr);
        return;
      }
    }
  }
  Serial.println("[RaiseToWake] ℹ️ Không tìm thấy MPU6050 rời -> Sử dụng cảm biến quang học MAX30102 để nhận diện nhấc/chuyển động cổ tay.");
}

void updateRaiseToWake()
{
  if (!raiseToWake) return;
  if (!screenSleeping && !screenDimmed) return;

  // Chờ tối thiểu 1.5 giây sau khi màn hình vừa tắt/mờ để tránh tự bật sáng lại ngay
  if (millis() - sleepEnteredMs < 1500) return;

  static uint32_t lastCheckMs = 0;
  if (millis() - lastCheckMs < 100) return;
  lastCheckMs = millis();

  // 1. Nếu có gắn cảm biến gia tốc MPU6050 trên bus I2C
  if (imuOk) {
    Wire.beginTransmission(imuAddr);
    Wire.write(0x3B); // ACCEL_XOUT_H
    if (Wire.endTransmission(false) == 0 && Wire.requestFrom((int)imuAddr, 6) == 6) {
      int16_t rawAx = (Wire.read() << 8) | Wire.read();
      int16_t rawAy = (Wire.read() << 8) | Wire.read();
      int16_t rawAz = (Wire.read() << 8) | Wire.read();

      float axG = rawAx / 16384.0f;
      float ayG = rawAy / 16384.0f;
      float azG = rawAz / 16384.0f;

      float deltaG = fabs(axG - prevAxG) + fabs(ayG - prevAyG) + fabs(azG - prevAzG);
      prevAxG = axG;
      prevAyG = ayG;
      prevAzG = azG;

      // Ghi nhận trạng thái hạ tay khi mặt đồng hồ nghiêng/úp
      if (azG < 0.40f || fabs(axG) > 0.65f || fabs(ayG) > 0.65f) {
        wristWasLowered = true;
      }

      // Khi cổ tay xoay đưa mặt đồng hồ hướng lên mắt người dùng (azG > 0.62g) kèm chuyển động
      bool facingUser = (azG > 0.62f && fabs(axG) < 0.65f && fabs(ayG) < 0.70f);
      if ((wristWasLowered && facingUser && deltaG > 0.18f) || deltaG > 0.55f) {
        wristWasLowered = false;
        wakeScreen();
        Serial.println("[RaiseToWake] ⌚ Phát hiện cử chỉ nhấc/xoay cổ tay (IMU) -> Bật sáng màn hình!");
        return;
      }
    }
  }

  // 2. Nhận diện chuyển động nhấc cổ tay / tiếp xúc qua biến thiên phản xạ hồng ngoại MAX30102
  if (sensorOk) {
    long ir = particleSensor.getIR();
    if (wakeIrBaseline == 0) {
      wakeIrBaseline = ir;
      return;
    }

    long diff = labs(ir - wakeIrBaseline);
    bool wasOffSkin = (wakeIrBaseline < FINGER_OFF_THRESHOLD);
    wakeIrBaseline = (wakeIrBaseline * 7 + ir) / 8;

    // Kích hoạt khi: (a) đưa cổ tay/ngón tay vào cảm biến, hoặc (b) xoay cổ tay tạo biến thiên phản xạ đột ngột
    if ((wasOffSkin && ir > FINGER_ON_THRESHOLD) ||
        (wasOffSkin && diff > 1800) ||
        (!wasOffSkin && diff > (wakeIrBaseline / 5))) {
      wakeScreen();
      Serial.printf("[RaiseToWake] ⌚ Phát hiện chuyển động nhấc tay (IR=%ld, Δ=%ld) -> Bật sáng màn hình!\n", ir, diff);
      return;
    }
  }
}


// Chuyển menu và vẽ lại màn hình (dùng cho lệnh từ App)
void gotoMenu(int m)
{
currentMenu=m;
gfx->fillScreen(0);
if(m==MENU_START) start_draw_static();
else if(m==MENU_HEART) heart_draw_static();
else if(m==MENU_DATA) data_draw_static();
else if(m==MENU_NOTIF) notif_draw_static();
}

// ================= HIỂN THỊ POPUP THÔNG BÁO TRÊN ĐỒNG HỒ =================
String sanitizeWatchAscii(const String &s, int maxLen)
{
  String out = "";
  for (int i = 0; i < (int)s.length() && (int)out.length() < maxLen; i++) {
    char c = s.charAt(i);
    if (c >= 0x20 && c <= 0x7E) {
      out += c;
    }
  }
  out.trim();
  return out;
}

bool isNotifCategoryAllowed(const String &type)
{
  if (type.equalsIgnoreCase("DEMO")) return true; // Luôn cho phép thông báo Demo tùy chỉnh
  if (!notifEnabled) return false;
  if (type.equalsIgnoreCase("CALL")) return notifCalls;
  if (type.equalsIgnoreCase("SMS")) return notifSms;
  if (type.equalsIgnoreCase("WATER") || type.equalsIgnoreCase("SEDENTARY")) return notifSedentary;
  if (type.startsWith("HEALTH") || type.startsWith("HR_") || type.startsWith("SPO2_")) return notifHealth;
  // Loại bỏ hoàn toàn thông báo từ các ứng dụng khác trên điện thoại (APP)
  return false;
}

// Tự động đánh giá và hiển thị Popup thông báo/cảnh báo khi đo xong Nhịp tim & SpO2
void triggerLocalHealthNotification(int measuredBpm, int measuredSpo2)
{
  if (measuredBpm <= 0 && measuredSpo2 <= 0) return;

  // 1. Chạy Edge AI đánh giá điểm rủi ro sức khỏe
  float aiRisk = predictRisk((float)measuredBpm, (float)measuredSpo2, 36.6f);
  const char* riskDesc = getRiskDescription(aiRisk);
  const char* riskLevel = getRiskLevelStr(aiRisk);
  uint16_t riskColor = getRiskColorRgb565(aiRisk);

  // 2. Luôn gửi kết quả đánh giá AI qua BLE lên App điện thoại (kể cả khi tắt popup trên đồng hồ)
  if (bleConnected && pActivityCharacteristic) {
    char riskBle[32];
    snprintf(riskBle, sizeof(riskBle), "RISK:%.2f,%s", aiRisk, riskLevel);
    pActivityCharacteristic->setValue(riskBle);
    pActivityCharacteristic->notify();
  }

  if (!notifEnabled || !notifHealth) return;

  bool hrLow = (measuredBpm > 0 && measuredBpm < hrAlertLow);
  bool hrHigh = (measuredBpm > 0 && measuredBpm > hrAlertHigh);
  bool spo2Low = (measuredSpo2 > 0 && measuredSpo2 < spo2AlertLow);
  bool spo2High = (measuredSpo2 > 100);
  bool isAiWarning = (aiRisk >= 0.55f);
  bool isWarning = (hrLow || hrHigh || spo2Low || spo2High || isAiWarning);

  String hrState = "Binh thuong";
  if (hrLow) hrState = "QUA THAP!";
  else if (hrHigh) hrState = "QUA CAO!";

  String spo2State = "Binh thuong";
  if (spo2Low) spo2State = "QUA THAP!";
  else if (spo2High) spo2State = "QUA CAO!";

  String title = isAiWarning ? "AI: CANH BAO NGUY CO CAO!" : "KET QUA DO SUC KHOE";
  if (hrHigh && spo2Low) title = "HR CAO & SPO2 THAP";
  else if (hrLow && spo2Low) title = "HR & SPO2 QUA THAP";
  else if (hrHigh) title = "NHIP TIM QUA CAO!";
  else if (hrLow) title = "NHIP TIM QUA THAP!";
  else if (spo2Low) title = "SPO2 QUA THAP!";

  char bodyBuf[96];
  if (measuredBpm > 0 && measuredSpo2 > 0) {
    snprintf(bodyBuf, sizeof(bodyBuf), "HR:%d O2:%d%% | AI: %s (%.0f%%)",
             measuredBpm, measuredSpo2, riskDesc, aiRisk * 100.0f);
  } else if (measuredBpm > 0) {
    snprintf(bodyBuf, sizeof(bodyBuf), "HR:%d BPM | AI: %s",
             measuredBpm, riskDesc);
  } else {
    snprintf(bodyBuf, sizeof(bodyBuf), "O2:%d%% | AI: %s",
             measuredSpo2, riskDesc);
  }

  String nType = isWarning ? "HEALTH_WARN" : "HEALTH_OK";
  if (screenSleeping || screenDimmed) {
    wakeScreen();
  }
  activeNotifDurationMs = NOTIF_DURATION_HEALTH_MS;
  hasLastNotif     = true;
  notifActive      = true;
  notifShownMs     = millis();
  lastTouchTime    = millis();
  pendingSleep     = false;
  activeNotifType  = nType;
  activeNotifColor = riskColor;
  activeNotifTitle = title;
  activeNotifBody  = String(bodyBuf);
  activeNotifHH    = HH;
  activeNotifMM    = MIN;
  appNotifPending  = false; // Hiển thị trực tiếp ngay lập tức, không delay qua cờ chờ
  drawNotificationPopup(activeNotifType, activeNotifTitle, activeNotifBody);
  Serial.printf("[Sensor] 🔔 Hiển thị thông báo AI [%s | Color=0x%04X] %s: %s\n",
                nType.c_str(), activeNotifColor, title.c_str(), bodyBuf);
  Serial.printf("[Sensor] 🔔 Hiển thị thông báo kết quả đo tức thì [%s - %lus] %s: %s\n",
                nType.c_str(), (unsigned long)(activeNotifDurationMs / 1000), title.c_str(), bodyBuf);
}

// Đo chiều rộng pixel thực tế của chuỗi với GFXfont
int measureGfxTextWidth(const GFXfont *font, const String &s)
{
  if (!font || s.length() == 0) return 0;
  uint8_t first = pgm_read_byte(&font->first);
  uint8_t last  = pgm_read_byte(&font->last);
  const GFXglyph *glyphs = (const GFXglyph *)pgm_read_ptr(&font->glyph);
  int w = 0;
  for (int i = 0; i < (int)s.length(); i++) {
    uint8_t c = (uint8_t)s.charAt(i);
    if (c >= first && c <= last) {
      w += pgm_read_byte(&glyphs[c - first].xAdvance);
    }
  }
  return w;
}

// Vẽ 1 dòng văn bản căn đều hai bên trái - phải (xLeft .. xRight)
void drawJustifiedGfxLine(const GFXfont *font, const String &lineStr, int xLeft, int xRight, int y, bool justifyBothSides)
{
  String s = lineStr;
  s.trim();
  if (s.length() == 0) return;

  gfx->setFont(font);
  int maxWidth = xRight - xLeft;

  // Tách dòng thành các từ
  String words[12];
  int wordCount = 0;
  int start = 0;
  for (int i = 0; i <= (int)s.length() && wordCount < 12; i++) {
    if (i == (int)s.length() || s.charAt(i) == ' ') {
      if (i > start) {
        words[wordCount++] = s.substring(start, i);
      }
      start = i + 1;
    }
  }

  // Nếu chỉ có 1 từ hoặc không yêu cầu dàn đều 2 bên (và không phải dòng có từ khóa trạng thái):
  if (wordCount <= 1 || !justifyBothSides) {
    gfx->setCursor(xLeft, y);
    gfx->print(s);
    return;
  }

  int totalWordsW = 0;
  for (int i = 0; i < wordCount; i++) {
    totalWordsW += measureGfxTextWidth(font, words[i]);
  }

  int extraSpace = maxWidth - totalWordsW;
  int gaps = wordCount - 1;
  if (extraSpace <= 0 || gaps <= 0) {
    gfx->setCursor(xLeft, y);
    gfx->print(s);
    return;
  }

  // Phân bổ khoảng trắng đều giữa các từ để mép trái chạm xLeft (14) và mép phải chạm xRight (226)
  int curX = xLeft;
  for (int i = 0; i < wordCount; i++) {
    if (i == wordCount - 1) {
      curX = xRight - measureGfxTextWidth(font, words[i]);
    }
    gfx->setCursor(curX, y);
    gfx->print(words[i]);
    if (i < gaps) {
      int gapW = (extraSpace * (i + 1)) / gaps - (extraSpace * i) / gaps;
      curX += measureGfxTextWidth(font, words[i]) + gapW;
    }
  }
}

void drawNotificationPopup(const String &type, const String &title, const String &body)
{
  uint16_t accentColor = 0x07E0; // GREEN mặc định
  const char *headerLabel = "THONG BAO MOI";

  if (type.equalsIgnoreCase("CALL")) {
    accentColor = 0x07E0; // Xanh lá
    headerLabel = "CUOC GOI DEN";
  } else if (type.equalsIgnoreCase("SMS")) {
    accentColor = 0x07FF; // Xanh dương sáng (Cyan)
    headerLabel = "TIN NHAN SMS";
  } else if (type.equalsIgnoreCase("WATER") || type.equalsIgnoreCase("SEDENTARY")) {
    accentColor = 0xFFE0; // Vàng nhắc uống nước
    headerLabel = "NHAC UONG NUOC";
  } else if (type.equalsIgnoreCase("DEMO")) {
    accentColor = 0x07E0;
    headerLabel = "DEMO THONG BAO";
  } else if (type.equalsIgnoreCase("HEALTH_OK") ||
             type.equalsIgnoreCase("HR_NORMAL") ||
             type.equalsIgnoreCase("SPO2_NORMAL")) {
    accentColor = 0x07E0; // Xanh lá an toàn
    headerLabel = "THONG BAO SUC KHOE";
  } else {
    accentColor = 0xF800; // Đỏ cảnh báo (HEALTH, HEALTH_WARN, HR_LOW, HR_HIGH, SPO2_LOW, SPO2_HIGH)
    headerLabel = "CANH BAO SUC KHOE";
  }

  // Ghi đè màu thông báo tùy chỉnh nếu người dùng chọn màu trong mục Demo Thông báo trên App
  if (activeNotifColor != 0) {
    accentColor = activeNotifColor;
  }

  const int xLeft = 14;
  const int xRight = 226;
  const int maxLineW = xRight - xLeft; // 212px đối xứng 2 bên màn hình 240x240

  // Nền đen & khung viền đôi nổi bật
  gfx->fillScreen(0x0000);
  gfx->drawRect(2, 2, 236, 236, accentColor);
  gfx->drawRect(4, 4, 232, 232, accentColor);

  // Thanh tiêu đề trên cùng (căn giữa cân đối 2 bên)
  gfx->fillRect(6, 6, 228, 36, accentColor);
  String hdrStr = String(headerLabel);
  int hdrW = measureGfxTextWidth(&Orbitron_Bold_14, hdrStr);
  gfx->setFont(&Orbitron_Bold_14);
  gfx->setTextColor(0x0000);
  gfx->setCursor(max(10, (240 - hdrW) / 2), 29);
  gfx->print(hdrStr);

  // Tên người gửi / Tiêu đề thông báo (căn trái tại xLeft = 14)
  String cleanTitle = sanitizeWatchAscii(title, 20);
  if (cleanTitle.length() == 0) cleanTitle = "ProWatch";
  gfx->setFont(&Orbitron_Bold_16);
  gfx->setTextColor(accentColor);
  gfx->setCursor(xLeft, 72);
  gfx->print(cleanTitle);

  // Đường kẻ phân cách
  gfx->drawFastHLine(xLeft, 84, maxLineW, 0x4208);

  // Nội dung thông báo: ngắt dòng theo chiều rộng pixel thực tế và căn trái tại xLeft = 14
  String cleanBody = sanitizeWatchAscii(body, 88);
  gfx->setFont(&Orbitron_Bold_14);
  gfx->setTextColor(0xFFFF);

  String lines[4];
  int lineCount = 0;
  int idx = 0;
  int len = cleanBody.length();

  while (lineCount < 4 && idx < len) {
    while (idx < len && cleanBody.charAt(idx) == ' ') idx++;
    if (idx >= len) break;

    int bestEnd = idx;
    int lastSpace = -1;
    for (int k = idx; k < len; k++) {
      String candidate = cleanBody.substring(idx, k + 1);
      int w = measureGfxTextWidth(&Orbitron_Bold_14, candidate);
      if (cleanBody.charAt(k) == ' ') lastSpace = k;
      if (w > maxLineW) {
        if (lastSpace > idx) {
          bestEnd = lastSpace;
        } else {
          bestEnd = max(idx + 1, k);
        }
        break;
      }
      bestEnd = k + 1;
    }

    String sub = cleanBody.substring(idx, bestEnd);
    sub.trim();
    lines[lineCount++] = sub;
    idx = bestEnd;
  }

  int lineY = 112;
  for (int i = 0; i < lineCount; i++) {
    gfx->setCursor(xLeft, lineY);
    gfx->print(lines[i]);
    lineY += 24;
  }

  // Chân trang căn trái tại xLeft = 14
  gfx->drawFastHLine(xLeft, 198, maxLineW, 0x4208);
  gfx->setFont(&Orbitron_Bold_10);
  gfx->setTextColor(accentColor);
  gfx->setCursor(xLeft, 220);
  gfx->printf("%02d:%02d - CHAM DE DONG", HH, MIN);
}

void dismissNotificationPopup()
{
  if (!notifActive) return;
  notifActive = false;
  lastTouchTime = millis();
  pendingSleep = false;
  gotoMenu(currentMenu);
}

// Màn hình thứ 4: Hộp thư Thông báo (MENU_NOTIF) trên đồng hồ
void notif_draw_static()
{
  const int xLeft = 14;
  const int xRight = 226;
  gfx->fillScreen(0x0000);
  gfx->drawRect(2, 2, 236, 236, 0x07E0);
  gfx->fillRect(6, 6, 228, 34, 0x07E0);
  String hdr = "HOP THU THONG BAO";
  int hdrW = measureGfxTextWidth(&Orbitron_Bold_14, hdr);
  gfx->setFont(&Orbitron_Bold_14);
  gfx->setTextColor(0x0000);
  gfx->setCursor(max(10, (240 - hdrW) / 2), 28);
  gfx->print(hdr);

  if (!hasLastNotif) {
    gfx->setFont(&Orbitron_Bold_14);
    gfx->setTextColor(0x07E0);
    gfx->setCursor(xLeft, 108);
    gfx->print("CHUA CO THONG BAO");

    gfx->setFont(&Orbitron_Bold_10);
    gfx->setTextColor(0xFFFF);
    gfx->setCursor(xLeft, 140);
    gfx->print("Ket noi BLE voi App");
    gfx->setCursor(xLeft, 162);
    gfx->print("ProWatch de dong bo.");
  } else {
    drawNotificationPopup(activeNotifType, activeNotifTitle, activeNotifBody);
    // Ghi đè dòng chân trang căn trái cho màn hình MENU_NOTIF
    gfx->fillRect(10, 200, 220, 30, 0x0000);
    gfx->drawFastHLine(xLeft, 198, xRight - xLeft, 0x4208);
    gfx->setFont(&Orbitron_Bold_10);
    gfx->setTextColor(0x07E0);
    gfx->setCursor(xLeft, 220);
    gfx->printf("LUC %02d:%02d - D2 QUAY LAI", activeNotifHH, activeNotifMM);
  }
}


// ================= SETUP =================
void setup()
{
setCpuFrequencyMhz(CPU_FREQ_MHZ);

Serial.begin(115200);
Serial.setTimeout(20);   // readStringUntil không chặn loop() tới 1 giây
delay(200);
Serial.println("\n==============================================");
Serial.println("  PROWATCH S3 - SMARTWATCH FIRMWARE BOOTING   ");
Serial.printf ("  Firmware: ", FIRMWARE_VER);
Serial.println("==============================================");

// Múi giờ Việt Nam: để giờ do điện thoại gửi (SET_TIME) hiển thị đúng
setenv("TZ","ICT-7",1);
tzset();

// Khôi phục cấu hình hiển thị và thông báo từ Flash NVS
loadDisplaySettings();

Wire.begin(D4,D5);

sensorOk=particleSensor.begin(Wire, I2C_SPEED_FAST);
if(!sensorOk) Serial.println("[Sensor] ❌ Không tìm thấy MAX30102! Kiểm tra dây I2C (SDA=D4, SCL=D5).");
sensorConfigure();
initIMU();
activityInit();

// PWM backlight
pinMode(TFT_BL, OUTPUT);
ledcAttach(TFT_BL,5000,8);
ledcWrite(TFT_BL, BL_NORMAL_LEVEL);   // 80%

gfx->begin();
gfx->fillScreen(0);

start_draw_static();

lastTouchTime=millis();
clockTimer=millis();

initBLE();
delay(300);          // chờ radio BLE ổn định
initRiskPredictor(); // Khởi tạo mô hình TinyML AI đánh giá rủi ro sức khỏe

// Hiệu chuẩn touch SAU khi BLE + màn hình đã hoạt động
// (nhiễu RF / SPI lúc này đã có mặt nên baseline sẽ đúng). Giữ tay khỏi các pad lúc khởi động.
calibrateTouch();
}


// ================= LOOP =================
void loop()
{
updateTouch();
updateRaiseToWake();
updateClock();
syncClockFromSystem();
updateBatteryPeriodic();
activityUpdate();

// CẢM BIẾN: CHỈ đo khi có lệnh từ App (waitingForFinger=true) hoặc đang trong quá trình đo (measureState!=WAIT_FINGER)
if(sensorOk && !screenSleeping && !notifActive &&
   (measureState!=WAIT_FINGER || waitingForFinger))
sensorService();

uint32_t sleepTime =
(currentMenu==MENU_HEART) ? SLEEP_HEART : SLEEP_NORMAL;

// Tự động đóng popup thông báo: 5 giây cho Cuộc gọi/SMS/Uống nước, 10 giây cho Kết quả sau khi đo
if (notifActive && (millis() - notifShownMs >= activeNotifDurationMs))
{
  dismissNotificationPopup();
}

// Kiểm tra hết thời gian sáng màn hình
if(!screenSleeping && !screenDimmed && !notifActive && millis()-lastTouchTime>sleepTime)
pendingSleep=true;

// Xử lý khi hết thời gian chờ: nếu bật AOD thì chuyển sang sáng mờ, nếu tắt AOD thì tắt màn
if(pendingSleep && measureState==WAIT_FINGER && !notifActive)
{
  if (alwaysOnDisplay) {
    dimScreenAOD();
  } else {
    sleepScreen();
  }
  pendingSleep=false;
}

bool wasEditMode = editMode;

if(!screenSleeping && !notifActive)
{
switch(currentMenu)
{
case MENU_START: start_update(); break;
case MENU_HEART: heart_update(); break;
case MENU_DATA: data_update(); break;
}
}

if(!wasEditMode && !editMode && !screenSleeping && !notifActive)
{
if(t0 && !lastT0)
{
if(currentMenu==MENU_START)
{
currentMenu=MENU_NOTIF;
gfx->fillScreen(0);
notif_draw_static();
}
else if(currentMenu==MENU_HEART)
{
currentMenu=MENU_START;
gfx->fillScreen(0);
start_draw_static();
}
else if(currentMenu==MENU_DATA)
{
currentMenu=MENU_HEART;
appMeasureType=0;
resetMeasurement();
needRemoveFinger=false;
gfx->fillScreen(0);
heart_draw_static();
}
else if(currentMenu==MENU_NOTIF)
{
currentMenu=MENU_DATA;
gfx->fillScreen(0);
data_draw_static();
}
}

if(t2 && !lastT2)
{
if(currentMenu==MENU_START)
{
currentMenu=MENU_HEART;
appMeasureType=0;
resetMeasurement();
needRemoveFinger=false;
gfx->fillScreen(0);
heart_draw_static();
}
else if(currentMenu==MENU_HEART)
{
currentMenu=MENU_DATA;
gfx->fillScreen(0);
data_draw_static();
}
else if(currentMenu==MENU_DATA)
{
currentMenu=MENU_NOTIF;
gfx->fillScreen(0);
notif_draw_static();
}
else if(currentMenu==MENU_NOTIF)
{
currentMenu=MENU_START;
gfx->fillScreen(0);
start_draw_static();
}
}

if(t1 && !lastT1)
{
if(currentMenu==MENU_START)
{
currentMenu=MENU_HEART;
appMeasureType=0;
resetMeasurement();
needRemoveFinger=false;
gfx->fillScreen(0);
heart_draw_static();
}
else if(currentMenu==MENU_HEART)
{
appMeasureType=0;
resetMeasurement();
needRemoveFinger=false;
gfx->fillScreen(0);
heart_draw_static();
}
else if(currentMenu==MENU_NOTIF)
{
currentMenu=MENU_START;
gfx->fillScreen(0);
start_draw_static();
}
}
}

lastT0=t0;
lastT1=t1;
lastT2=t2;

// ================= XỬ LÝ LỆNH TỪ APP QUA BLE =================
unsigned long now = millis();

// -1. LỆNH ĐIỀU KHIỂN MÀN HÌNH & CẢM BIẾN TỪ APP (bật/tắt, đổi menu, AOD, Raise-to-Wake)
if (appScreenOn) {
  appScreenOn = false;
  if (screenSleeping || screenDimmed) {
    wakeScreen();
    Serial.println("[BLE] ☀️ Đã bật sáng màn hình đồng hồ!");
  }
  lastTouchTime = millis();
  pendingSleep = false;
}
if (appRaiseWakeTrigger) {
  appRaiseWakeTrigger = false;
  if (raiseToWake && (screenSleeping || screenDimmed)) {
    wakeScreen();
    Serial.println("[BLE] ⌚ Nhấc tay sáng màn hình (kích hoạt từ App/Cảm biến)!");
  }
  lastTouchTime = millis();
  pendingSleep = false;
}
if (appAodCmd != -1) {
  alwaysOnDisplay = (appAodCmd == 1);
  appAodCmd = -1;
  saveDisplaySettings();
  Serial.printf("[BLE] 🔅 Đã cập nhật Màn hình luôn bật (AOD): %s\n", alwaysOnDisplay ? "BẬT" : "TẮT");
  if (alwaysOnDisplay && screenSleeping) {
    // Nếu đang tắt màn mà người dùng bật AOD -> bật sáng màn hình ngay
    wakeScreen();
  } else if (!alwaysOnDisplay && screenDimmed && measureState == WAIT_FINGER) {
    // Nếu đang ở chế độ sáng mờ AOD mà người dùng tắt AOD -> tắt màn hình ngay
    sleepScreen();
  }
}
if (appRaiseCmd != -1) {
  raiseToWake = (appRaiseCmd == 1);
  appRaiseCmd = -1;
  saveDisplaySettings();
  Serial.printf("[BLE] ⌚ Đã cập nhật Nhấc tay sáng màn hình: %s\n", raiseToWake ? "BẬT" : "TẮT");
  if (screenSleeping && sensorOk) {
    if (raiseToWake && !imuOk) {
      particleSensor.wakeUp();
      sensorConfigure();
    } else {
      particleSensor.shutDown();
    }
  }
}
if (appMenuCmd != CMD_NONE) {
  int c = appMenuCmd;
  appMenuCmd = CMD_NONE;
  notifActive = false;
  if (screenSleeping || screenDimmed) wakeScreen();
  if (!editMode) {                                   // không đổi menu khi đang ở chế độ chỉnh
    int target = currentMenu;
    if (c >= 0 && c <= 3) target = c;
    else if (c == CMD_NEXT && currentMenu < MENU_NOTIF) target = currentMenu + 1;
    else if (c == CMD_BACK && currentMenu > MENU_START) target = currentMenu - 1;
    gotoMenu(target);
  }
  lastTouchTime = millis();
  pendingSleep = false;
}
if (appScreenOff) {
  appScreenOff = false;
  notifActive = false;
  if (!screenSleeping && measureState == WAIT_FINGER) {
    sleepScreen();
    pendingSleep = false;
    Serial.println("[BLE] 🌙 Đã tắt màn hình đồng hồ (chế độ ngủ)!");
  }
}

// -0.5. LỆNH CẤU HÌNH & HIỂN THỊ THÔNG BÁO ĐỒNG BỘ TỪ APP
if (appNotifCfgPending) {
  appNotifCfgPending = false;
  notifEnabled   = pendingNotifCfg[0];
  notifCalls     = pendingNotifCfg[1];
  notifSms       = pendingNotifCfg[2];
  notifSedentary = pendingNotifCfg[3];
  notifHealth    = pendingNotifCfg[4];
  saveDisplaySettings();
  Serial.printf("[BLE] 🔔 Đã cập nhật cấu hình thông báo: Bật=%d | Gọi=%d | SMS=%d | Uống nước=%d | Sức khỏe=%d\n",
                notifEnabled, notifCalls, notifSms, notifSedentary, notifHealth);
}
if (appNotifClearPending) {
  appNotifClearPending = false;
  if (notifActive) {
    dismissNotificationPopup();
  }
  Serial.println("[BLE] 🔕 Đã đóng thông báo trên màn hình đồng hồ!");
}
// Không cho phép thông báo tự động bật đè làm ngắt quá trình đang đo nhịp tim / SpO2
if (appNotifPending && measureState == WAIT_FINGER) {
  appNotifPending = false;
  String nType     = pendingNotifType;
  uint16_t nColor  = pendingNotifColor;
  String nTitle    = pendingNotifTitle;
  String nBody     = pendingNotifBody;

  if (isNotifCategoryAllowed(nType)) {
    if (screenSleeping || screenDimmed) {
      wakeScreen();
    }
    bool isHealthResult = (nType.startsWith("HEALTH") || nType.startsWith("HR_") || nType.startsWith("SPO2_"));
    activeNotifDurationMs = isHealthResult ? NOTIF_DURATION_HEALTH_MS : NOTIF_DURATION_DEFAULT_MS;
    hasLastNotif     = true;
    notifActive      = true;
    notifShownMs     = millis();
    lastTouchTime    = millis();
    pendingSleep     = false;
    activeNotifType  = nType;
    activeNotifColor = nColor;
    activeNotifTitle = nTitle;
    activeNotifBody  = nBody;
    activeNotifHH    = HH;
    activeNotifMM    = MIN;
    drawNotificationPopup(activeNotifType, activeNotifTitle, activeNotifBody);
    Serial.printf("[BLE] 🔔 Hiển thị thông báo [%s - %lus - màu 0x%04X] %s: %s\n",
                  nType.c_str(), (unsigned long)(activeNotifDurationMs / 1000), activeNotifColor, nTitle.c_str(), nBody.c_str());
  } else {
    Serial.printf("[BLE] 🔕 Bỏ qua thông báo [%s] (đang tắt danh mục này trên đồng hồ)\n", nType.c_str());
  }
}

// 0. LỆNH BẮT ĐẦU / HỦY ĐO (từ App BLE / Serial)
if (appCancelMeasure) {
  appCancelMeasure = false;
  abortMeasurement("hủy từ App", false);
}
if (appTriggeredMeasure) {
  appTriggeredMeasure = false;
  notifActive = false;

  // 1. Thức màn hình dậy nếu đang ngủ hoặc đang sáng mờ AOD (wakeScreen đã bật lại và cấu hình cảm biến)
  if (screenSleeping || screenDimmed) {
    wakeScreen();
  }

  // 2. Chuyển ngay sang màn hình đo nhịp tim VÀ LUÔN XÓA MÀN HÌNH VẼ LẠI SẠCH SẼ CHO LẦN ĐO MỚI
  currentMenu = MENU_HEART;
  gfx->fillScreen(0);
  heart_draw_static();

  // 3. Lưu kết quả HR dở dang (nếu có) rồi reset và cho phép đo ngay
  flushPartialCycle();
  resetMeasurement();
  needRemoveFinger = false;
  waitingForFinger = true;      // BẬT cờ chờ ngón tay để sensorService() chạy
  currentActivity = (appMeasureType == 2) ? "MEASURING_SPO2" : "MEASURING_HR";
  if (pActivityCharacteristic) {
    pActivityCharacteristic->setValue(currentActivity.c_str());
    pActivityCharacteristic->notify();
  }
  lastTouchTime = millis(); // Reset thời gian chờ ngủ màn hình
  pendingSleep = false;

  Serial.println("\n==================================================");
  Serial.printf("🎯 [LỆNH TỪ APP] ĐÃ NHẬN LỆNH BẮT ĐẦU ĐO (%s)!\n",
                appMeasureType == 1 ? "CHỈ ĐO NHỊP TIM" : (appMeasureType == 2 ? "CHỈ ĐO SPO2" : "ĐO ĐẦY ĐỦ HR + SPO2"));
  Serial.println("👉 Đã chuyển màn hình Heart, cảm biến MAX30102 SẴN SÀNG.");
  Serial.println("👉 Vui lòng đặt ngón tay lên cảm biến...");
  Serial.println("==================================================\n");
}

// 1. Tự động quảng bá lại sóng BLE sau khi App ngắt kết nối
if (!bleConnected && oldDeviceConnected) {
  pServer->startAdvertising();
  Serial.println("[BLE] Đã kích hoạt lại quảng bá sóng BLE, sẵn sàng để App kết nối lại!");
  oldDeviceConnected = bleConnected;
}
if (bleConnected && !oldDeviceConnected) {
  oldDeviceConnected = bleConnected;
}

// 2. Notify BLE tới App (mỗi 1 giây, chỉ gửi khi dữ liệu thay đổi)
if (bleConnected && (now - lastBleNotifyTime >= BLE_NOTIFY_INTERVAL)) {
  lastBleNotifyTime = now;
  bool f = bleForceNotify;
  bleForceNotify = false;
  updateBleTelemetry(f);
}

// 3. Chế độ truyền liên tục (START_STREAM): ép notify đầy đủ mỗi 5 giây
if (isOneShotRequested) {
  isOneShotRequested = false;
  bleForceNotify = true;
} else if (isStreamingRequested && (now - lastStreamTime >= STREAM_INTERVAL)) {
  lastStreamTime = now;
  bleForceNotify = true;
}

// 4. Nhận lệnh test qua Serial Monitor
if (Serial.available() > 0) {
  String cmd = Serial.readStringUntil('\n');
  cmd.trim();
  if (cmd.equalsIgnoreCase("GET") || cmd.equalsIgnoreCase("SYNC") || cmd.equalsIgnoreCase("DATA") ||
      cmd.equalsIgnoreCase("MEASURE") || cmd.equalsIgnoreCase("TRIGGER")) {
    appTriggeredMeasure = true;
    isOneShotRequested = true;
    Serial.println("[Serial Input] Nhận lệnh đo: Kích hoạt quy trình đo trên đồng hồ!");
  } else if (cmd.equalsIgnoreCase("START")) {
    isStreamingRequested = true;
    Serial.println("[Serial Input] Bật chế độ truyền dữ liệu liên tục!");
  } else if (cmd.equalsIgnoreCase("STOP")) {
    isStreamingRequested = false;
    Serial.println("[Serial Input] Dừng truyền dữ liệu liên tục!");
  } else if (cmd.equalsIgnoreCase("TOUCH")) {
    touchDebug = !touchDebug;
    Serial.printf("[Serial Input] In giá trị touch: %s (định dạng: giá_trị/ngưỡng)\n", touchDebug ? "BẬT" : "TẮT");
  } else if (cmd.equalsIgnoreCase("RECAL")) {
    calibrateTouch();
  } else if (cmd.equalsIgnoreCase("AOD")) {
    appAodCmd = alwaysOnDisplay ? 0 : 1;
  } else if (cmd.equalsIgnoreCase("RAISE")) {
    appRaiseCmd = raiseToWake ? 0 : 1;
  } else if (cmd.equalsIgnoreCase("WAKE")) {
    appRaiseWakeTrigger = true;
  } else if (cmd.equalsIgnoreCase("NOTIF")) {
    pendingNotifType  = "WATER";
    pendingNotifTitle = "Nhac uong nuoc";
    pendingNotifBody  = "Da den gio bo sung nuoc cho co the!";
    appNotifPending   = true;
  }
}

// Delay nhỏ để FreeRTOS chạy các tác vụ nền (BLE)
delay(5);
}
