#pragma once

#include <Arduino.h>
#include <Wire.h>
#include <math.h>

// ---------- Biến / hàm đã có sẵn trong file chính (chỉ khai báo lại) ----------
extern bool          imuOk;
extern uint8_t       imuAddr;
extern int           bpm;
extern bool          hasHr;
extern uint32_t      lastMeasureMs;
extern int           currentSteps;
extern bool          stepsValid;
extern String        currentActivity;
extern volatile bool appTriggeredMeasure;
extern bool          waitingForFinger;
bool isWatchMeasuring();
void setActivity(const char *s);

// =====================================================================
// ======================== THAM SỐ THUẬT TOÁN =========================
// =====================================================================
// --- Đúng theo sơ đồ ---
#define ACT_SAMPLE_HZ            50        // tần số lấy mẫu MPU6050 (Hz). Phải chia hết 1000
#define ACT_HPF_ALPHA            0.97f     // y[n] = 0.97 * (y[n-1] + x[n] - x[n-1])
#define ACT_PEAK_THRESHOLD_G     0.55f     // ngưỡng Peak Detection (g)
#define ACT_RUN_CPS              2.0f      // >= 2 steps/s => Chạy, < 2 steps/s => Đi bộ
#define ACT_SLEEP_LOW_MS         300000UL  // Low Activity > 5 phút
#define ACT_SLEEP_HR_BPM         60        // Heart Rate < 60 BPM

// --- Chi tiết bổ sung để thuật toán chạy ổn định trên phần cứng thật ---
#define ACT_MIN_STEP_INTERVAL_MS 250       // 2 đỉnh cách nhau < 250ms thì chỉ tính 1 bước (chống đếm trùng)
#define ACT_CADENCE_WINDOW_S     4         // tính steps/second trên cửa sổ trượt 4 giây
#define ACT_WALK_MIN_STEPS       2         // cần >= 2 bước trong cửa sổ mới coi là đang đi (lọc cử chỉ tay lẻ). Đặt 1 = đúng nguyên bản
#define ACT_RUN_EXIT_CPS         1.75f     // đang Chạy thì chỉ về Đi bộ khi < 1.75 steps/s (chống nhấp nháy). Đặt 2.0 = đúng nguyên bản
#define ACT_SLEEP_LATCH          1         // 1 = đã Ngủ thì chỉ thoát khi có vận động thật (>= ACT_WALK_MIN_STEPS), trở mình 1 cái không làm thoát
#define ACT_HR_FRESH_MS          1800000UL // nhịp tim đo gần nhất chỉ có giá trị trong 30 phút. Đặt 0 = chấp nhận mọi lần đo

// --- Đọc cảm biến ---
#define ACT_POLL_MS              50        // chu kỳ đọc FIFO của MPU6050 (FIFO chứa được ~3.3 giây dữ liệu)
#define ACT_FIFO_MAX_BYTES       1000      // vượt mức này coi như sắp tràn => reset FIFO
#define IMU_LSB_PER_G            16384.0f  // ±2g, giữ nguyên như updateRaiseToWake() đang dùng

// --- Chuỗi gửi cho App qua characteristic Activity ---
#define ACT_STR_REST             "REST"
#define ACT_STR_WALK             "WALK"
#define ACT_STR_RUN              "RUN"
#define ACT_STR_SLEEP            "SLEEP"

#define ACT_DEBUG                0         // 1 = in thông số mỗi giây ra Serial để chỉnh ngưỡng

// =====================================================================
// ============================ TRẠNG THÁI =============================
// =====================================================================
enum ActivityState : uint8_t { ACT_REST = 0, ACT_WALK, ACT_RUN, ACT_SLEEP };

#define ACT_MIN_STEP_SAMPLES   ((ACT_MIN_STEP_INTERVAL_MS * ACT_SAMPLE_HZ) / 1000)
#define ACT_SLEEP_LOW_SAMPLES  ((ACT_SLEEP_LOW_MS / 1000UL) * ACT_SAMPLE_HZ)

