import os
import numpy as np
from typing import Tuple, Optional
from . import config
from .dataset import apply_adaptive_filter, create_temporal_pairs, load_raw_dataset
from kid_ppg.kid_ppg import KID_PPG

class HeartRatePredictor:
    """Lớp dự đoán nhịp tim thời gian thực từ tín hiệu Smart Watch."""

    def __init__(self, weights_path: Optional[str] = None):
        if weights_path and os.path.exists(weights_path):
            print(f"[Predictor] Đang tải trọng số tùy chỉnh từ: {weights_path}")
            self.model = KID_PPG(load_weights=False)
            self.model.model.load_weights(weights_path)
        else:
            print("[Predictor] Sử dụng trọng số pre-trained KID-PPG mặc định...")
            self.model = KID_PPG(load_weights=True)

    def predict_signals(
        self,
        raw_signals: np.ndarray,
        threshold: float = config.ERROR_THRESHOLD_BPM
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Dự đoán nhịp tim từ mảng tín hiệu thô (N, 256, 4) [PPG, AccX, AccY, AccZ].
        Returns:
            hr_mean: Giá trị nhịp tim trung bình dự đoán (BPM)
            hr_std: Độ lệch chuẩn (độ bất định / uncertainty)
            p_reliable: Xác suất độ tin cậy
        """
        filtered = apply_adaptive_filter(raw_signals)
        dummy_y = np.zeros(len(filtered))
        pairs, _ = create_temporal_pairs(filtered, dummy_y)
        
        hr_mean, hr_std, p_reliable = self.model.predict_threshold(pairs, threshold=threshold)
        return hr_mean, hr_std, p_reliable

def demo_prediction():
    """Chạy thử dự đoán trên 5 mẫu từ bộ dữ liệu đo demo."""
    print("=" * 60)
    print("  DỰ ĐOÁN NHỊP TIM (INFERENCE DEMO)")
    print("=" * 60)

    X_raw, y_true = load_raw_dataset()
    sample_count = 5
    X_samples = X_raw[:sample_count + 1] # Cần ít nhất 2 mẫu để ghép cặp thời gian
    y_target = y_true[:sample_count]

    predictor = HeartRatePredictor()
    hr_mean, hr_std, p_reliable = predictor.predict_signals(X_samples)

    for i in range(sample_count):
        print(f"Mẫu #{i+1}:")
        print(f"  -> Nhịp tim thực tế : {float(y_target[i]):.1f} BPM")
        print(f"  -> Nhịp tim dự đoán : {float(hr_mean[i]):.1f} ± {float(hr_std[i]):.1f} BPM")
        print(f"  -> Độ tin cậy       : {float(p_reliable[i]) * 100:.1f}%\n")
    print("=" * 60)

if __name__ == "__main__":
    demo_prediction()
