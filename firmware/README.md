# Hướng dẫn Nạp Firmware cho Seeed Studio XIAO ESP32-S3 (ProWatch Health)

Thư mục này chứa mã nguồn nhúng C++ hoàn chỉnh cho vi điều khiển chính của đồng hồ: **Seeed Studio XIAO ESP32-S3**.

---

## 1. Sơ đồ nối chân phần cứng (Hardware Pinout)

Seeed Studio XIAO ESP32-S3 có kích thước siêu nhỏ gọn (21 x 17.5 mm) tích hợp 2 nhân 240MHz, Bluetooth 5.0 (BLE) và Wi-Fi:

| Chân XIAO ESP32-S3 | Chức năng | Nối với linh kiện |
| :--- | :--- | :--- |
| **D4 (GPIO 5)** | I2C SDA | Chân SDA của cảm biến nhịp tim MAX30102 / Gyro MPU6050 |
| **D5 (GPIO 6)** | I2C SCL | Chân SCL của cảm biến nhịp tim MAX30102 / Gyro MPU6050 |
| **3V3** | Nguồn 3.3V | VCC cảm biến |
| **GND** | Mass | GND cảm biến |
| **A0 (GPIO 1)** | ADC Analog | Cầu phân áp đọc dung lượng Pin Li-Po (tùy chọn) |

---

## 2. Chuẩn bị môi trường nạp trên Arduino IDE

1. **Cài đặt Board ESP32**:
   - Mở Arduino IDE -> `File` -> `Preferences`
   - Thêm đường dẫn vào mục *Additional Boards Manager URLs*:
     ```text
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Vào `Tools` -> `Board` -> `Boards Manager...`, tìm `esp32` của **Espressif Systems** và bấm **Install** (khuyên dùng v2.0.14 trở lên).
2. **Chọn đúng Board**:
   - `Tools` -> `Board` -> `ESP32 Arduino` -> Chọn **XIAO_ESP32S3**.
   - `Tools` -> `USB CDC On Boot` -> Chọn **Enabled** (để in Serial ra màn hình máy tính).
3. **Cài đặt thư viện**:
   - `Sketch` -> `Include Library` -> `Manage Libraries...`
   - Cài đặt thư viện: **ArduinoJson** (phiên bản 6.x hoặc 7.x của Benoit Blanchon).
   - Cài đặt thư viện: **SparkFun MAX3010x Pulse and Proximity Sensor Library** (bởi SparkFun Electronics) để giao tiếp với cảm biến nhịp tim & SpO2 MAX30102.
   - (*Thư viện Wire, BLEDevice, WiFi, HTTPClient đã có sẵn trong gói ESP32 core*).

---

## 3. Cấu hình thông số và Nạp code

1. Mở file [`firmware/xiao_esp32s3_prowatch/xiao_esp32s3_prowatch.ino`](file:///d:/Spring/smart-watch/firmware/xiao_esp32s3_prowatch/xiao_esp32s3_prowatch.ino).
2. Sửa lại tên và mật khẩu Wi-Fi nhà bạn:
   ```cpp
   const char* WIFI_SSID     = "Ten_Wifi_Cua_Ban";
   const char* WIFI_PASSWORD = "Mat_Khau_Wifi";
   ```
3. Sửa IP máy tính chạy Backend Spring Boot:
   ```cpp
   // Xem IP máy tính bằng lệnh 'ipconfig' (ví dụ: 192.168.1.50)
   const char* BACKEND_URL   = "http://192.168.1.50:8080/api/v1/devices/telemetry";
   ```
4. Cắm cáp Type-C từ máy tính vào XIAO ESP32-S3, chọn đúng cổng COM và bấm **Upload**.

---

## 4. Cơ chế hoạt động Dual-Mode (Hybrid)

- **Chế độ BLE (Bluetooth Low Energy)**:
  - Đồng hồ phát tên quảng bá: `ProWatch-S3`.
  - Sử dụng dịch vụ chuẩn y tế Bluetooth SIG Heart Rate Service `0x180D` (Characteristic `0x2A37`) và Battery Service `0x180F`.
  - Bắn Notify trực tiếp cho App mỗi giây (độ trễ siêu thấp, tiết kiệm pin).
---
 
 ## 5. Xem Nhịp Tim và SpO2 trên Serial Monitor (Arduino IDE)
 
 1. Cắm vi điều khiển **XIAO ESP32-S3** vào máy tính qua cáp USB Type-C.
 2. Mở Arduino IDE -> chọn cổng COM tương ứng của bo mạch.
 3. Mở Serial Monitor: bấm biểu tượng kính lúp ở góc trên bên phải hoặc phím tắt `Ctrl + Shift + M`.
 4. Chọn tốc độ baud: **115200 baud**.
 5. Khi áp ngón tay nhẹ nhàng lên bề mặt cảm biến **MAX30102**:
    - Khi phát hiện một nhịp đập tim:
      ```text
      💓 [Beat] Nhịp đập phát hiện! BPM: 76 | SpO2: 98% (Tức thời: 75 BPM)
      ```
    - Bảng thông số sinh trắc học tổng hợp (cập nhật mỗi 1 giây):
      ```text
      ---------------------------------------------------------
      🩺 [MAX30102] KẾT QUẢ ĐO SINH TRẮC HỌC TRỰC TIẾP:
         ❤️  Nhịp tim (Heart Rate)   : 76 BPM
         🫁  Nồng độ Oxy máu (SpO2)   : 98 %
         📊  Tín hiệu IR / RED        : 84320 / 81210 (Tiếp xúc tốt)
         🏃  Hoạt động: REST | Bước chân: 6420 | Pin: 90%
      ---------------------------------------------------------
      ```
    - Khi nhấc ngón tay ra khỏi cảm biến:
      ```text
      👉 [MAX30102] Đang chờ ngón tay... (Tín hiệu IR: 1240 < 50000)
      ```


