import os
import tensorflow as tf
from . import config
from .dataset import prepare_training_data
from kid_ppg.kid_ppg import KID_PPG

def nll_loss(y_true, y_pred_dist):
    """Negative Log-Likelihood Loss cho phân phối xác suất nhịp tim."""
    return -y_pred_dist.log_prob(y_true)

def train_model(
    epochs: int = config.DEFAULT_EPOCHS,
    batch_size: int = config.BATCH_SIZE,
    learning_rate: float = config.LEARNING_RATE,
    sample_limit: int = 100,
    save_path: str = str(config.DEFAULT_MODEL_WEIGHTS)
):
    """
    Quy trình huấn luyện model KID-PPG.
    """
    print("=" * 60)
    print("  BẮT ĐẦU HUẤN LUYỆN MODEL ĐO NHỊP TIM (KID-PPG)")
    print("=" * 60)

    print(f"\n[1/3] Chuẩn bị dữ liệu huấn luyện (Sample limit: {sample_limit})...")
    X_train, y_train = prepare_training_data(sample_limit=sample_limit, filter_data=True)
    print(f"  -> X_train: {X_train.shape}, y_train: {y_train.shape}")

    print("\n[2/3] Khởi tạo mô hình KID-PPG...")
    kid = KID_PPG(load_weights=True)
    kid.model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss=nll_loss
    )

    print(f"\n[3/3] Huấn luyện qua {epochs} epochs...")
    history = kid.model.fit(
        X_train, y_train,
        epochs=epochs,
        batch_size=batch_size,
        verbose=1
    )

    # Lưu trọng số mô hình
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    kid.model.save_weights(save_path)
    print(f"\n  -> Đã lưu trọng số mô hình thành công tại: {save_path}")
    print("=" * 60)
    return kid, history

if __name__ == "__main__":
    train_model(epochs=3, sample_limit=50)
