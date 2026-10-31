# ProWatch AI - Health Risk Classification Model (TinyML)

Thư mục này chứa toàn bộ mã nguồn huấn luyện, dữ liệu thực nghiệm, artifacts và bộ điều phối MLOps cho mô hình mạng nơ-ron nhân tạo đa tầng siêu nhẹ (**TinyML MLP**) phân loại mức độ rủi ro sức khỏe (**Low**, **Medium**, **High**) trên đồng hồ thông minh **Seeed Studio XIAO ESP32-S3**.

---

## 1. Cấu trúc thư mục

```text
model/
├── legacy/                     # Lưu trữ mã nguồn cũ / tham chiếu (server.py, train_demo.py)
└── riskscore/
    ├── .venv/                  # Môi trường ảo Python 3.11 (TensorFlow 2.13, Scikit-learn, Pandas)
    ├── artifacts/              # 5 artifacts mô hình xuất xưởng (.keras, .pkl, .json, .h)
    │   ├── health_risk_model.keras       # File trọng số mô hình Keras gốc
    │   ├── scaler.pkl                    # StandardScaler đã fit trên tập Training
    │   ├── label_encoder.pkl             # LabelEncoder ánh xạ nhãn 3 lớp
    │   ├── feature_config.json           # Cấu hình danh sách 6 đặc trưng và tham số chuẩn hóa
    │   └── training_metrics.json         # Báo cáo đánh giá chi tiết (Loss, Accuracy, F1-Score)
    ├── data/                   # Dữ liệu sạch clean_health_dataset.csv & dữ liệu WESAD gốc (S1 - S15)
    ├── firmware/               # Mã nguồn C++ / Arduino nhúng vào XIAO ESP32-S3
    ├── notebooks/              # Jupyter Notebooks nghiên cứu & tiền xử lý
    │   ├── Data_cleaning_process.ipynb   # Quy trình trích xuất và làm sạch dữ liệu
    │   └── training_model.ipynb          # Notebook huấn luyện & trực quan hóa chuẩn xác
    ├── saved_models/           # Checkpoints trọng số mô hình
    ├── src/                    # Các module mã nguồn phụ trợ
    │   ├── label_risk.py                 # Quy tắc gán nhãn nguy cơ theo chuẩn NEWS2 & WHO 2004
    │   ├── export_int8.py                # Pipeline lượng tử hóa INT8 & sinh mã mảng C-Header
    │   └── ...
    ├── requirements.txt        # Danh sách thư viện phụ thuộc
    ├── train_model.py          # Script huấn luyện chính thức (chạy độc lập qua CLI)
    └── run_training_service.py # Bộ điều phối Task Runner kết nối với n8n (Cổng 5005)
```

---

## 2. Hướng dẫn sử dụng

### 2.1 Chạy huấn luyện mô hình độc lập (CLI)

Mở **PowerShell** tại thư mục gốc dự án:
```powershell
& "model\riskscore\.venv\Scripts\python.exe" "model\riskscore\train_model.py" --epochs 15 --batch-size 32
```

#### Bảng chi tiết các tham số dòng lệnh (CLI Parameters):

| Tham số | Kiểu dữ liệu | Mặc định | Ý nghĩa & Bản chất Machine Learning |
| :--- | :---: | :---: | :--- |
| **`--epochs`** | `int` | `15` | **Số vòng lặp huấn luyện tối đa** qua toàn bộ tập dữ liệu (20,705 mẫu training). |
| **`--batch-size`** | `int` | `32` | **Số lượng mẫu dữ liệu xử lý trong một lần tính toán gradient** trước khi cập nhật trọng số mạng nơ-ron. |
| **`--data-path`** | `str` | `data/clean_health_dataset.csv` | Đường dẫn tới tệp CSV dữ liệu đầu vào chứa 6 đặc trưng và nhãn `risk_level`. |
| **`--artifacts-dir`** | `str` | `artifacts/` | Thư mục đích nhận toàn bộ 5 tệp kết quả sau huấn luyện. |

---

#### 🔍 Phân tích chuyên sâu về tham số `--epochs 15`:
* **Khái niệm**: 1 Epoch tương ứng với **1 lần duyệt toàn bộ 20,705 mẫu** dữ liệu huấn luyện qua mô hình.
* **Tại sao lại chọn mặc định là 15?**
  - Mạng TinyML MLP phân loại sức khỏe có cấu trúc tối ưu siêu nhẹ (chỉ **275 tham số**). Do đó, mô hình hội tụ (convergence) rất nhanh: chỉ sau **3 – 5 epochs** độ chính xác đã đạt trên **99.8%**. Mốc 15 epochs là khoảng đệm an toàn tối đa để đảm bảo loss tiệm cận tối ưu mà không lãng phí thời gian tính toán.
