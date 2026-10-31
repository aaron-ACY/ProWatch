import os
from typing import Tuple, Optional
import numpy as np
import tensorflow as tf

from . import config

try:
    from silence_tensorflow import silence_tensorflow
    silence_tensorflow()
except ImportError:
    pass

from kid_ppg.demo import demo_utils
from kid_ppg.preprocessing import (
    sample_wise_z_score_normalization,
    sample_wise_z_score_denormalization,
    create_temporal_pairs
)
from kid_ppg.adaptive_linear_model import AdaptiveFilteringModel

def load_raw_dataset(data_path: Optional[str] = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    Nạp dữ liệu đo từ file hoặc dùng dữ liệu demo tham khảo từ ref.
    Returns:
        X: np.ndarray shape (N, 256, 4) - gồm [PPG, AccX, AccY, AccZ]
        y: np.ndarray shape (N,) - nhãn nhịp tim Ground Truth (BPM)
    """
    if data_path and os.path.exists(data_path):
        data = np.load(data_path)
        return data["X"], data["y"]
    
    # Nạp dữ liệu demo từ thư viện gốc trong ref
    X, y = demo_utils.load_demo_data()
    return X, y

def apply_adaptive_filter(X: np.ndarray, num_epochs: int = config.ADAPTIVE_FILTER_EPOCHS) -> np.ndarray:
    """
    Áp dụng bộ lọc thích ứng 3 kênh NLMS + Bandpass để loại bỏ nhiễu do cử động cổ tay (Motion Artifacts).
    """
    X_norm, ms, stds = sample_wise_z_score_normalization(X)
    sgd = tf.keras.optimizers.legacy.SGD(
        learning_rate=config.ADAPTIVE_LR,
        momentum=1e-2
    )
    
    adaptive_model = AdaptiveFilteringModel(
        local_optimizer=sgd,
        num_epochs_self_train=num_epochs
    )
    X_filtered = adaptive_model(X_norm[..., None]).numpy()
    X_filtered = sample_wise_z_score_denormalization(X_filtered[:, None, :], ms, stds)[:, 0, :]
    return X_filtered

def prepare_training_data(
    sample_limit: Optional[int] = None,
    filter_data: bool = True
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Quy trình tiền xử lý hoàn chỉnh từ dữ liệu thô sang cặp thời gian (temporal pairs)
    cho mạng KID-PPG 1D-CNN.
    """
    X, y = load_raw_dataset()
    if sample_limit is not None and sample_limit > 0:
        X = X[:sample_limit].copy()
        y = y[:sample_limit].copy()
    
    if filter_data:
        X_filtered = apply_adaptive_filter(X)
    else:
        X_filtered = X[:, :, 0] # Chỉ lấy kênh PPG
    
    X_pairs, y_pairs = create_temporal_pairs(X_filtered, y)
    return X_pairs, y_pairs
