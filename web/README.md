# ProWatch Web Dashboard - AI & IoT Visualization Platform

Hệ thống Web Dashboard giám sát và trực quan hóa dữ liệu từ đồng hồ thông minh **XIAO ESP32-S3**, kết hợp cảm biến **MAX30102** (Nhịp tim, SpO₂) và **MPU6050** (Gia tốc & Vận tốc góc 6 trục), tích hợp tự động hóa qua **n8n** và huấn luyện mô hình Machine Learning qua **Python ML Service**.

---

## 1. Kiến trúc Tổng thể Hệ thống

```text
[XIAO ESP32-S3] 
  ├── Cảm biến MAX30102 (HR, SpO2)
  └── Cảm biến MPU6050 (Accel 3 trục, Gyro 3 trục)
         │ (Wi-Fi / REST API)
         ▼
[Supabase Database (PostgreSQL)] 
  ├── sensor_telemetry (Dữ liệu thời gian thực)
  ├── measurement_history (Lịch sử đo đạc)
  └── model_registry (Phiên bản mô hình & Metrics)
         │
         ├──◄── [n8n Automation Workflow] ──►── [Python ML Service (PyTorch / Scikit-learn)]
         │          (Điều phối kiểm tra & train)     (Huấn luyện HAR & Fall Detection)
         ▼
[Web Dashboard (React + Vite + TypeScript)]
  ├── Real-time Monitoring & AI Prediction (Phân loại hoạt động trực tiếp)
  ├── Data Visualization (Biểu đồ sinh lý + Gia tốc 3 trục)
  ├── Measurement History (Truy vấn & Xuất CSV)
  ├── n8n Pipeline Visualizer & Trigger Button
  └── Model Evaluation (Accuracy, Precision, Recall, F1-Score, Confusion Matrix)
```

---

## 2. Các chức năng trên Web Dashboard

1. **Real-time Monitoring & Inference**:
   - Hiển thị trực tiếp nhịp tim (BPM) & SpO₂ (%) từ cảm biến quang học MAX30102.
   - Hiển thị vector gia tốc 3 trục ($a_x, a_y, a_z$) và độ lớn gia tốc tổng hợp $\sqrt{a_x^2 + a_y^2 + a_z^2}$ từ MPU6050.
   - Hiển thị kết quả phân loại hành vi người dùng (Ngồi, Đi bộ, Chạy bộ, Nghỉ ngơi, Cảnh báo ngã) cùng độ tin cậy và độ trễ suy luận.

2. **Data Visualization**:
   - Biểu đồ sóng sinh lý học theo thời gian thực (Area Chart).
   - Biểu đồ dao động gia tốc 3 trục (Line Chart) phục vụ quan sát tính phân tách đặc trưng trước khi huấn luyện AI.

3. **Measurement History**:
   - Tìm kiếm, lọc theo thiết bị hoặc loại hoạt động.
   - Hỗ trợ xuất dữ liệu ra file `.csv` để phục vụ nghiên cứu hoặc gán nhãn thủ công.

4. **Tự động hóa n8n & MLOps**:
   - Nút **"Kích hoạt Huấn luyện qua n8n"** gọi trực tiếp Webhook của n8n.
   - Theo dõi 5 giai đoạn: Ingestion $\to$ Preprocessing (lọc nhiễu & windowing) $\to$ Python Training $\to$ Model Evaluation $\to$ Model Registry.
   - Nhật ký các lần thực thi n8n gần nhất.

5. **Đánh giá Mô hình AI (Model Evaluation)**:
   - Các chỉ số cốt lõi: **Accuracy, Precision, Recall, F1-Score, Loss / MAE**.
   - **Confusion Matrix** trực quan hóa khả năng phân loại nhầm giữa các hoạt động.
   - Bảng đăng ký phiên bản mô hình (Model Version Registry).

---

## 3. Hướng dẫn Cài đặt & Chạy Web Dashboard

### Yêu cầu:
- Node.js >= 18.x
- npm hoặc yarn / pnpm

### Các bước khởi chạy:
```bash
# 1. Chuyển vào thư mục web
cd d:/Spring/smart-watch/web

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Khởi chạy máy chủ phát triển
npm run dev
```

Dashboard sẽ chạy tại: `http://localhost:3000`

### Cấu hình biến môi trường (.env):
Tạo file `.env` tại thư mục `web/` nếu muốn kết nối thực tế tới n8n hoặc Supabase:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_N8N_WEBHOOK_URL=http://localhost:5678/webhook/trigger-training
VITE_PYTHON_ML_API_URL=http://localhost:8000/api/v1
```
*(Nếu chưa cấu hình URL thật, Web Dashboard sẽ tự động kích hoạt chế độ mô phỏng dữ liệu trực quan sinh động theo đúng chuỗi thời gian thực tế).*
