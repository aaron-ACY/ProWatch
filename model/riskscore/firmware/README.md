# HƯỚNG DẪN CÀI ĐẶT & NẠP FIRMWARE TINYML CHO SEEED STUDIO XIAO ESP32-S3

Firmware này thực hiện suy luận Edge AI thời gian thực (inference) đánh giá rủi ro sức khỏe (**Health Risk Score**) bằng mô hình mạng nơ-ron full-integer **INT8** (~3.1 KB) chạy trên TensorFlow Lite Micro.

---

## 1. Cấu trúc thư mục Firmware (`firmware/health_risk_esp32/`)

```text
firmware/health_risk_esp32/
├── health_risk_esp32.ino        # Mã nguồn chính Arduino (setup, loop, predictRisk)
├── health_risk_model_int8.h    # Mảng byte mô hình TFLite INT8 (aligned 16)
├── quant_params.h               # Hằng số lượng tử hóa INT8 (Scale & Zero-Point)
├── scaler_params.h              # Hằng số chuẩn hóa Z-Score (Mean & Std của 6 chỉ số)
└── test_cases.h                 # 10 mẫu kiểm thử chuẩn đối chiếu với Python
```

---

## 2. Cài đặt Môi trường Arduino IDE

### Bước 1: Cài đặt Board Package ESP32
1. Mở **Arduino IDE** (khuyên dùng bản 2.x).
2. Vào **File** $\rightarrow$ **Preferences** (hoặc `Ctrl + ,`).
3. Dán URL sau vào ô **Additional Boards Manager URLs**:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Vào menu **Tools** $\rightarrow$ **Board** $\rightarrow$ **Boards Manager...**, tìm kiếm **`esp32`** (bởi Espressif Systems) và bấm **Install** (khuyên dùng phiên bản `>= 2.0.11` hoặc `3.x`).

### Bước 2: Cài đặt Thư viện TensorFlow Lite Micro
1. Trong Arduino IDE, vào **Sketch** $\rightarrow$ **Include Library** $\rightarrow$ **Manage Libraries...** (hoặc `Ctrl + Shift + I`).
2. Gõ tìm kiếm: **`Chirale_TensorFlowLite`** (hoặc `TensorFlowLite_ESP32`).
3. Chọn phiên bản mới nhất (ví dụ `2.0.0`) và bấm **Install**.

---

## 3. Cấu hình Board & Nạp Code

1. Vào menu **Tools** và chọn các cấu hình sau:
   - **Board**: `XIAO_ESP32S3` (nằm trong mục `ESP32 Arduino`).
   - **CPU Frequency**: `240MHz (WiFi)`
   - **Flash Mode**: `QIO 80MHz`
   - **Flash Size**: `8MB (64Mb)`
   - **Partition Scheme**: `Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)`
   - **Port**: Chọn đúng cổng COM của bo mạch (ví dụ `COM3`, `COM5`).

2. **Cách nạp code**:
   - Nhấn nút **Upload** (mũi tên hướng sang phải) trên Arduino IDE.
   - *Lưu ý*: Nếu IDE báo lỗi `A fatal error occurred: Failed to connect to ESP32-S3`:
     1. Nhấn và **giữ nút BOOT** trên bo mạch Seeed XIAO ESP32-S3.
     2. Nhấn nút **RESET** một lần rồi thả ra.
     3. Thả nút **BOOT** để đưa chip về chế độ nạp Bootloader (`Download Mode`).
     4. Nhấn lại nút **Upload** trên IDE.

---

## 4. Đọc kết quả trên Serial Monitor

1. Mở **Serial Monitor** (menu **Tools** $\rightarrow$ **Serial Monitor** hoặc `Ctrl + Shift + M`).
2. Chọn tốc độ Baud rate: **`115200 baud`**.
3. Kết quả chạy tự động kiểm chứng 10 Test Cases sẽ hiển thị như sau:

```text
================================================================================
   SEEED STUDIO XIAO ESP32-S3 - TINYML HEALTH RISK INFERENCE (INT8)
================================================================================
[INFO] TFLite Model INT8 Size: 3104 bytes
[INFO] Khoi tao thanh cong! SRAM Arena su dung: 2368 / 4096 bytes (Con trong: 1728 bytes)
[INFO] Input  Quantization: Scale = 0.026725, ZeroPoint = 3
[INFO] Output Quantization: Scale = 0.003906, ZeroPoint = -128

--------------------------------------------------------------------------------
 KIEM CHUNG 10 TEST CASES TREN BOARD ESP32-S3 SO VOI KET QUA PYTHON:
--------------------------------------------------------------------------------
No | HR  SpO2 Temp  BMI  | Python Risk | Board Risk | Latency | Status
---+---------------------+-------------+------------+---------+---------
#01|  75  99.0 37.1 20.8 |   0.0000    |   0.0000   |  120 us | PASSED
#02|  60  98.7 36.4 20.8 |   0.0000    |   0.0000   |  118 us | PASSED
#03| 172  96.3 36.6 21.6 |   0.9961    |   0.9961   |  122 us | PASSED
#04| 128  97.3 36.7 21.6 |   0.9961    |   0.9961   |  119 us | PASSED
#05|  68  98.6 36.9 20.5 |   0.0000    |   0.0000   |  118 us | PASSED
#06|  82  98.2 37.1 20.5 |   0.0000    |   0.0000   |  118 us | PASSED
#07|  68  98.8 36.3 21.8 |   0.0000    |   0.0000   |  119 us | PASSED
#08|  45  98.7 36.7 27.6 |   0.9961    |   0.9961   |  120 us | PASSED
#09|  75  98.5 36.3 20.8 |   0.0000    |   0.0000   |  118 us | PASSED
#10|  90  97.7 36.4 20.2 |   0.0000    |   0.0000   |  119 us | PASSED
---+---------------------+-------------+------------+---------+---------
[KET QUA] 10 / 10 Test Cases dat chuan khop tuyet doi voi Python!
================================================================================
```

---

## 5. Đặc tả Hiệu năng trên Vi điều khiển

| Thông số | Giá trị đo được trên Seeed XIAO ESP32-S3 |
| :--- | :--- |
| **Kích thước Flash (Model INT8)** | **3,104 bytes** (~3.1 KB) |
| **Kích thước Tensor Arena (RAM)** | Khai báo 4,096 bytes (Thực tế chỉ dùng **~2.4 KB**) |
| **Thời gian suy luận (Latency)** | **~120 microseconds** (0.12 ms ở xung nhịp 240MHz) |
| **Toán tử TFLite sử dụng** | Chỉ đúng 2 op: `FULLY_CONNECTED` và `LOGISTIC` |
| **Tần số lấy mẫu tối đa** | Hơn 5,000 lần suy luận/giây |
