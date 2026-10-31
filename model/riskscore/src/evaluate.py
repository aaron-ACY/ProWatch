import numpy as np
from typing import Dict, Any, Optional
from . import config
from .dataset import prepare_training_data
from kid_ppg.kid_ppg import KID_PPG

def evaluate_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    threshold: float = config.ERROR_THRESHOLD_BPM
) -> Dict[str, float]:
    """
    Tính toán các chỉ số đánh giá độ chính xác đo nhịp tim:
    - MAE: Sai số tuyệt đối trung bình (BPM)
    - RMSE: Căn bậc hai sai số bình phương trung bình
    - Within_Threshold: Tỉ lệ dự đoán sai lệch < threshold BPM
    """
    y_true = np.asarray(y_true).flatten()
    y_pred = np.asarray(y_pred).flatten()
    
    errors = np.abs(y_true - y_pred)
    mae = float(np.mean(errors))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    within_thresh = float(np.mean(errors < threshold) * 100.0)
    
    return {
        "mae": mae,
        "rmse": rmse,
        f"within_{int(threshold)}bpm_percent": within_thresh
    }

def evaluate_model(
    weights_path: Optional[str] = None,
    sample_limit: int = 100,
    threshold: float = config.ERROR_THRESHOLD_BPM
) -> Dict[str, Any]:
    """
    Chạy đánh giá mô hình KID-PPG trên tập dữ liệu kiểm thử.
    """
    print("=" * 60)
    print("  ĐÁNH GIÁ CHẤT LƯỢNG MÔ HÌNH KID-PPG")
    print("=" * 60)

    X_test, y_test = prepare_training_data(sample_limit=sample_limit, filter_data=True)
    kid = KID_PPG(load_weights=(weights_path is None))
    if weights_path:
        kid.model.load_weights(weights_path)
    
    mean_preds, std_preds, p_errors = kid.predict_threshold(X_test, threshold=threshold)
    metrics = evaluate_predictions(y_test, mean_preds, threshold=threshold)

    print(f"  -> Số lượng mẫu đánh giá: {len(y_test)}")
    print(f"  -> MAE (Sai số trung bình) : {metrics['mae']:.2f} BPM")
    print(f"  -> RMSE                    : {metrics['rmse']:.2f} BPM")
    print(f"  -> Tỉ lệ sai số < {threshold:.0f} BPM  : {metrics[f'within_{int(threshold)}bpm_percent']:.1f}%")
    print("=" * 60)
    return metrics

if __name__ == "__main__":
    evaluate_model(sample_limit=50)
