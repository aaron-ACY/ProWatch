# n8n Workflow Automation

Thư mục chứa cấu hình Docker và các workflow tự động hóa điều phối hệ thống ProWatch IoT.

## Các chức năng tự động hóa chính:
1. **Truy xuất dữ liệu định kỳ**: Lấy các bản ghi đo mới từ Supabase (bảng `sensor_telemetry`).
2. **Kiểm tra chất lượng dữ liệu (Data Quality)**: Lọc các mẫu nhiễu (SpO2 < 70%, nhịp tim bất thường > 220 hoặc âm), kiểm tra mất mẫu gia tốc MPU6050.
3. **Kích hoạt huấn luyện mô hình**: Gọi REST API sang `Python ML Service` (`POST /api/v1/train/har`).
4. **Cập nhật Model Registry**: Ghi lại chỉ số đánh giá (Accuracy, F1-Score, Loss) vào Supabase để Web Dashboard hiển thị.

## Khởi chạy n8n:
```bash
docker compose up -d
```
Giao diện quản trị n8n mở tại: `http://localhost:5678`
