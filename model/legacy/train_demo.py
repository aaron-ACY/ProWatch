import sys
import os
from pathlib import Path

# Thêm thư mục src (trong ref hoặc local) vào sys.path để import kid_ppg
SRC_PATH = Path(__file__).resolve().parent.parent / "ref" / "src"
if not SRC_PATH.exists():
    SRC_PATH = Path(__file__).resolve().parent / "src"
if str(SRC_PATH) not in sys.path:
    sys.path.insert(0, str(SRC_PATH))

import os
import subprocess

# Tự động chuyển sang Python của .venv nếu đang chạy bằng Python hệ thống không có tensorflow
VENV_PYTHON = Path(__file__).resolve().parent / ".venv" / "Scripts" / "python.exe"
if not VENV_PYTHON.exists():
    VENV_PYTHON = Path(__file__).resolve().parent.parent / ".venv" / "Scripts" / "python.exe"
try:
    import tensorflow as tf
except ImportError:
    if VENV_PYTHON.exists() and sys.executable.lower() != str(VENV_PYTHON).lower():
        result = subprocess.call([str(VENV_PYTHON), *sys.argv])
        sys.exit(result)

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import warnings
warnings.filterwarnings('ignore')

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import numpy as np

def run_trial():
    print("=" * 60)
    print("  CHƯƠNG TRÌNH CHẠY THỬ MODEL KID-PPG (DEMO & TRAINING)")
    print("=" * 60)

    try:
        from silence_tensorflow import silence_tensorflow
        silence_tensorflow()
    except ImportError:
        pass

    import tensorflow as tf
    from kid_ppg.demo import demo_utils
    from kid_ppg.preprocessing import (
        sample_wise_z_score_normalization,
        sample_wise_z_score_denormalization,
        create_temporal_pairs
    )
    from kid_ppg.adaptive_linear_model import AdaptiveFilteringModel
    from kid_ppg.kid_ppg import KID_PPG

    print("\n[Bước 1/4] Nạp dữ liệu đo thử nghiệm (Demo Data)...")
    X, y = demo_utils.load_demo_data()
    print(f"  -> Tín hiệu gốc: {X.shape[0]} mẫu, 4 kênh (PPG, AccX, AccY, AccZ), 256 điểm/mẫu (8s @ 32Hz)")
    print(f"  -> Nhịp tim thực tế Ground-Truth (y): {y.shape[0]} nhãn")

    print("\n[Bước 2/4] Chạy thử lọc thích ứng (Adaptive Filtering Self-Training)...")
    # Lấy 100 mẫu đầu để chạy thử nhanh
    sample_size = min(100, X.shape[0])
    X_sub = X[:sample_size].copy()
    y_sub = y[:sample_size].copy()

    X_norm, ms, stds = sample_wise_z_score_normalization(X_sub)
    sgd = tf.keras.optimizers.legacy.SGD(learning_rate=1e-7, momentum=1e-2)
    
    # Self-training 50 epochs cho đoạn demo thử nghiệm
    adaptive_model = AdaptiveFilteringModel(local_optimizer=sgd, num_epochs_self_train=50)
    X_filtered = adaptive_model(X_norm[..., None]).numpy()
    X_filtered = sample_wise_z_score_denormalization(X_filtered[:, None, :], ms, stds)[:, 0, :]
    print(f"  -> Đã lọc xong nhiễu chuyển động: X_filtered shape = {X_filtered.shape}")

    print("\n[Bước 3/4] Ghép cặp thời gian (Temporal Pairs)...")
    X_pairs, y_pairs = create_temporal_pairs(X_filtered, y_sub)
    print(f"  -> Dữ liệu đầu vào mạng KID-PPG: X_pairs = {X_pairs.shape}, y_pairs = {y_pairs.shape}")

    print("\n[Bước 4/4] Khởi tạo mô hình KID-PPG và chạy thử nghiệm...")
    # 4.1 Thử nghiệm Inference với pre-trained weights
    print("  4.1. Thử nghiệm suy luận (Inference) với Pre-trained weights:")
    kid_pretrained = KID_PPG(load_weights=True)
    hr_pred_m, hr_pred_std, p_error = kid_pretrained.predict_threshold(X_pairs[:5], threshold=10.0)
    for i in range(min(5, len(y_pairs))):
        y_val_item = float(y_pairs[i].item() if hasattr(y_pairs[i], 'item') else y_pairs[i])
        pred_item = float(hr_pred_m[i].item() if hasattr(hr_pred_m[i], 'item') else hr_pred_m[i])
        std_item = float(hr_pred_std[i].item() if hasattr(hr_pred_std[i], 'item') else hr_pred_std[i])
        err_item = float(p_error[i].item() if hasattr(p_error[i], 'item') else p_error[i])
        print(f"    Mẫu {i+1}: Thực tế = {y_val_item:.1f} BPM | Dự đoán = {pred_item:.1f} ± {std_item:.1f} BPM | p(|err| < 10) = {err_item*100:.1f}%")

    # 4.2 Thử nghiệm Huấn luyện (Training 3 epochs demo)
    print("\n  4.2. Thử nghiệm Huấn luyện (Training demo 3 epochs)...")
    kid_train = KID_PPG(load_weights=True) # hoặc False nếu muốn train hoàn toàn từ đầu
    
    def nll_loss(y_true, y_pred_dist):
        return -y_pred_dist.log_prob(y_true)

    kid_train.model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss=nll_loss
    )

    history = kid_train.model.fit(
        X_pairs, y_pairs,
        epochs=3,
        batch_size=16,
        verbose=1
    )

    print("\n" + "=" * 60)
    print("  CHẠY THỬ THÀNH CÔNG!")
    print(f"  Loss cuối cùng sau 3 epochs: {history.history['loss'][-1]:.4f}")
    print("=" * 60)

if __name__ == "__main__":
    run_trial()
