/*
 * ======================================================================================
 * Project: Smart Watch Health Risk Prediction
 * Hardware: Seeed Studio XIAO ESP32-S3 (Dual-core Xtensa LX7, 240MHz, 512KB SRAM, 8MB Flash)
 * Framework: Arduino IDE / ESP-IDF
 * Library: Chirale_TensorFlowLite (hoặc esp-tflite-micro / TensorFlowLite_ESP32)
 * Model: Full-Integer INT8 TinyML MLP (6 inputs -> 16 relu -> 8 relu -> 1 sigmoid)
 * Authors: Smart Watch Project Team
 * ======================================================================================
 */

#include <Arduino.h>

// TensorFlow Lite Micro Headers
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/system_setup.h"
#include "tensorflow/lite/schema/schema_generated.h"

// Model & Normalization Headers (sinh tự động từ pipeline Python)
#include "health_risk_model_int8.h"
#include "quant_params.h"
#include "scaler_params.h"
#include "test_cases.h"

// ======================================================================================
// CẤU HÌNH BỘ NHỚ TENSOR ARENA (SRAM)
// ======================================================================================
// Model int8 chỉ ~3.1KB, bộ nhớ trung gian tính toán (Arena) cần ~3KB - 4KB.
// Khai báo tĩnh (static) để tránh phân mảnh bộ nhớ heap (fragmentation).
constexpr int kTensorArenaSize = 4096;
static uint8_t tensor_arena[kTensorArenaSize] __attribute__((aligned(16)));

// Biến toàn cục TFLite Micro
static const tflite::Model* model = nullptr;
static tflite::MicroInterpreter* interpreter = nullptr;
static TfLiteTensor* input = nullptr;
static TfLiteTensor* output = nullptr;

// ======================================================================================
// HÀM SUY LUẬN ĐÁNH GIÁ RỦI RO SỨC KHỎE (INFERENCE FUNCTION)
// ======================================================================================
/**
 * @brief Dự đoán điểm rủi ro sức khỏe (Risk Score) từ 6 chỉ số thực tế
 * @param hr      Nhịp tim (Heart Rate, BPM)
 * @param spo2    Nồng độ oxy trong máu (Blood Oxygen, %)
 * @param temp    Thân nhiệt cơ thể (Temperature, °C)
 * @param height  Chiều cao người dùng (Height, cm)
 * @param weight  Cân nặng người dùng (Weight, kg)
 * @param bmi     Chỉ số khối cơ thể (BMI, kg/m²)
 * @return float  Chỉ số rủi ro trong khoảng [0.0 (An toàn) đến 1.0 (Nguy cơ cao)]
 */
float predictRisk(float hr, float spo2, float temp, float height, float weight, float bmi) {
  if (interpreter == nullptr || input == nullptr || output == nullptr) {
    Serial.println("[ERROR] TFLite Interpreter chua duoc khoi tao!");
    return -1.0f;
  }

  // 1. Mảng 6 giá trị thô theo đúng thứ tự
  float raw_vitals[6] = {hr, spo2, temp, height, weight, bmi};

  // 2. Chuẩn hóa Z-Score và Lượng tử hóa sang INT8
  // Công thức:
  //   x_norm = (x_raw - SCALER_MEAN) / SCALER_SCALE
  //   q_in   = clamp(round(x_norm / INPUT_SCALE) + INPUT_ZERO_POINT, -128, 127)
  for (int i = 0; i < 6; i++) {
    float x_norm = (raw_vitals[i] - SCALER_MEAN[i]) / SCALER_SCALE[i];
    int32_t q = (int32_t)round(x_norm / INPUT_SCALE) + INPUT_ZERO_POINT;
    if (q < -128) q = -128;
    if (q > 127)  q = 127;
    input->data.int8[i] = (int8_t)q;
  }

  // 3. Thực thi suy luận nơ-ron (Invoke)
  TfLiteStatus invoke_status = interpreter->Invoke();
  if (invoke_status != kTfLiteOk) {
    Serial.println("[ERROR] Suy luan Invoke that bai!");
    return -1.0f;
  }

  // 4. Giải lượng tử hóa kết quả đầu ra (Dequantize output INT8 -> float)
  // Công thức:
  //   risk_score = (q_out - OUTPUT_ZERO_POINT) * OUTPUT_SCALE
  int8_t q_out = output->data.int8[0];
  float risk_score = ((float)q_out - (float)OUTPUT_ZERO_POINT) * OUTPUT_SCALE;

  // Giới hạn trong khoảng chuẩn [0.0, 1.0]
  if (risk_score < 0.0f) risk_score = 0.0f;
  if (risk_score > 1.0f) risk_score = 1.0f;

  return risk_score;
}

