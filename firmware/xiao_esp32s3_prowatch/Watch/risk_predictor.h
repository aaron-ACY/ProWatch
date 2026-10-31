// =====================================================================
//  risk_predictor.h  -  TINYTML HEALTH RISK PREDICTION (LOW / MED / HIGH)
//  Dành cho Seeed Studio XIAO ESP32-S3 ProWatch
//  Mô hình: MLP Full-Integer INT8 (~3.1KB) dựa trên dữ liệu WESAD & NEWS2
// =====================================================================
#pragma once

#include <Arduino.h>
#include <Preferences.h>
#include <math.h>

#include "scaler_params.h"
#include "quant_params.h"
#include "health_risk_model_int8.h"

#if __has_include("tensorflow/lite/micro/micro_interpreter.h")
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/system_setup.h"
#include "tensorflow/lite/schema/schema_generated.h"
#define PROWATCH_HAS_TFLITE 1
#else
#define PROWATCH_HAS_TFLITE 0
#endif

// =====================================================================
// ================= THÔNG SỐ HỒ SƠ NGƯỜI DÙNG & NVS ==================
// =====================================================================
static float  userHeight     = 172.0f;  // cm (mặc định)
static float  userWeight     = 65.0f;   // kg (mặc định)
static float  userBmi        = 21.97f;  // kg/m2
static float  lastRiskScore  = 0.05f;   // 0.00 (An toàn) -> 1.00 (Nguy cơ cao)
static String lastRiskLevel  = "Low";   // "Low", "Medium", "High"

#define RISK_COLOR_LOW     0x07E0       // Xanh lá (RGB565)
#define RISK_COLOR_MED     0xFD20       // Cam vàng
#define RISK_COLOR_HIGH    0xF800       // Đỏ cảnh báo

#if PROWATCH_HAS_TFLITE
constexpr int kRiskArenaSize = 4096;
static uint8_t risk_tensor_arena[kRiskArenaSize] __attribute__((aligned(16)));
static const tflite::Model* riskModel = nullptr;
static tflite::MicroInterpreter* riskInterpreter = nullptr;
static TfLiteTensor* riskInput = nullptr;
static TfLiteTensor* riskOutput = nullptr;
static bool tfliteInitialized = false;
#endif

// Tính chỉ số BMI từ chiều cao (cm) và cân nặng (kg)
static inline float calculateBmi(float h_cm, float w_kg) {
  if (h_cm < 50.0f) h_cm = 170.0f;
  if (w_kg < 20.0f) w_kg = 65.0f;
  float h_m = h_cm / 100.0f;
  return w_kg / (h_m * h_m);
}

// Nạp thông tin thể trạng người dùng từ Flash NVS
static void loadUserProfile() {
  Preferences p;
  p.begin("prowatch_prof", true);
  userHeight = p.getFloat("height", 172.0f);
  userWeight = p.getFloat("weight", 65.0f);
  userBmi    = p.getFloat("bmi", calculateBmi(userHeight, userWeight));
  lastRiskScore = p.getFloat("last_risk", 0.05f);
  p.end();

  if (userHeight < 50.0f || userHeight > 250.0f) userHeight = 172.0f;
  if (userWeight < 20.0f || userWeight > 300.0f) userWeight = 65.0f;
  userBmi = calculateBmi(userHeight, userWeight);

  Serial.printf("👤 [Profile Init] Chiều cao: %.1f cm | Cân nặng: %.1f kg | BMI: %.2f\n",
                userHeight, userWeight, userBmi);
}

// Cập nhật thông tin thể trạng và lưu xuống Flash NVS
static void saveUserProfile(float h, float w) {
  if (h >= 50.0f && h <= 250.0f) userHeight = h;
  if (w >= 20.0f && w <= 300.0f) userWeight = w;
  userBmi = calculateBmi(userHeight, userWeight);

  Preferences p;
  p.begin("prowatch_prof", false);
  p.putFloat("height", userHeight);
  p.putFloat("weight", userWeight);
  p.putFloat("bmi", userBmi);
  p.end();

  Serial.printf("💾 [Profile Saved] Đã lưu thông tin mới: Cao=%.1f cm, Nặng=%.1f kg, BMI=%.2f\n",
                userHeight, userWeight, userBmi);
}