static bool          actEnabled     = false;
static ActivityState actState       = ACT_REST;

// Bộ lọc + phát hiện đỉnh
static bool     actFilterReady = false;
static float    actXPrev = 0.0f;      // x[n-1]
static float    actYm1   = 0.0f;      // y[n-1]
static float    actYm2   = 0.0f;      // y[n-2]

// Thời gian tính theo SỐ MẪU cảm biến (chính xác, không phụ thuộc loop() nhanh/chậm)
static uint32_t actSampleIdx   = 0;
static uint32_t actLastStepIdx = 0;   // mẫu của bước gần nhất => Timer Low-Activity = (idx - last) / Hz
static uint8_t  actTickCnt     = 0;

// Số bước theo từng giây trong cửa sổ trượt (Calculate Steps/Second)
static uint8_t  actBuckets[ACT_CADENCE_WINDOW_S] = {0};
static uint8_t  actBucketPos = 0;

// =====================================================================
// ============================ MPU6050 ================================
// =====================================================================
#define MPU_REG_SMPLRT_DIV  0x19
#define MPU_REG_CONFIG      0x1A
#define MPU_REG_ACCEL_CFG   0x1C
#define MPU_REG_FIFO_EN     0x23
#define MPU_REG_USER_CTRL   0x6A
#define MPU_REG_FIFO_CNT_H  0x72
#define MPU_REG_FIFO_RW     0x74

static bool mpuWriteReg(uint8_t reg, uint8_t val)
{
  Wire.beginTransmission(imuAddr);
  Wire.write(reg);
  Wire.write(val);
  return Wire.endTransmission() == 0;
}

static bool mpuResetFifo()
{
  bool ok = true;
  ok &= mpuWriteReg(MPU_REG_USER_CTRL, 0x04);   // FIFO_RESET
  ok &= mpuWriteReg(MPU_REG_USER_CTRL, 0x40);   // FIFO_EN
  return ok;
}

// Trả về số byte đang có trong FIFO, 0xFFFF nếu lỗi I2C
static uint16_t mpuFifoCount()
{
  Wire.beginTransmission(imuAddr);
  Wire.write(MPU_REG_FIFO_CNT_H);
  if (Wire.endTransmission(false) != 0) return 0xFFFF;
  if ((int)Wire.requestFrom((int)imuAddr, 2) != 2) return 0xFFFF;
  uint8_t hi = Wire.read();
  uint8_t lo = Wire.read();
  return ((uint16_t)hi << 8) | lo;
}

// =====================================================================
// ======================= LÕI THUẬT TOÁN ==============================
// =====================================================================
static const char *actStateName(ActivityState s)
{
  switch (s) {
    case ACT_WALK:  return ACT_STR_WALK;
    case ACT_RUN:   return ACT_STR_RUN;
    case ACT_SLEEP: return ACT_STR_SLEEP;
    default:        return ACT_STR_REST;
  }
}

// "Heart Rate < 60 BPM": dùng kết quả đo nhịp tim gần nhất của đồng hồ.
// Đồng hồ chỉ đo HR khi có lệnh/đặt ngón tay, nên chỉ kết luận khi có số đo thật và còn "tươi".
static bool actHrBelowSleepThreshold()
{
  if (!hasHr || bpm <= 0) return false;
#if ACT_HR_FRESH_MS > 0
  if (millis() - lastMeasureMs > ACT_HR_FRESH_MS) return false;
#endif
  return bpm < ACT_SLEEP_HR_BPM;
}