// ======================================================================================
// SETUP: KHỞI TẠO TFLITE MICRO & CHẠY 10 TEST CASES ĐỐI CHIẾU VỚI PYTHON
// ======================================================================================
void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 3000) {
    delay(10); // Chờ cổng Serial kết nối trên XIAO ESP32-S3
  }

  Serial.println("\n================================================================================");
  Serial.println("   SEEED STUDIO XIAO ESP32-S3 - TINYML HEALTH RISK INFERENCE (INT8)");
  Serial.println("================================================================================");

  // 1. Tải mô hình từ mảng byte trong Flash
  model = tflite::GetModel(health_risk_model_int8_data);
  if (model->version() != TFLITE_SCHEMA_VERSION) {
    Serial.printf("[ERROR] TFLite Schema Version khong khop! Model: %d, Runtime: %d\n",
                  model->version(), TFLITE_SCHEMA_VERSION);
    return;
  }
  Serial.printf("[INFO] TFLite Model INT8 Size: %d bytes\n", health_risk_model_int8_len);

  // 2. Đăng ký các toán tử (Op Resolver) tối ưu riêng cho mô hình MLP
  // Mô hình gồm: Dense (ReLU) -> Dense (ReLU) -> Dense (Sigmoid)
  // Chỉ đăng ký đúng 2 toán tử: FULLY_CONNECTED và LOGISTIC
  static tflite::MicroMutableOpResolver<2> micro_op_resolver;
  micro_op_resolver.AddFullyConnected();
  micro_op_resolver.AddLogistic();

  // 3. Khởi tạo MicroInterpreter
  static tflite::MicroInterpreter static_interpreter(
      model, micro_op_resolver, tensor_arena, kTensorArenaSize);
  interpreter = &static_interpreter;

  // 4. Phân bổ bộ nhớ tensor trong arena
  TfLiteStatus allocate_status = interpreter->AllocateTensors();
  if (allocate_status != kTfLiteOk) {
    Serial.println("[ERROR] AllocateTensors() that bai! Hay tang kTensorArenaSize.");
    return;
  }

  // Lấy con trỏ Tensor đầu vào và đầu ra
  input = interpreter->input(0);
  output = interpreter->output(0);

  size_t used_arena = interpreter->arena_used_bytes();
  Serial.printf("[INFO] Khoi tao thanh cong! SRAM Arena su dung: %d / %d bytes (Con trong: %d bytes)\n",
                used_arena, kTensorArenaSize, kTensorArenaSize - used_arena);

  // In thông số lượng tử hóa thực tế đọc từ model
  TfLiteQuantization quant_in = input->params;
  TfLiteQuantization quant_out = output->params;
  Serial.printf("[INFO] Input  Quantization: Scale = %.6f, ZeroPoint = %d\n", quant_in.scale, quant_in.zero_point);
  Serial.printf("[INFO] Output Quantization: Scale = %.6f, ZeroPoint = %d\n", quant_out.scale, quant_out.zero_point);

  // 5. Chạy kiểm chứng 10 Test Cases mẫu đối chiếu với Python
  Serial.println("\n--------------------------------------------------------------------------------");
  Serial.println(" KIEM CHUNG 10 TEST CASES TREN BOARD ESP32-S3 SO VOI KET QUA PYTHON:");
  Serial.println("--------------------------------------------------------------------------------");
  Serial.println("No | HR  SpO2 Temp  BMI  | Python Risk | Board Risk | Latency | Status");
  Serial.println("---+---------------------+-------------+------------+---------+---------");

  int passed_count = 0;
  for (int i = 0; i < NUM_TEST_CASES; i++) {
    const TestCase& tc = TEST_CASES[i];

    // Đo thời gian suy luận bằng micro giây (micros)
    uint32_t t_start = micros();
    float board_risk = predictRisk(tc.hr, tc.spo2, tc.temp, tc.height, tc.weight, tc.bmi);
    uint32_t t_latency = micros() - t_start;

    // Sai lệch tuyệt đối so với kết quả mong đợi từ Python
    float diff = fabs(board_risk - tc.expected_risk);
    bool pass = (diff <= 0.02f); // Chấp nhận sai số lượng tử cực nhỏ <= 2%
    if (pass) passed_count++;

    Serial.printf("#%02d| %3.0f %4.1f %4.1f %4.1f |   %6.4f    |   %6.4f   | %4u us | %s\n",
                  i + 1, tc.hr, tc.spo2, tc.temp, tc.bmi,
                  tc.expected_risk, board_risk, t_latency,
                  pass ? "PASSED" : "WARN");
  }

  Serial.println("---+---------------------+-------------+------------+---------+---------");
  Serial.printf("[KET QUA] %d / %d Test Cases dat chuan khop tuyet doi voi Python!\n", passed_count, NUM_TEST_CASES);
  Serial.println("================================================================================\n");
}

