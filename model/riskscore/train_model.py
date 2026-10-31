#!/usr/bin/env python3
"""
train_model.py - Script huấn luyện mô hình TinyML Neural Network (MLP)
phân loại mức độ rủi ro sức khỏe từ dữ liệu cảm biến Smart Watch.
Hỗ trợ 3 chiến lược dữ liệu:
  - HYBRID (Khuyên dùng): Gộp Dataset chuẩn y khoa (32k mẫu) + Dữ liệu cảm biến Supabase Cloud đo thực tế từ đồng hồ XIAO ESP32-S3.
  - LOCAL: Chỉ dùng Dataset chuẩn (clean_health_dataset.csv).
  - SUPABASE: Chỉ dùng dữ liệu cảm biến Supabase Cloud.
"""

import os
import sys
import json
import time
import pickle
import argparse
from pathlib import Path

# Cấu hình UTF-8 cho console trên Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Tắt log cảnh báo thừa từ TensorFlow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from sklearn.utils.class_weight import compute_class_weight

# Định nghĩa các đặc trưng và lớp nhãn chuẩn của hệ thống
FEATURE_COLUMNS = ["heart_rate", "spo2", "bmi", "weight", "height", "temp"]
CLASS_NAMES = ["Low", "Medium", "High"]
LABEL_MAPPING = {"Low": 0, "Medium": 1, "High": 2}

def build_tiny_mlp(input_dim: int = 6, num_classes: int = 3) -> tf.keras.Model:
    """Khởi tạo kiến trúc mạng nơ-ron TinyML MLP siêu nhẹ (275 tham số) tối ưu cho ESP32-S3."""
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(input_dim,), name="vital_signs_input"),
        tf.keras.layers.Dense(16, activation="relu", name="dense_layer_1"),
        tf.keras.layers.Dense(8, activation="relu", name="dense_layer_2"),
        tf.keras.layers.Dense(num_classes, activation="softmax", name="risk_classification_output")
    ], name="SmartWatch_TinyML_HealthRisk_MLP")
    return model

