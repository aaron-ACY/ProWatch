import sys
from pathlib import Path

# Đường dẫn thư mục chính
SRC_DIR = Path(__file__).resolve().parent
SMARTWATCH_DIR = SRC_DIR.parent
MODEL_DIR = SMARTWATCH_DIR.parent
PROJECT_ROOT = MODEL_DIR.parent

DATA_DIR = SMARTWATCH_DIR / "data"
NOTEBOOKS_DIR = SMARTWATCH_DIR / "notebooks"
SAVED_MODELS_DIR = SMARTWATCH_DIR / "saved_models"
REF_SRC_DIR = MODEL_DIR / "ref" / "src"

# Đảm bảo các thư mục tồn tại
DATA_DIR.mkdir(parents=True, exist_ok=True)
SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Tự động nạp thư viện thuật toán gốc từ ref/src vào sys.path
if REF_SRC_DIR.exists() and str(REF_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(REF_SRC_DIR))

# Tham số cấu hình tín hiệu PPG & Gia tốc kế (Smart Watch)
SAMPLING_RATE = 32         # 32 Hz
WINDOW_SECONDS = 8         # Cửa sổ 8 giây
WINDOW_SIZE = 256          # 8s * 32Hz = 256 mẫu
NUM_CHANNELS = 4           # PPG, AccX, AccY, AccZ
PAIR_CHANNELS = 2          # 2 kênh sau ghép cặp temporal pair

# Tham số Huấn luyện (Training Hyperparameters)
BATCH_SIZE = 16
DEFAULT_EPOCHS = 5
LEARNING_RATE = 1e-4
ADAPTIVE_FILTER_EPOCHS = 50
ADAPTIVE_LR = 1e-7

# Ngưỡng chấp nhận sai số BPM (cho đánh giá độ chính xác lâm sàng)
ERROR_THRESHOLD_BPM = 10.0

# Đường dẫn model mặc định
DEFAULT_MODEL_WEIGHTS = SAVED_MODELS_DIR / "kid_ppg_model.weights.h5"