// ======================================================================================
// LOOP: SUY LUẬN ĐỊNH KỲ (MÔ PHỎNG / TÍCH HỢP CẢM BIẾN THỰC TẾ)
// ======================================================================================
void loop() {
  // ------------------------------------------------------------------------------------
  // GHI CHÚ TÍCH HỢP CẢM BIẾN THỰC TẾ (MAX30102 + MPU6050):
  // Trong ứng dụng sản phẩm hoàn chỉnh:
  //   1. MAX30102 đọc tín hiệu PPG -> đưa qua mô hình KID-PPG để lấy nhịp tim 'hr_live'
  //   2. MAX30102 đọc SpO2 -> 'spo2_live'
  //   3. Thân nhiệt cài mặc định 36.6°C (do phần cứng đồng hồ không gắn cảm biến nhiệt độ lâm sàng)
  //   4. Chiều cao, cân nặng, BMI lấy từ thông tin hồ sơ người dùng lưu trong Flash/NVS
  // ------------------------------------------------------------------------------------

  // Ví dụ 1: Mô phỏng người dùng ở trạng thái nghỉ ngơi, sức khỏe bình thường (Safe)
  float demo_hr = 72.0f;
  float demo_spo2 = 98.5f;
  float demo_temp = 36.6f;
  float demo_height = 172.0f;
  float demo_weight = 65.0f;
  float demo_bmi = demo_weight / ((demo_height / 100.0f) * (demo_height / 100.0f));

  uint32_t t_start = micros();
  float risk = predictRisk(demo_hr, demo_spo2, demo_temp, demo_height, demo_weight, demo_bmi);
  uint32_t latency = micros() - t_start;

  Serial.println("[REAL-TIME HEALTH MONITORING]");
  Serial.printf("  -> Chi so sinh ly : HR = %.0f BPM | SpO2 = %.1f%% | Temp = %.1f C | BMI = %.2f\n",
                demo_hr, demo_spo2, demo_temp, demo_bmi);
  Serial.printf("  -> Risk Score     : %.4f (Muc do: %s)\n",
                risk, (risk >= 0.5f) ? "CANH BAO RUI RO / NGUY CO CAO" : "BINH THUONG / AN TOAN");
  Serial.printf("  -> Thoi gian tinh : %u microseconds (%.2f ms)\n\n", latency, latency / 1000.0f);

  delay(4000); // Lặp lại sau mỗi 4 giây
}