// Gọi mỗi 1 giây (theo thời gian cảm biến): Calculate Steps/Second + phân loại
static void activityEvaluate()
{
  uint16_t windowSteps = 0;
  for (uint8_t i = 0; i < ACT_CADENCE_WINDOW_S; i++) windowSteps += actBuckets[i];
  float stepsPerSec = (float)windowSteps / (float)ACT_CADENCE_WINDOW_S;

  // sang ô (giây) mới
  actBucketPos = (actBucketPos + 1) % ACT_CADENCE_WINDOW_S;
  actBuckets[actBucketPos] = 0;

  uint32_t lowSamples = actSampleIdx - actLastStepIdx;     // Timer Low-Activity (đơn vị: mẫu)
  ActivityState next;

  if (windowSteps >= ACT_WALK_MIN_STEPS)
  {
    // Có bước chân: >= 2 steps/s => Chạy, < 2 steps/s => Đi bộ
    if (stepsPerSec >= ACT_RUN_CPS || (actState == ACT_RUN && stepsPerSec >= ACT_RUN_EXIT_CPS))
      next = ACT_RUN;
    else
      next = ACT_WALK;
  }
  else
  {
    // Không có bước: Low Activity > 5 phút & HR < 60 BPM ? Yes -> Ngủ, No -> Nghỉ
    if (lowSamples >= ACT_SLEEP_LOW_SAMPLES && actHrBelowSleepThreshold())
      next = ACT_SLEEP;
#if ACT_SLEEP_LATCH
    else if (actState == ACT_SLEEP)
      next = ACT_SLEEP;
#endif
    else
      next = ACT_REST;
  }

#if ACT_DEBUG
  Serial.printf("[Activity] cps=%.2f bước/cửa sổ=%u low=%lus HR=%d -> %s\n",
                stepsPerSec, windowSteps,
                (unsigned long)(lowSamples / ACT_SAMPLE_HZ), hasHr ? bpm : 0, actStateName(next));
#endif

  if (next != actState) {
    Serial.printf("[Activity] 🏃 %s -> %s (%.2f bước/giây, tổng %d bước)\n",
                  actStateName(actState), actStateName(next), stepsPerSec, currentSteps);
    actState = next;
  }
}

// Xử lý 1 mẫu gia tốc (đơn vị g)
static void activityProcessSample(float gx, float gy, float gz)
{
  // x[n] = độ lớn vector gia tốc (không phụ thuộc hướng đeo)
  float x = sqrtf(gx * gx + gy * gy + gz * gz);

  if (!actFilterReady) {            // mẫu đầu tiên: nạp x[n-1] để tránh xung khởi động
    actXPrev = x;
    actYm1 = actYm2 = 0.0f;
    actFilterReady = true;
    return;
  }

  // High-pass Filter: y[n] = 0.97 * (y[n-1] + x[n] - x[n-1])
  float y = ACT_HPF_ALPHA * (actYm1 + x - actXPrev);
  actXPrev = x;

  // Peak Detection: y[n-1] là đỉnh cục bộ và vượt ngưỡng 0.55g
  bool isPeak = (actYm1 > ACT_PEAK_THRESHOLD_G) && (actYm1 > actYm2) && (actYm1 >= y);
  actYm2 = actYm1;
  actYm1 = y;

  actSampleIdx++;

  if (isPeak && (actSampleIdx - actLastStepIdx) >= ACT_MIN_STEP_SAMPLES)
  {
    // Yes -> Đếm bước chân (và Timer Low-Activity về 0)
    actLastStepIdx = actSampleIdx;
    if (actBuckets[actBucketPos] < 255) actBuckets[actBucketPos]++;
    currentSteps++;
  }
  // No -> Timer Low-Activity tự tăng: (actSampleIdx - actLastStepIdx) / ACT_SAMPLE_HZ

  // Calculate Steps/Second mỗi giây
  if (++actTickCnt >= ACT_SAMPLE_HZ) {
    actTickCnt = 0;
    activityEvaluate();
  }
}

// Đẩy trạng thái cho App, KHÔNG ghi đè khi đồng hồ đang đo HR/SpO2
// (lúc đó currentActivity đang mang MEASURING_*/PROGRESS_*/DONE_* cho App)
static void activityPublish()
{
  if (isWatchMeasuring() || waitingForFinger || appTriggeredMeasure) return;
  const char *name = actStateName(actState);
  if (currentActivity != name) setActivity(name);
}

