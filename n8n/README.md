# n8n Workflow Automation

Thư mục chứa cấu hình Docker và các workflow tự động hóa điều phối hệ thống ProWatch IoT.

## Các chức năng tự động hóa chính:
1. **Truy xuất dữ liệu định kỳ**: Lấy các bản ghi đo mới từ Supabase (bảng `sensor_telemetry`).
2. **Kiểm tra chất lượng dữ liệu (Data Quality)**: Lọc các mẫu nhiễu (SpO2 < 70%, nhịp tim bất thường > 220 hoặc âm), kiểm tra mất mẫu gia tốc MPU6050.
3. **Kích hoạt huấn luyện mô hình**: Gọi REST API sang `Python ML Service` (`POST /api/v1/train/har`).
4. **Cập nhật Model Registry**: Ghi lại chỉ số đánh giá (Accuracy, F1-Score, Loss) vào Supabase để Web Dashboard hiển thị.

## Khởi chạy n8n:
Từ thư mục gốc dự án:
```powershell
# Cách 1: Khởi động qua Docker Compose
cd n8n
docker compose up -d

# Hoặc khởi động nhanh container đã có sẵn
docker start n8n_prowatch
```
Giao diện quản trị n8n mở tại: `http://localhost:3636` (được map từ cổng 5678 bên trong container sang cổng 3636 của máy host).