* **Cơ chế bảo vệ thông minh tích hợp sẵn trong script**:
  - `EarlyStopping(patience=8)`: Nếu sau 8 epochs liên tiếp mà `val_loss` không giảm thêm, tiến trình tự động ngắt sớm và khôi phục trọng số tốt nhất (`restore_best_weights=True`), giúp ngăn ngừa hoàn toàn hiện tượng quá khớp (overfitting).
  - `ReduceLROnPlateau(patience=3, factor=0.5)`: Giảm 50% tốc độ học (learning rate) nếu validation loss đi ngang sau 3 epochs, giúp mô hình hội tụ mượt mà vào điểm cực tiểu.

---

#### 🔍 Phân tích chuyên sâu về tham số `--batch-size 32`:
* **Khái niệm**: Thay vì nạp toàn bộ 20,705 dòng vào RAM cùng lúc (Batch Gradient Descent) hoặc nạp từng dòng một (Stochastic Gradient Descent), mô hình chia dữ liệu thành từng cụm nhỏ gồm **32 mẫu/bước**.
* **Công thức số bước tính toán trong 1 epoch**:
  $$\text{Số bước lặp (Steps per Epoch)} = \left\lceil \frac{\text{Số mẫu Train}}{\text{Batch Size}} \right\rceil = \left\lceil \frac{20,705}{32} \right\rceil = 648 \text{ bước}$$
  *(Với 15 epochs, mô hình sẽ thực hiện tổng cộng $648 \times 15 = 9,720$ lần cập nhật trọng số).*
* **Tại sao là 32 mà không phải 16 hay 64?**
  - `batch_size = 32` là mốc "vàng" (sweet spot) kinh điển trong Deep Learning:
    - Nếu chọn **`16`**: Cập nhật trọng số nhiều hơn (1,295 bước/epoch), tính ngẫu nhiên cao hơn nhưng thời gian chạy trên CPU tăng gấp đôi.
    - Nếu chọn **`64` hoặc `128`**: Huấn luyện cực nhanh nhưng gradient quá trơn tru, dễ làm mô hình rơi vào các cực tiểu địa phương (local minima) kém tối ưu, giảm khả năng tổng quát hóa (generalization) của mạng TinyML.

---

#### Các kịch bản chạy mẫu theo nhu cầu:

* **Kịch bản 1: Chạy kiểm thử siêu tốc (Smoke Test / Debug pipeline trong 2 giây)**:
  ```powershell
  & "model\riskscore\.venv\Scripts\python.exe" "model\riskscore\train_model.py" --epochs 3 --batch-size 32
  ```

* **Kịch bản 2: Huấn luyện tiêu chuẩn (Khuyến nghị cho Production)**:
  ```powershell
  & "model\riskscore\.venv\Scripts\python.exe" "model\riskscore\train_model.py" --epochs 15 --batch-size 32
  ```

* **Kịch bản 3: Huấn luyện kỹ lưỡng khi có tập dữ liệu mới lớn hơn**:
  ```powershell
  & "model\riskscore\.venv\Scripts\python.exe" "model\riskscore\train_model.py" --epochs 50 --batch-size 16
  ```

* **Kịch bản 4: Huấn luyện từ file dữ liệu tùy biến và lưu ra thư mục riêng**:
  ```powershell
  & "model\riskscore\.venv\Scripts\python.exe" "model\riskscore\train_model.py" --data-path "data/custom_dataset.csv" --artifacts-dir "artifacts_exp1/"
  ```

---

### 2.2 Khởi chạy Task Runner kết nối n8n MLOps Pipeline
Khởi động runner cổng `5005` (sử dụng 100% thư viện chuẩn của Python, không cần cài FastAPI):
```powershell
& "model\riskscore\.venv\Scripts\python.exe" "model\riskscore\run_training_service.py"
```
Runner lắng nghe yêu cầu tại `http://0.0.0.0:5005/train` để n8n trong Docker (`host.docker.internal:5005`) kích hoạt huấn luyện tự động.

---

## 3. Quy trình nạp mô hình vào Firmware ESP32-S3
1. Sử dụng script `src/export_int8.py` để lượng tử hóa mô hình sang dạng **INT8 Full Integer**.
2. Sao chép mảng C-Header `health_risk_model_int8.h` và bảng tham số `scaler_params.h` vào thư mục `firmware/health_risk_esp32/`.
3. Biên dịch và nạp lên bo mạch **Seeed Studio XIAO ESP32-S3** qua Arduino IDE hoặc PlatformIO.
