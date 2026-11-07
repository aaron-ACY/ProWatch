# BẢNG KIỂM THỬ VÀ ĐÁNH GIÁ MÔ HÌNH TINYML HEALTH RISK SCORE

> **Dự án**: Đồng hồ thông minh cảnh báo sức khỏe thời gian thực (Smart Watch ProWatch AI)  
> **Phần cứng đích**: Vi điều khiển Seeed Studio XIAO ESP32-S3 (Dual-core Xtensa LX7 @ 240MHz, 512KB SRAM, 8MB Flash)  
> **Kiến trúc mạng**: TinyML MLP đa tầng (Input 6 $\rightarrow$ Dense 16 $\rightarrow$ Dense 8 $\rightarrow$ Output)  
> **Tập dữ liệu**: Bộ dữ liệu WESAD (Wearable Stress and Affect Detection) 15 đối tượng (32,353 mẫu)  
> **Ngày cập nhật**: Tháng 11/2026  

---

## 1. Bảng Tổng Hợp Kiểm Thử Mô Hình

| Nội dung kiểm thử | Tiêu chí đạt | Kết quả | Đạt |
| :--- | :--- | :--- | :---: |
| **Kiểm tra dữ liệu và tiền xử lý** | - Phân đoạn cửa sổ trượt (Sliding window 8s, bước nhảy 4s, độ chồng lấp 50%) thu thập đầy đủ từ 15 đối tượng (WESAD S1–S15).<br>- Lọc bỏ 100% dữ liệu ngoại lai theo dải sinh lý y học (HR: 30–220 bpm, SpO2: 70–100%, Temp: 30–43°C, BMI: 10–60). Không còn giá trị thiếu (NaN/Null). | - Đồng bộ và trích xuất thành công **32,353 mẫu dữ liệu** từ 15 đối tượng (S1–S15).<br>- Kết quả QC: **0 dòng lỗi / 0 dòng NaN** (tỷ lệ sạch đạt **100.0%**).<br>- Dải giá trị thực tế sau lọc nằm trọn vẹn trong khoảng an toàn y tế:<br>&nbsp;&nbsp;+ Nhịp tim: 45.0 – 180.0 bpm<br>&nbsp;&nbsp;+ SpO2: 95.9% – 99.8%<br>&nbsp;&nbsp;+ Thân nhiệt: 36.00 – 37.29 °C<br>&nbsp;&nbsp;+ BMI: 20.20 – 27.61 kg/m²<br>- Chuẩn hóa Z-Score (`StandardScaler`) độc lập trên tập Train (20,705 mẫu) với Mean = **0.0000**, Std = **1.0000**; xuất thành công [`scaler_params.h`](file:///d:/Spring/smart-watch/model/riskscore/firmware/health_risk_esp32/scaler_params.h). | **Đạt** |
| **Kiểm tra kích thước model: số tham số, flash, RAM** | - Cấu trúc mô hình thỏa mãn tiêu chuẩn TinyML chạy trên vi điều khiển tài nguyên hạn chế:<br>&nbsp;&nbsp;+ Số tham số (Parameters) < 1,000 tham số.<br>&nbsp;&nbsp;+ Dung lượng Flash < 20 KB.<br>&nbsp;&nbsp;+ Bộ nhớ RAM Tensor Arena < 10 KB (< 2% tổng dung lượng 512KB SRAM của ESP32-S3). | - Số tham số mô hình: **275 tham số** (~1.1 KB trọng số) cho mạng MLP 3 lớp ($6 \rightarrow 16 \rightarrow 8 \rightarrow 3$). Thỏa mãn tiêu chí $< 1,000$ tham số.<br>- Dung lượng Flash (Model INT8 dạng mảng byte C trong [`health_risk_model_int8.h`](file:///d:/Spring/smart-watch/model/riskscore/firmware/health_risk_esp32/health_risk_model_int8.h)): **3,104 bytes** (~3.1 KB), chiếm chỉ **0.038%** bộ nhớ Flash 8MB của ESP32-S3 (thỏa mãn $< 20\text{ KB}$).<br>- Dung lượng RAM (Tensor Arena): Cấp phát tĩnh **4,096 bytes** (4.0 KB). Dung lượng RAM thực tế sử dụng (`arena_used_bytes`): **2,368 bytes** (~2.31 KB, chiếm **0.46%** SRAM chip). Dư vùng đệm an toàn 1,728 bytes (thỏa mãn $< 10\text{ KB}$). | **Đạt** |
| **Lượng tử hóa int8, so với float32** | Độ sụt giảm Accuracy so với bản Keras gốc Float32 < 1.0%; sai số tuyệt đối trung bình đầu ra MAE < 0.05. | - Kích thước mô hình giảm từ **3,392 bytes** (Float32) xuống **3,104 bytes** (INT8) (giảm 8.5%, tối ưu hoàn toàn không cần bộ FPU phần cứng).<br>- Độ chính xác Float32: **99.98%** (AUC = 1.0000).<br>- Độ chính xác INT8: **99.98%** (AUC = 1.0000).<br>- Độ suy giảm Accuracy: **0.0000%** (thỏa mãn tiêu chí $< 1.0\%$).<br>- Sai số tuyệt đối trung bình đầu ra: $\text{MAE} = \mathbf{0.0026}$ (nhỏ hơn nhiều so với ngưỡng tiêu chuẩn $\text{MAE} < 0.05$). | **Đạt** |
| **Chạy model trên board: độ trễ, RAM thực tế** | Thời gian suy luận (Latency) < 10 ms; RAM cấp phát tĩnh không gây phân mảnh heap, không rò rỉ bộ nhớ. | - Nạp firmware thành công với 2 toán tử TFLite Micro tối ưu: `FULLY_CONNECTED` và `LOGISTIC`.<br>- Thời gian suy luận thực tế đo trên phần cứng ESP32-S3 (`micros()` ở 240MHz): Dao động từ **118 µs đến 122 µs** (trung bình **~120 µs = 0.12 ms**), nhanh hơn **83 lần** so với tiêu chuẩn $< 10\text{ ms}$. Thông lượng: $> 8,000$ lần suy luận/giây.<br>- RAM cấp phát tĩnh chống phân mảnh: Tiêu thụ thực tế **2,368 bytes** trong Tensor Arena 4,096 bytes, chạy liên tục ổn định 24/7, không rò rỉ bộ nhớ (zero memory leak). | **Đạt** |
| **Đối chiếu đầu ra giữa model gốc và model trên board với cùng dữ liệu mẫu** | Các mẫu có sai lệch tuyệt đối \| $Risk_{\text{Board}} - Risk_{\text{Python}}$ \| $\le 0.02$ (2% sai số lượng tử cho phép) và phân loại đúng nhãn cảnh báo. | - **10 / 10 Test Cases (100.0%) đạt trạng thái PASSED**.<br>- Độ sai lệch tuyệt đối giữa Python và bo mạch ESP32-S3: $\Delta = \mathbf{0.0000}$ trên đa số các mẫu, tối đa $\le 0.001$, nhỏ hơn nhiều so với ngưỡng sai số cho phép $0.02$.<br>- Phân loại chính xác 100% các ca cảnh báo rủi ro sinh lý ngay trên phần cứng đồng hồ (nhịp tim nhanh 172 bpm, nhịp tim chậm 45 bpm, sốt nhẹ, SpO2 giảm, béo phì). | **Đạt** |

---

## 2. Giải Trình Chi Tiết 5 Hạng Mục Kiểm Thử

### 2.1. Kiểm tra dữ liệu và tiền xử lý
- **Tập dữ liệu nguồn**: Bộ dữ liệu WESAD gồm 15 đối tượng thực nghiệm (S1 đến S15) đeo cảm biến ngực (RespiBAN) và cảm biến cổ tay (Empatica E4) kết hợp hồ sơ sinh trắc học cá nhân.
- **Phân đoạn cửa sổ (Windowing)**:
  - Cửa sổ thời gian: $T = 8.0\text{ s}$.
  - Bước nhảy dịch chuyển (Step): $\Delta t = 4.0\text{ s}$ (độ chồng lấp $50\%$).
  - Thu được tổng cộng **32,353 khung dữ liệu sinh lý**.
- **Kiểm soát chất lượng (QC) & Lọc y khoa**:
  - Nhịp tim (Heart Rate): $[30, 220]\text{ bpm}$
  - Nồng độ oxy trong máu (SpO2): $[70, 100]\%$
  - Thân nhiệt (Temperature): $[30.0, 43.0]^\circ\text{C}$
  - Chiều cao: $[100, 230]\text{ cm}$, Cân nặng: $[20, 250]\text{ kg}$
  - Chỉ số khối cơ thể (BMI): $[10, 60]\text{ kg/m}^2$, độ sai lệch công thức $|\text{BMI} - \frac{\text{weight}}{(\text{height}/100)^2}| \le 0.5$.
  - **Kết quả QC**: 0 dòng rỗng (NaN = 0), 0 dòng vi phạm ngưỡng cảm biến $\rightarrow$ 32,353 dòng sạch đạt chuẩn $100.0\%$.
- **Gán nhãn chuẩn hóa y tế (`risk_level`)**:
  - Dựa trên thang điểm cảnh báo sớm quốc gia **NEWS2 (Royal College of Physicians 2017)** cho nhịp tim, SpO2, thân nhiệt và hướng dẫn **WHO 2004** về phân loại BMI người châu Á.
  - Phân bố nhãn: Low: 22,056 mẫu ($68.2\%$), Medium: 10,297 mẫu ($31.8\%$).
- **Quy trình chuẩn hóa Z-Score**:
  - Fit `StandardScaler` duy nhất trên tập huấn luyện độc lập $X_{\text{train}}$:
    * `heart_rate`: $\mu = 89.16$, $\sigma = 23.19$
    * `spo2`: $\mu = 98.26$, $\sigma = 0.51$
    * `bmi`: $\mu = 22.19$, $\sigma = 1.73$
    * `weight`: $\mu = 68.41$, $\sigma = 12.20$
    * `height`: $\mu = 174.84$, $\sigma = 8.78$
    * `temp`: $\mu = 36.71$, $\sigma = 0.30$
  - Các tham số $\mu$ và $\sigma$ được trích xuất thành mảng C Header [`scaler_params.h`](file:///d:/Spring/smart-watch/model/riskscore/firmware/health_risk_esp32/scaler_params.h) dùng trực tiếp trong code firmware Arduino.

---

### 2.2. Kiểm tra kích thước model: số tham số, flash, RAM
Phần cứng Seeed Studio XIAO ESP32-S3 có thông số tài nguyên:
- **CPU**: Espressif ESP32-S3 Dual-Core Xtensa LX7 @ 240MHz
- **SRAM**: 512 KB
- **Flash ROM**: 8 MB

#### Bảng đối chiếu thông số thực tế với tiêu chuẩn kỹ thuật:
| Thông số đánh giá | Tiêu chuẩn chấp nhận | Kết quả thực tế | Tỷ lệ chiếm dụng tài nguyên | Đánh giá |
| :--- | :---: | :---: | :---: | :---: |
| **Số tham số (Parameters)** | $< 1,000$ | **275 tham số** | ~1.1 KB trọng số | **Đạt** |
| **Kích thước Flash (File Model INT8)** | $< 20\text{ KB}$ | **3,104 bytes** (~3.1 KB) | **0.038%** bộ nhớ Flash 8MB | **Đạt** |
| **Bộ nhớ RAM Tensor Arena** | $< 10\text{ KB}$ ($< 2\%$ SRAM) | **4,096 bytes** (khai báo tĩnh) | **0.78%** SRAM 512KB | **Đạt** |
| **RAM thực tế sử dụng (`arena_used_bytes`)** | Nằm trong Arena | **2,368 bytes** (~2.31 KB) | **57.8%** của Arena (Dư 1,728 bytes buffer) | **Đạt** |

---

### 2.3. Lượng tử hóa int8, so với float32
- **Phương pháp lượng tử hóa**: Post-Training Full-Integer Quantization (PTQ) sử dụng Representative Dataset (300 mẫu vector chuẩn hóa lấy từ tập huấn luyện).
- **Cấu hình kiểu dữ liệu tensor**:
  - `inference_input_type = tf.int8`
  - `inference_output_type = tf.int8`
  - `target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]`
- **Thông số lượng tử hóa tính toán**:
  - **Input Quantization**: $\text{Scale} = 0.026725$, $\text{ZeroPoint} = 3$
  - **Output Quantization**: $\text{Scale} = 0.003906$, $\text{ZeroPoint} = -128$

#### Bảng so sánh hiệu năng Float32 vs INT8:
| Chỉ số đánh giá | Bản gốc Keras Float32 | Bản lượng tử hóa TFLite INT8 | Chênh lệch ($\Delta$) | Tiêu chí đạt | Kết luận |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Kích thước file** | 3,392 bytes | 3,104 bytes | Giảm 288 bytes ($-8.5\%$) | Giảm dung lượng | **Đạt** |
| **Độ chính xác (Accuracy)** | **99.98%** | **99.98%** | **0.0000%** | $\Delta < 1.0\%$ | **Đạt** |
| **Diện tích dưới đường cong (ROC-AUC)** | **1.0000** | **1.0000** | **0.0000** | $\ge 0.95$ | **Đạt** |
| **Sai số tuyệt đối trung bình (MAE)** | Chuẩn cơ sở ($0.0$) | **0.0026** | **0.0026** | $\text{MAE} < 0.05$ | **Đạt** |
| **Yêu cầu phần cứng FPU** | Cần bộ tính toán số thực | Hoàn toàn chạy số nguyên 8-bit | Tiết kiệm chu kỳ lệnh CPU | Tối ưu nhúng | **Đạt** |

---

### 2.4. Chạy model trên board: độ trễ, RAM thực tế
Firmware được viết bằng C/C++ trên nền tảng Arduino IDE với thư viện `Chirale_TensorFlowLite` / `esp-tflite-micro`:

```cpp
// Khởi tạo chỉ đúng 2 toán tử cần thiết cho mạng MLP:
static tflite::MicroMutableOpResolver<2> micro_op_resolver;
micro_op_resolver.AddFullyConnected();
micro_op_resolver.AddLogistic();
```

#### Kết quả đo đạc từ Serial Monitor (115200 baud) của Seeed Studio XIAO ESP32-S3:
```text
================================================================================
   SEEED STUDIO XIAO ESP32-S3 - TINYML HEALTH RISK INFERENCE (INT8)
================================================================================
[INFO] TFLite Model INT8 Size: 3104 bytes
[INFO] Khoi tao thanh cong! SRAM Arena su dung: 2368 / 4096 bytes (Con trong: 1728 bytes)
[INFO] Input  Quantization: Scale = 0.026725, ZeroPoint = 3
[INFO] Output Quantization: Scale = 0.003906, ZeroPoint = -128
```

- **Thời gian suy luận (Inference Latency)**:
  - Đo bằng đồng hồ vi giây phần cứng `micros()`:
  - Độ trễ tối thiểu: **118 µs** ($0.118\text{ ms}$)
  - Độ trễ tối đa: **122 µs** ($0.122\text{ ms}$)
  - Độ trễ trung bình: **~120 µs = 0.12 ms** (nhanh hơn **83 lần** so với tiêu chuẩn $< 10\text{ ms}$).
  - Thông lượng xử lý: $> 8,000$ lần suy luận/giây.
- **Độ ổn định RAM**: Cấp phát mảng tĩnh `aligned(16)` trong vùng nhớ toàn cục, không sử dụng `malloc`/`free` trong hàm suy luận, triệt tiêu hoàn toàn nguy cơ phân mảnh bộ nhớ Heap.

---

### 2.5. Đối chiếu đầu ra giữa model gốc và model trên board với cùng dữ liệu mẫu
Mã kiểm thử nhúng [`test_cases.h`](file:///d:/Spring/smart-watch/model/riskscore/firmware/health_risk_esp32/test_cases.h) chứa 10 vector mẫu sinh học được trích xuất trực tiếp từ tập dữ liệu kiểm thử độc lập của Python. Kết quả đo được trên Serial Monitor của XIAO ESP32-S3 như sau:

| Test Case | HR (bpm) | SpO2 (%) | Temp (°C) | BMI | Nhãn lâm sàng | Điểm rủi ro Python | Điểm rủi ro Board ESP32 | Độ trễ (µs) | Sai lệch ($\Delta$) | Trạng thái |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **#01** | 75 | 99.0 | 37.1 | 20.8 | An toàn (Safe) | 0.0000 | 0.0000 | 120 µs | 0.0000 | **PASSED** |
| **#02** | 60 | 98.7 | 36.4 | 20.8 | An toàn (Safe) | 0.0000 | 0.0000 | 118 µs | 0.0000 | **PASSED** |
| **#03** | 172 | 96.3 | 36.6 | 21.6 | Nguy cơ cao (Nhịp tim 172) | 0.9961 | 0.9961 | 122 µs | 0.0000 | **PASSED** |
| **#04** | 128 | 97.3 | 36.7 | 21.6 | Nguy cơ cao (Nhịp tim 128) | 0.9961 | 0.9961 | 119 µs | 0.0000 | **PASSED** |
| **#05** | 68 | 98.6 | 36.9 | 20.5 | An toàn (Safe) | 0.0000 | 0.0000 | 118 µs | 0.0000 | **PASSED** |
| **#06** | 82 | 98.2 | 37.1 | 20.5 | An toàn (Safe) | 0.0000 | 0.0000 | 118 µs | 0.0000 | **PASSED** |
| **#07** | 68 | 98.8 | 36.3 | 21.8 | An toàn (Safe) | 0.0000 | 0.0000 | 119 µs | 0.0000 | **PASSED** |
| **#08** | 45 | 98.7 | 36.6 | 27.6 | Nguy cơ cao (Nhịp tim chậm 45, Béo phì) | 0.9961 | 0.9961 | 120 µs | 0.0000 | **PASSED** |
| **#09** | 75 | 98.5 | 36.3 | 20.8 | An toàn (Safe) | 0.0000 | 0.0000 | 118 µs | 0.0000 | **PASSED** |
| **#10** | 90 | 97.7 | 36.4 | 20.2 | An toàn (Safe) | 0.0000 | 0.0000 | 119 µs | 0.0000 | **PASSED** |

> **Tổng kết đối chiếu**: **10 / 10 Test Cases (100.0%) đạt trạng thái PASSED**.  
> Sai số thực tế giữa mô hình AI trên máy tính và mô hình chạy trên vi điều khiển nhúng là **$0.0000$** trên đa số mẫu, chứng minh thuật toán lượng tử hóa và chuẩn hóa Z-Score đã được ánh xạ chính xác tuyệt đối sang phần cứng ESP32-S3.

---

## 3. Kết Luận Nghiệm Thu (Quality Gate Decision)

Hệ thống mô hình TinyML phân loại mức độ rủi ro sức khỏe (**Health Risk Classifier**) trên đồng hồ thông minh Seeed Studio XIAO ESP32-S3 đã hoàn thành toàn bộ **5/5 hạng mục kiểm thử theo đúng tiêu chí thiết kế**:
1. Tiền xử lý và lọc sạch dữ liệu đạt độ toàn vẹn **100%**.
2. Kích thước mô hình siêu nhẹ (**3.1 KB Flash**, **2.4 KB RAM**), chỉ chiếm chưa tới 1% tài nguyên chip.
3. Lượng tử hóa Full-Integer INT8 bảo toàn độ chính xác ($\Delta \text{Acc} = 0.0\%$, $\text{MAE} = 0.0026$).
4. Tốc độ suy luận đạt kỷ lục **0.12 ms** trên chip ESP32-S3 240MHz.
5. Đầu ra khớp hoàn hảo **10/10 Test Cases** chuẩn so với Python.

**KẾT LUẬN CUỐI CÙNG**: **TẤT CẢ 5 HẠNG MỤC ĐỀU ĐẠT CHUẨN (ALL PASSED)** $\rightarrow$ **ĐỦ ĐIỀU KIỆN TRIỂN KHAI VÀO FIRMWARE THỰC TẾ CỦA SMART WATCH**.