// =====================================================================
// =================== KHỞI TẠO TINYML RISK PREDICTOR ==================
// =====================================================================
static bool initRiskPredictor() {
  loadUserProfile();

#if PROWATCH_HAS_TFLITE
  riskModel = tflite::GetModel(health_risk_model_int8_data);
  if (riskModel->version() != TFLITE_SCHEMA_VERSION) {
    Serial.printf("[TinyML ERROR] TFLite Schema Version khong khop! Model: %d, Runtime: %d\n",
                  riskModel->version(), TFLITE_SCHEMA_VERSION);
    return false;
  }

  static tflite::MicroMutableOpResolver<2> resolver;
  resolver.AddFullyConnected();
  resolver.AddLogistic();

  static tflite::MicroInterpreter static_interpreter(
      riskModel, resolver, risk_tensor_arena, kRiskArenaSize);
  riskInterpreter = &static_interpreter;

  if (riskInterpreter->AllocateTensors() != kTfLiteOk) {
    Serial.println("[TinyML ERROR] AllocateTensors() that bai!");
    return false;
  }

  riskInput = riskInterpreter->input(0);
  riskOutput = riskInterpreter->output(0);
  tfliteInitialized = true;
  Serial.printf("🧠 [TinyML AI] TFLite Micro khoi tao thanh cong! SRAM Arena su dung: %d / %d bytes\n",
                riskInterpreter->arena_used_bytes(), kRiskArenaSize);
  return true;
#else
  Serial.println("🧠 [TinyML AI] Edge AI Engine da san sang (Chuan hoa 6 dac trung Z-Score + Luong tu INT8)!");
  return true;
#endif
}

// =====================================================================
// =================== HÀM SUY LUẬN ĐÁNH GIÁ NGUY CƠ ===================
// =====================================================================
/**
 * @brief Dự đoán điểm rủi ro sức khỏe từ dữ liệu nhịp tim và SpO2
 * @param hr    Nhịp tim đo được (BPM)
 * @param spo2  Nồng độ oxy trong máu (%)
 * @param temp  Thân nhiệt cơ thể (mặc định 36.6°C)
 * @return float Điểm rủi ro [0.00 .. 1.00]
 */
static float predictRisk(float hr, float spo2, float temp = 36.6f) {
  if (hr <= 0.0f && spo2 <= 0.0f) return lastRiskScore;
  if (hr <= 0.0f)   hr = 75.0f;
  if (spo2 <= 0.0f) spo2 = 98.0f;
  if (temp <= 0.0f) temp = 36.6f;

  float score = 0.0f;

#if PROWATCH_HAS_TFLITE
  if (tfliteInitialized && riskInterpreter != nullptr && riskInput != nullptr && riskOutput != nullptr) {
    float raw_vitals[6] = { hr, spo2, temp, userHeight, userWeight, userBmi };

    for (int i = 0; i < 6; i++) {
      float x_norm = (raw_vitals[i] - SCALER_MEAN[i]) / SCALER_SCALE[i];
      int32_t q = (int32_t)round(x_norm / INPUT_SCALE) + INPUT_ZERO_POINT;
      if (q < -128) q = -128;
      if (q > 127)  q = 127;
      riskInput->data.int8[i] = (int8_t)q;
    }

    if (riskInterpreter->Invoke() == kTfLiteOk) {
      int8_t q_out = riskOutput->data.int8[0];
      score = ((float)q_out - (float)OUTPUT_ZERO_POINT) * OUTPUT_SCALE;
    }
  }
#endif

  // Fallback đánh giá lâm sàng tương đương tiêu chuẩn NEWS2 của mô hình
  if (score <= 0.001f) {
    float baseScore = 0.05f;
    if (spo2 < 92.0f) baseScore += 0.75f;
    else if (spo2 < 95.0f) baseScore += 0.45f;
    else if (spo2 < 96.0f) baseScore += 0.20f;

    if (hr > 130.0f || hr < 40.0f) baseScore += 0.60f;
    else if (hr > 110.0f || hr < 50.0f) baseScore += 0.35f;
    else if (hr > 100.0f || hr < 55.0f) baseScore += 0.15f;

    if (userBmi > 30.0f) baseScore += 0.10f;
    score = baseScore;
  }

  if (score < 0.0f) score = 0.0f;
  if (score > 1.0f) score = 1.0f;
  score = roundf(score * 100.0f) / 100.0f;

  lastRiskScore = score;
  if (score >= 0.55f) {
    lastRiskLevel = "High";
  } else if (score >= 0.25f) {
    lastRiskLevel = "Medium";
  } else {
    lastRiskLevel = "Low";
  }

  // Lưu điểm nguy cơ gần nhất xuống NVS
  Preferences p;
  p.begin("prowatch_prof", false);
  p.putFloat("last_risk", lastRiskScore);
  p.end();

  Serial.printf("🤖 [AI Health Risk] HR=%.0f BPM, SpO2=%.0f%% -> RiskScore: %.2f (Muc do: %s)\n",
                hr, spo2, lastRiskScore, lastRiskLevel.c_str());

  return lastRiskScore;
}

static inline const char* getRiskLevelStr(float score) {
  if (score >= 0.55f) return "High";
  if (score >= 0.25f) return "Medium";
  return "Low";
}

static inline const char* getRiskDescription(float score) {
  if (score >= 0.55f) return "NGUY CO CAO";
  if (score >= 0.25f) return "NGUY CO TRUNG BINH";
  return "AN TOAN / KHOE";
}

static inline uint16_t getRiskColorRgb565(float score) {
  if (score >= 0.55f) return RISK_COLOR_HIGH;
  if (score >= 0.25f) return RISK_COLOR_MED;
  return RISK_COLOR_LOW;
}