// =====================================================================
// ========================== HÀM CÔNG KHAI ============================
// =====================================================================
// Gọi 1 lần trong setup(), SAU initIMU()
void activityInit()
{
  if (!imuOk) {
    Serial.println("[Activity] ℹ️ Không có MPU6050 -> tắt nhận diện hoạt động (Đi bộ/Chạy/Ngủ).");
    return;
  }

  bool ok = true;
  ok &= mpuWriteReg(MPU_REG_CONFIG, 0x03);                                  // DLPF ~44Hz, tốc độ nền 1kHz
  ok &= mpuWriteReg(MPU_REG_SMPLRT_DIV, (uint8_t)((1000 / ACT_SAMPLE_HZ) - 1)); // 1000/(1+19) = 50Hz
  ok &= mpuWriteReg(MPU_REG_ACCEL_CFG, 0x00);                               // ±2g (khớp 16384 LSB/g của Raise-to-Wake)
  ok &= mpuWriteReg(MPU_REG_FIFO_EN, 0x08);                                 // đẩy gia tốc X/Y/Z vào FIFO
  ok &= mpuResetFifo();

  if (!ok) {
    Serial.println("[Activity] ❌ Cấu hình MPU6050 thất bại -> tắt nhận diện hoạt động.");
    return;
  }

  actEnabled = true;
  stepsValid = true;               // bật hiển thị / gửi BLE số bước thật
  Serial.printf("[Activity] ✅ Nhận diện hoạt động đã bật (MPU6050 0x%02X, %dHz, ±2g, FIFO).\n", imuAddr, ACT_SAMPLE_HZ);
}

// Gọi mỗi vòng loop(). Tự giới hạn tần suất đọc I2C bằng ACT_POLL_MS.
void activityUpdate()
{
  if (!actEnabled) return;

  static uint32_t lastPollMs = 0;
  uint32_t nowMs = millis();
  if (nowMs - lastPollMs < ACT_POLL_MS) return;
  lastPollMs = nowMs;

  uint16_t cnt = mpuFifoCount();
  if (cnt == 0xFFFF) return;                       // lỗi I2C tạm thời, thử lại lần sau

  if (cnt > ACT_FIFO_MAX_BYTES) {                  // loop() bị chặn quá lâu => FIFO sắp tràn, byte có thể lệch
    mpuResetFifo();
    Serial.println("[Activity] ⚠️ FIFO MPU6050 đầy, đã reset.");
    return;
  }

  uint16_t samples = cnt / 6;                      // mỗi mẫu = 6 byte (AX,AY,AZ x 2 byte)
  while (samples > 0)
  {
    uint8_t n = (samples > 16) ? 16 : (uint8_t)samples;   // 16 mẫu = 96 byte < bộ đệm I2C 128 byte
    uint8_t nBytes = n * 6;

    Wire.beginTransmission(imuAddr);
    Wire.write(MPU_REG_FIFO_RW);
    if (Wire.endTransmission(false) != 0 || (int)Wire.requestFrom((int)imuAddr, (int)nBytes) != (int)nBytes) {
      mpuResetFifo();                              // đọc dở => bỏ dữ liệu cũ để không lệch byte
      return;
    }

    for (uint8_t i = 0; i < n; i++) {
      uint8_t b[6];
      for (uint8_t k = 0; k < 6; k++) b[k] = Wire.read();
      int16_t ax = (int16_t)(((uint16_t)b[0] << 8) | b[1]);
      int16_t ay = (int16_t)(((uint16_t)b[2] << 8) | b[3]);
      int16_t az = (int16_t)(((uint16_t)b[4] << 8) | b[5]);
      activityProcessSample(ax / IMU_LSB_PER_G, ay / IMU_LSB_PER_G, az / IMU_LSB_PER_G);
    }
    samples -= n;
  }

  activityPublish();
}

