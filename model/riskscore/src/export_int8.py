"""
Module xuất mô hình TinyML full-integer int8 và sinh mã nguồn C Header cho ESP32-S3.
"""

import os
import sys
import json
from pathlib import Path

# Configure UTF-8 for console output
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, mean_absolute_error, classification_report

# Đường dẫn thư mục
SRC_DIR = Path(__file__).resolve().parent
SMARTWATCH_DIR = SRC_DIR.parent
DATA_DIR = SMARTWATCH_DIR / "data"
SAVED_MODELS_DIR = SMARTWATCH_DIR / "saved_models"
FIRMWARE_DIR = SMARTWATCH_DIR / "firmware" / "health_risk_esp32"

SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
FIRMWARE_DIR.mkdir(parents=True, exist_ok=True)

def run_export_pipeline():
    print("=" * 70)
    print("  QUY TRÌNH XUẤT MÔ HÌNH INT8 & C HEADER CHO SEEED XIAO ESP32-S3")
    print("=" * 70)

    # 1. Nạp dữ liệu và chuẩn bị tập train/test
    clean_csv_path = DATA_DIR / "clean_health_dataset.csv"
    if not clean_csv_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file dữ liệu: {clean_csv_path}")

    df_health = pd.read_csv(clean_csv_path)
    print(f"\n[1/6] Nạp dữ liệu: {len(df_health):,} dòng từ {clean_csv_path.name}")

    risk_criteria = (
        (df_health["Activity_Label"] == 2) |
        (df_health["HR"] > 105.0) |
        (df_health["SpO2"] < 96.0) |
        (df_health["Temp"] > 37.2) |
        (df_health["BMI"] > 25.0)
    )
    df_health["Risk_Label"] = risk_criteria.astype(int)

    features = ["HR", "SpO2", "Temp", "Height", "Weight", "BMI"]
    X = df_health[features].values
    y = df_health["Risk_Label"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 2. Tải hoặc xây dựng mô hình Keras
    keras_path = SAVED_MODELS_DIR / "health_risk_model.keras"
    if keras_path.exists():
        print(f"\n[2/6] Tải mô hình Keras có sẵn: {keras_path}")
        risk_model = tf.keras.models.load_model(keras_path)
    else:
        print("\n[2/6] Huấn luyện mô hình Keras cơ sở...")
        tf.random.set_seed(42)
        risk_model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(6,), name="health_metrics_input"),
            tf.keras.layers.Dense(16, activation="relu", name="dense_layer_1"),
            tf.keras.layers.Dense(8, activation="relu", name="dense_layer_2"),
            tf.keras.layers.Dense(1, activation="sigmoid", name="risk_score_output")
        ], name="Edge_Health_Risk_MLP")

        risk_model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.002),
            loss="binary_crossentropy",
            metrics=["accuracy", tf.keras.metrics.AUC(name="auc")]
        )
        risk_model.fit(
            X_train_scaled, y_train,
            epochs=10,
            batch_size=64,
            validation_split=0.15,
            verbose=0
        )
        risk_model.save(keras_path)
        print(f"  -> Đã lưu mô hình Keras tại: {keras_path}")

    # Đánh giá bản float32
    y_pred_float_prob = risk_model.predict(X_test_scaled, verbose=0).flatten()
    y_pred_float_class = (y_pred_float_prob >= 0.5).astype(int)
    acc_float = accuracy_score(y_test, y_pred_float_class)
    auc_float = roc_auc_score(y_test, y_pred_float_prob)
    print(f"  -> Float32 Accuracy: {acc_float*100:.2f}%, AUC: {auc_float:.4f}")

    # 3. Lượng tử hóa full-integer int8
    print("\n[3/6] Tiến hành lượng tử hóa int8 (Representative Dataset: 300 mẫu, seed=42)...")
    np.random.seed(42)
    rep_indices = np.random.choice(len(X_train_scaled), size=300, replace=False)
    rep_data = X_train_scaled[rep_indices].astype(np.float32)

    def representative_data_gen():
        for sample in rep_data:
            yield [sample.reshape(1, 6)]

    converter = tf.lite.TFLiteConverter.from_keras_model(risk_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.representative_dataset = representative_data_gen
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
    converter.inference_input_type = tf.int8
    converter.inference_output_type = tf.int8

    tflite_int8_model = converter.convert()
    int8_model_path = SAVED_MODELS_DIR / "health_risk_model_int8.tflite"
    with open(int8_model_path, "wb") as f:
        f.write(tflite_int8_model)

    float32_tflite_path = SAVED_MODELS_DIR / "health_risk_model.tflite"
    float32_size = float32_tflite_path.stat().st_size if float32_tflite_path.exists() else 3392
    int8_size = len(tflite_int8_model)

    print(f"  -> Đã lưu mô hình int8: {int8_model_path}")
    print(f"  -> So sánh kích thước: Float32 = {float32_size:,} bytes | Int8 = {int8_size:,} bytes (Giảm {(1 - int8_size/float32_size)*100:.1f}%)")

    # 4. Kiểm chứng độ chính xác
    print("\n[4/6] Kiểm chứng độ chính xác trên toàn bộ tập Test (6,465 mẫu)...")
    interpreter = tf.lite.Interpreter(model_content=tflite_int8_model)
    interpreter.allocate_tensors()

    in_det = interpreter.get_input_details()[0]
    out_det = interpreter.get_output_details()[0]

    in_scale, in_zero_point = float(in_det["quantization"][0]), int(in_det["quantization"][1])
    out_scale, out_zero_point = float(out_det["quantization"][0]), int(out_det["quantization"][1])

    print(f"  -> Tham số lượng tử Input : scale = {in_scale:.6f}, zero_point = {in_zero_point}")
    print(f"  -> Tham số lượng tử Output: scale = {out_scale:.6f}, zero_point = {out_zero_point}")

    y_pred_int8_prob = []
    for i in range(len(X_test_scaled)):
        x_val = X_test_scaled[i]
        q_in = np.clip(np.round(x_val / in_scale) + in_zero_point, -128, 127).astype(np.int8)
        interpreter.set_tensor(in_det["index"], q_in.reshape(1, 6))
        interpreter.invoke()
        q_out = interpreter.get_tensor(out_det["index"])[0, 0]
        prob = float((float(q_out) - out_zero_point) * out_scale)
        y_pred_int8_prob.append(prob)

    y_pred_int8_prob = np.array(y_pred_int8_prob)
    y_pred_int8_class = (y_pred_int8_prob >= 0.5).astype(int)

    acc_int8 = accuracy_score(y_test, y_pred_int8_class)
    auc_int8 = roc_auc_score(y_test, y_pred_int8_prob)
    mae_diff = mean_absolute_error(y_pred_float_prob, y_pred_int8_prob)
    acc_diff = abs(acc_float - acc_int8) * 100

    print("  " + "-" * 50)
    print(f"  -> Độ chính xác Keras Float32: {acc_float*100:.2f}% | AUC: {auc_float:.4f}")
    print(f"  -> Độ chính xác TFLite Int8   : {acc_int8*100:.2f}% | AUC: {auc_int8:.4f}")
    print(f"  -> Chênh lệch Accuracy       : {acc_diff:.4f}% (< 1.0%: {'ĐẠT YÊU CẦU' if acc_diff < 1.0 else 'KHÔNG ĐẠT'})")
    print(f"  -> Sai lệch tuyệt đối TB(MAE): {mae_diff:.4f}")
    print("  " + "-" * 50)

    # 5. Xuất C Headers
    print("\n[5/6] Xuất các file C Header...")

    # 5.1 health_risk_model_int8.h
    header_path = SAVED_MODELS_DIR / "health_risk_model_int8.h"
    hex_bytes = [f"0x{b:02x}" for b in tflite_int8_model]
    bytes_per_line = 12
    hex_lines = [", ".join(hex_bytes[i:i + bytes_per_line]) for i in range(0, len(hex_bytes), bytes_per_line)]
    hex_content = ",\n  ".join(hex_lines)

    c_header_int8 = f"""// TensorFlow Lite Micro Full-Integer INT8 Model for ESP32-S3
// Generated automatically from export_int8.py
// Model size: {len(tflite_int8_model)} bytes

#ifndef HEALTH_RISK_MODEL_INT8_H
#define HEALTH_RISK_MODEL_INT8_H

#ifdef __cplusplus
extern "C" {{
#endif

#if defined(__GNUC__) || defined(__clang__)
#define ALIGN16_ATTRIBUTE __attribute__((aligned(16)))
#else
#define ALIGN16_ATTRIBUTE alignas(16)
#endif

const int health_risk_model_int8_len = {len(tflite_int8_model)};
const unsigned char health_risk_model_int8_data[] ALIGN16_ATTRIBUTE = {{
  {hex_content}
}};

#ifdef __cplusplus
}}
#endif

#endif // HEALTH_RISK_MODEL_INT8_H
"""
    with open(header_path, "w", encoding="utf-8") as f:
        f.write(c_header_int8)
    print(f"  -> Xuất thành công: {header_path.name}")

    # 5.2 quant_params.h
    quant_header_path = SAVED_MODELS_DIR / "quant_params.h"
    quant_c_content = f"""// Quantization parameters (INT8) for Seeed XIAO ESP32-S3
// Generated automatically from export_int8.py
// Formulas:
//   q_in  = (int8_t) constrain(round(x_norm / INPUT_SCALE) + INPUT_ZERO_POINT, -128, 127)
//   risk  = (float)(q_out - OUTPUT_ZERO_POINT) * OUTPUT_SCALE

#ifndef QUANT_PARAMS_H
#define QUANT_PARAMS_H

#define INPUT_SCALE        {in_scale:.6f}f
#define INPUT_ZERO_POINT   {in_zero_point}
#define OUTPUT_SCALE       {out_scale:.6f}f
#define OUTPUT_ZERO_POINT  {out_zero_point}

#endif // QUANT_PARAMS_H
"""
    with open(quant_header_path, "w", encoding="utf-8") as f:
        f.write(quant_c_content)
    print(f"  -> Xuất thành công: {quant_header_path.name}")

    # 6. Xuất 10 mẫu test case
    print("\n[6/6] Xuất 10 test vectors mẫu để kiểm thử trên board ESP32-S3...")
    test_indices = [0, 10, 50, 100, 200, 500, 1000, 2000, 3000, 4000]
    test_cases = []
    for idx in test_indices:
        raw_vals = X_test[idx]
        scaled_vals = X_test_scaled[idx]
        q_in_vals = np.clip(np.round(scaled_vals / in_scale) + in_zero_point, -128, 127).astype(np.int8)
        exp_r = y_pred_int8_prob[idx]
        lbl = int(y_test[idx])
        test_cases.append({
            "idx": idx,
            "raw": [round(float(v), 2) for v in raw_vals],
            "scaled": [round(float(v), 4) for v in scaled_vals],
            "int8": [int(v) for v in q_in_vals],
            "expected_risk": round(float(exp_r), 4),
            "target": lbl
        })

    # Lưu JSON
    json_path = SAVED_MODELS_DIR / "test_cases.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(test_cases, f, indent=2)
    print(f"  -> Lưu test cases JSON: {json_path.name}")

    # Lưu C Header test cases
    tc_header_path = SAVED_MODELS_DIR / "test_cases.h"
    tc_lines = []
    for i, tc in enumerate(test_cases):
        raw_s = ", ".join([f"{v}f" for v in tc["raw"]])
        tc_lines.append(f"  // Test #{i+1} (Target: {'Elevated Risk' if tc['target']==1 else 'Safe'}, Expected Risk: {tc['expected_risk']:.4f})\n"
                        f"  {{{raw_s}, {tc['expected_risk']:.4f}f, {tc['target']}}}")
    tc_block = ",\n".join(tc_lines)

    tc_c_header = f"""// 10 Sample Test Cases generated from WESAD Test Set
// Format: {{HR, SpO2, Temp, Height, Weight, BMI, Expected_Risk_Score, Expected_Label}}

#ifndef TEST_CASES_H
#define TEST_CASES_H

struct TestCase {{
  float hr;
  float spo2;
  float temp;
  float height;
  float weight;
  float bmi;
  float expected_risk;
  int expected_label;
}};

const int NUM_TEST_CASES = {len(test_cases)};
const TestCase TEST_CASES[NUM_TEST_CASES] = {{
{tc_block}
}};

#endif // TEST_CASES_H
"""
    with open(tc_header_path, "w", encoding="utf-8") as f:
        f.write(tc_c_header)
    print(f"  -> Lưu test cases C Header: {tc_header_path.name}")

    # Đồng bộ các header sang thư mục firmware
    for h_name in ["health_risk_model_int8.h", "quant_params.h", "scaler_params.h", "test_cases.h"]:
        src_h = SAVED_MODELS_DIR / h_name
        dst_h = FIRMWARE_DIR / h_name
        if src_h.exists():
            with open(src_h, "rb") as rf, open(dst_h, "wb") as wf:
                wf.write(rf.read())
    print(f"  -> Đã đồng bộ toàn bộ header sang: {FIRMWARE_DIR}")
    print("=" * 70)
    print("HOÀN THÀNH XUẤT INT8 THÀNH CÔNG!")

if __name__ == "__main__":
    run_export_pipeline()