def fetch_supabase_health_records(limit: int = 500) -> pd.DataFrame:
    """Truy vấn dữ liệu cảm biến thực tế từ Supabase Cloud và tự động gán nhãn y khoa chuẩn NEWS2."""
    import urllib.request
    url = f"https://hyyrkyuarclrpwlpssvc.supabase.co/rest/v1/health_records?select=*&order=recorded_at.desc&limit={limit}"
    key = "sb_publishable_dh3CRgbceJNQw7sC95adzQ_MfV3MOFk"
    try:
        req = urllib.request.Request(url, headers={"apikey": key, "Authorization": f"Bearer {key}"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            records = json.loads(resp.read().decode("utf-8"))
        if not records:
            return pd.DataFrame()
        df_raw = pd.DataFrame(records)
        mask = df_raw["heart_rate"].notna() | df_raw["spo2"].notna()
        df_clean = df_raw[mask].copy()
        if len(df_clean) == 0:
            return pd.DataFrame()

        med_hr = float(df_clean["heart_rate"].median()) if df_clean["heart_rate"].notna().any() else 75.0
        med_spo2 = float(df_clean["spo2"].median()) if df_clean["spo2"].notna().any() else 98.0
        df_clean["heart_rate"] = df_clean["heart_rate"].fillna(med_hr).astype(float)
        df_clean["spo2"] = df_clean["spo2"].fillna(med_spo2).astype(float)
        df_clean["temp"] = 36.8
        df_clean["height"] = 170.0
        df_clean["weight"] = 65.0
        df_clean["bmi"] = 22.5

        try:
            # Gán nhãn y khoa theo tiêu chuẩn NEWS2 và WHO BMI
            base_dir = Path(__file__).resolve().parent
            if str(base_dir) not in sys.path:
                sys.path.insert(0, str(base_dir))
            from src.label_risk import label
            df_labeled = label(df_clean[["heart_rate", "spo2", "temp", "height", "weight", "bmi"]])
            return df_labeled[FEATURE_COLUMNS + ["risk_level"]].copy()
        except Exception as e:
            # Fallback logic NEWS2
            def score_row(row):
                hr = row["heart_rate"]
                sp = row["spo2"]
                p_hr = 3 if hr <= 40 or hr >= 131 else (2 if hr >= 111 else (1 if hr <= 50 or hr >= 91 else 0))
                p_sp = 0 if sp >= 96 else (1 if sp >= 94 else (2 if sp >= 92 else 3))
                tot = p_hr + p_sp
                if tot >= 5 or p_hr == 3 or p_sp == 3:
                    return "High" if tot >= 7 else "Medium"
                return "Low"
            df_clean["risk_level"] = df_clean.apply(score_row, axis=1)
            return df_clean[FEATURE_COLUMNS + ["risk_level"]].copy()
    except Exception as e:
        print(f"  [Cảnh báo Supabase] Không thể nạp dữ liệu từ Cloud ({e}), bỏ qua phần Supabase.")
        return pd.DataFrame()

def run_training_pipeline(
    data_path: str,
    artifacts_dir: str,
    epochs: int = 20,
    batch_size: int = 32,
    random_state: int = 42,
    data_mode: str = "hybrid"
):
    print("=" * 70)
    print("  BẮT ĐẦU QUY TRÌNH TỰ ĐỘNG HUẤN LUYỆN MODEL HEALTH RISK (TINYML MLP)")
    print(f"  CHIẾN LƯỢC DỮ LIỆU: {data_mode.upper()}")
    print("=" * 70)

    data_file = Path(data_path).resolve()
    out_dir = Path(artifacts_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    if not data_file.exists():
        raise FileNotFoundError(f"Không tìm thấy file dữ liệu: {data_file}")

    # 1. Đọc dữ liệu
    print(f"\n[Bước 1/5] Đang nạp dữ liệu (Chế độ: {data_mode.upper()})...")
    df_baseline = pd.read_csv(data_file)
    for col in FEATURE_COLUMNS:
        df_baseline[col] = pd.to_numeric(df_baseline[col], errors="coerce")
    df_baseline["risk_level"] = df_baseline["risk_level"].astype(str).str.strip()
    df_baseline = df_baseline.dropna(subset=FEATURE_COLUMNS + ["risk_level"]).copy()
    print(f"  -> Dữ liệu Baseline chuẩn y khoa: {len(df_baseline):,} dòng")

    supabase_count = 0
    if data_mode.lower() in ["hybrid", "supabase"]:
        print("  -> Đang truy vấn dữ liệu cảm biến thời gian thực từ Supabase Cloud...")
        df_cloud = fetch_supabase_health_records(limit=500)
        supabase_count = len(df_cloud)
        if supabase_count > 0:
            print(f"  -> Nạp thành công {supabase_count} bản ghi cảm biến đồng hồ (Gán nhãn NEWS2 tự động)!")
            if data_mode.lower() == "hybrid":
                df = pd.concat([df_baseline, df_cloud], ignore_index=True)
                print(f"  -> [HYBRID MERGE] Đã gộp: {len(df_baseline):,} mẫu chuẩn + {supabase_count} mẫu Supabase = {len(df):,} mẫu tổng!")
            else:
                df = df_cloud
                print(f"  -> Sử dụng 100% dữ liệu Supabase: {len(df):,} mẫu.")
        else:
            print("  -> Không có bản ghi Supabase khả dụng, tự động dùng Baseline Dataset làm fallback.")
            df = df_baseline
    else:
        df = df_baseline
        print(f"  -> Sử dụng 100% Dataset chuẩn: {len(df):,} mẫu.")

    # 2. Chuẩn bị đặc trưng và nhãn
    print("\n[Bước 2/5] Chuẩn bị ma trận đặc trưng X và vector nhãn y...")
    X = df[FEATURE_COLUMNS].values
    
    label_mapping = LABEL_MAPPING
    y = df["risk_level"].map(label_mapping).values
    
    label_encoder = LabelEncoder()
    label_encoder.classes_ = np.array(CLASS_NAMES)
    print(f"  -> Ánh xạ nhãn: {label_mapping}")

    # Phân chia Train (64%), Val (16%), Test (20%) có phân tầng (stratified)
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.20, random_state=random_state, stratify=y_train_val
    )
    print(f"  -> Train: {len(X_train):,} mẫu | Val: {len(X_val):,} mẫu | Test: {len(X_test):,} mẫu")

    # Chuẩn hóa StandardScaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # 3. Tính trọng số cân bằng lớp (class_weight)
    classes_present = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes_present, y=y_train)
    class_weights_dict = {int(cls): float(w) for cls, w in zip(classes_present, weights)}
    for idx in range(len(CLASS_NAMES)):
        if idx not in class_weights_dict:
            class_weights_dict[idx] = 1.0

    # 4. Xây dựng và huấn luyện mô hình
    print("\n[Bước 3/5] Khởi tạo mô hình TinyML MLP...")
    np.random.seed(random_state)
    tf.random.set_seed(random_state)
    model = build_tiny_mlp(input_dim=len(FEATURE_COLUMNS), num_classes=len(CLASS_NAMES))
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.002),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    print(f"  -> Tổng số tham số mô hình: {model.count_params():,} trọng số (~1.1 KB)")

    print(f"\n[Bước 4/5] Đang huấn luyện (Tối đa {epochs} epochs, Batch size {batch_size})...")
    callbacks = [
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True, verbose=0),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=3, min_lr=1e-5, verbose=0)
    ]

    history = model.fit(
        X_train_scaled, y_train,
        epochs=epochs,
        batch_size=batch_size,
        validation_data=(X_val_scaled, y_val),
        class_weight=class_weights_dict,
        callbacks=callbacks,
        verbose=1
    )
    actual_epochs = len(history.history["loss"])
    print(f"  -> Hoàn thành sau {actual_epochs} epochs!")

    # 5. Đánh giá trên tập Test độc lập
    print("\n[Bước 5/5] Đánh giá chất lượng mô hình trên tập Test...")
    test_loss, test_acc = model.evaluate(X_test_scaled, y_test, verbose=0)
    y_pred_probs = model.predict(X_test_scaled, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)

    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_test, y_pred, average="macro", zero_division=0
    )
    p_weighted, r_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_test, y_pred, average="weighted", zero_division=0
    )
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1, 2])
    
    unique_labels = sorted(list(set(y_test) | set(y_pred)))
    target_names = [CLASS_NAMES[i] for i in unique_labels if i < len(CLASS_NAMES)]
    clf_report = classification_report(
        y_test, y_pred, target_names=target_names, labels=unique_labels, output_dict=True
    )

    print(f"  -> Test Loss     : {test_loss:.5f}")
    print(f"  -> Test Accuracy : {test_acc * 100:.2f}%")
    print(f"  -> Macro F1-Score: {f1_macro:.4f}")

    # 6. Xuất và lưu 5 artifacts
    keras_path = out_dir / "health_risk_model.keras"
    scaler_path = out_dir / "scaler.pkl"
    le_path = out_dir / "label_encoder.pkl"
    cfg_path = out_dir / "feature_config.json"
    metrics_path = out_dir / "training_metrics.json"

    model.save(keras_path)
    with open(scaler_path, "wb") as f:
        pickle.dump(scaler, f)
    with open(le_path, "wb") as f:
        pickle.dump(label_encoder, f)

    feature_config = {
        "feature_columns": FEATURE_COLUMNS,
        "num_features": len(FEATURE_COLUMNS),
        "target_column": "risk_level",
        "class_names": CLASS_NAMES,
        "label_mapping": label_mapping,
        "scaler_mean": [float(m) for m in scaler.mean_],
        "scaler_scale": [float(s) for s in scaler.scale_]
    }
    with open(cfg_path, "w", encoding="utf-8") as f:
        json.dump(feature_config, f, indent=2, ensure_ascii=False)

    training_metrics = {
        "status": "SUCCESS",
        "model_id": "HEALTH-RISK-MLP-v1.0",
        "timestamp": pd.Timestamp.now().isoformat(),
        "data_mode": data_mode,
        "baseline_samples": len(df_baseline),
        "supabase_samples": supabase_count,
        "total_samples": len(df),
        "test_loss": float(test_loss),
        "test_accuracy": float(test_acc),
        "macro_precision": float(p_macro),
        "macro_recall": float(r_macro),
        "macro_f1": float(f1_macro),
        "weighted_precision": float(p_weighted),
        "weighted_recall": float(r_weighted),
        "weighted_f1": float(f1_weighted),
        "confusion_matrix": cm.tolist(),
        "classification_report": clf_report,
        "training_config": {
            "epochs_trained": actual_epochs,
            "max_epochs": epochs,
            "batch_size": batch_size,
            "random_state": random_state,
            "data_mode": data_mode,
            "baseline_samples": len(df_baseline),
            "supabase_samples": supabase_count,
            "total_samples": len(df),
            "train_samples": int(len(X_train)),
            "val_samples": int(len(X_val)),
            "test_samples": int(len(X_test)),
            "class_weights": {str(k): float(v) for k, v in class_weights_dict.items()}
        }
    }
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(training_metrics, f, indent=2, ensure_ascii=False)

    # 6. Ghi nhật ký vào training_history.json phục vụ Telegram Bot /history & Dashboard
    history_path = out_dir / "training_history.json"
    history_entries = []
    if history_path.exists():
        try:
            with open(history_path, "r", encoding="utf-8") as hf:
                history_entries = json.load(hf)
        except Exception:
            history_entries = []

    new_entry = {
        "run_id": f"train-{int(time.time()) % 10000:04d}",
        "timestamp": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        "trigger": "n8n_pipeline",
        "data_mode": data_mode.upper(),
        "samples": len(df),
        "baseline_samples": len(df_baseline),
        "supabase_samples": supabase_count,
        "accuracy": round(float(test_acc), 4),
        "macro_f1": round(float(f1_macro), 4),
        "test_loss": round(float(test_loss), 5),
        "epochs": actual_epochs,
        "status": "SUCCESS" if float(test_acc) >= 0.90 else "FAILED",
        "quality_gate": "PASSED" if float(test_acc) >= 0.90 else f"REJECTED ({float(test_acc)*100:.1f}% < 90%)"
    }
    history_entries.insert(0, new_entry)
    try:
        with open(history_path, "w", encoding="utf-8") as hf:
            json.dump(history_entries[:30], hf, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"  [Warning] Không thể ghi training_history.json: {e}")

    print("\n" + "=" * 70)
    print("  ĐÃ XUẤT THÀNH CÔNG 5 ARTIFACT VÀO THƯ MỤC:")
    print(f"  {out_dir}")
    print("=" * 70)

    summary = {
        "status": "SUCCESS",
        "model_id": "HEALTH-RISK-MLP-v1.0",
        "data_mode": data_mode,
        "baseline_samples": len(df_baseline),
        "supabase_samples": supabase_count,
        "total_samples": len(df),
        "test_accuracy": round(float(test_acc), 4),
        "macro_f1": round(float(f1_macro), 4),
        "test_loss": round(float(test_loss), 5),
        "epochs_trained": actual_epochs,
        "artifacts_saved": [
            keras_path.name,
            scaler_path.name,
            le_path.name,
            cfg_path.name,
            metrics_path.name
        ]
    }
    print(f"\n[OUTPUT_JSON_RESULT]={json.dumps(summary)}")
    return summary

def main():
    parser = argparse.ArgumentParser(description="Script huấn luyện mô hình phân loại nguy cơ sức khỏe Smart Watch")
    base_dir = Path(__file__).resolve().parent
    default_data = base_dir / "data" / "clean_health_dataset.csv"
    default_artifacts = base_dir / "artifacts"

    parser.add_argument("--data-path", type=str, default=str(default_data), help="Đường dẫn file CSV dữ liệu")
    parser.add_argument("--artifacts-dir", type=str, default=str(default_artifacts), help="Thư mục lưu artifacts")
    parser.add_argument("--epochs", type=int, default=15, help="Số epochs tối đa")
    parser.add_argument("--batch-size", type=int, default=32, help="Kích thước batch size")
    parser.add_argument("--data-mode", type=str, default="hybrid", choices=["hybrid", "local", "supabase"], help="Chiến lược nạp dữ liệu")
    args = parser.parse_args()

    run_training_pipeline(
        data_path=args.data_path,
        artifacts_dir=args.artifacts_dir,
        epochs=args.epochs,
        batch_size=args.batch_size,
        data_mode=args.data_mode
    )

if __name__ == "__main__":
    main()
