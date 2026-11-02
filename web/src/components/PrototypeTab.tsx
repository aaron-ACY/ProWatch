'use client';

import React, { useState } from 'react';
import {
  RotateCw,
  Layers,
  Sparkles,
  Cpu,
  Activity,
  Zap,
  Radio,
  Sliders,
  RotateCcw,
  Eye,
  ShieldCheck,
  Box,
  HardDrive,
  MousePointerClick,
  Info,
} from 'lucide-react';
import { SensorTelemetry } from '../types/sensor';
import { AIPrediction } from '../types/ai';
import { Watch3DCanvas } from './watch3d/Watch3DCanvas';
import { CameraPreset, StrapColor, STRAP_COLORS, WatchFaceTheme } from './watch3d/types';
import { useLanguage } from '@/context/LanguageContext';

export interface PrototypeTabProps {
  telemetry: SensorTelemetry;
  history: Array<{
    time: string;
    heart_rate: number;
    spo2: number;
    accel_x: number;
    accel_y: number;
    accel_z: number;
    accel_magnitude: number;
    gyro_x: number;
    gyro_y: number;
    gyro_z: number;
  }>;
  prediction?: AIPrediction;
}

export type RealtimeTabProps = PrototypeTabProps;

// Technical Hardware Specifications for Interactive Component Explorer
export interface HardwareComponentData {
  id: string;
  name: string;
  shortName: string;
  category: string;
  categoryColor: string;
  chipset: string;
  recommendedPreset: CameraPreset;
  recommendedExplode?: number;
  specs: Array<{ label: string; value: string }>;
  description: string;
  firmwareRole: string;
  busInfo: string;
}

const HARDWARE_COMPONENTS_VI: Record<string, HardwareComponentData> = {
  display: {
    id: 'display',
    name: 'Màn hình IPS TFT 1.54" ST7789',
    shortName: 'Màn hình ST7789',
    category: 'HIỂN THỊ & GIAO DIỆN',
    categoryColor: '#2563eb',
    chipset: 'Sitronix ST7789V SPI Driver',
    recommendedPreset: 'FRONT',
    recommendedExplode: 0,
    specs: [
      { label: 'Độ phân giải', value: '240 × 240 pixels (RGB 65K màu)' },
      { label: 'Chuẩn giao tiếp', value: '4-Wire SPI (MOSI: D10, SCK: D8, CS: D7, DC: D3, RST: D2)' },
      { label: 'Tốc độ bus', value: '40 MHz SPI Clock (~50-60 FPS)' },
      { label: 'Tấm nền', value: 'IPS Anti-glare góc nhìn rộng 178°' },
      { label: 'Dòng tiêu thụ', value: '15mA - 35mA (Đèn nền PWM)' },
    ],
    description: 'Màn hình hiển thị trung tâm của ProWatch, kết xuất giao diện Pip-Boy 3000 (Vault-Tec CRT phosphor) thời gian thực và đồ thị BVP sóng nhịp tim với độ phản hồi tức thời.',
    firmwareRole: 'Giao tiếp DMA qua thư viện TFT_eSPI trên ESP32-S3, tối ưu bộ đệm dòng (line buffer) không gây trễ CPU khi vẽ hoạt cảnh nhân vật Vault-Boy.',
    busInfo: 'SPI Bus @ 40MHz • 5 chân GPIO kết nối Seeed Xiao ESP32-S3',
  },
  xiao: {
    id: 'xiao',
    name: 'Vi điều khiển Seeed XIAO ESP32-S3',
    shortName: 'Xiao ESP32-S3',
    category: 'XỬ LÝ TRUNG TÂM & TINYML',
    categoryColor: '#4f46e5',
    chipset: 'Espressif ESP32-S3 (Xtensa Dual-Core 240MHz)',
    recommendedPreset: 'PERSPECTIVE',
    recommendedExplode: 0.5,
    specs: [
      { label: 'CPU', value: 'Xtensa Dual-Core 32-bit LX7 @ 240 MHz' },
      { label: 'Bộ nhớ RAM', value: '512 KB SRAM + 8 MB PSRAM tích hợp' },
      { label: 'Bộ nhớ Flash', value: '8 MB SPI Flash (Lưu trữ Model AI)' },
      { label: 'Kết nối không dây', value: 'Wi-Fi 2.4 GHz + BLE 5.0 (100Hz)' },
      { label: 'Tăng tốc Vector', value: 'Tập lệnh Vector mở rộng cho TinyML' },
      { label: 'Kích thước bo', value: 'Siêu nhỏ 21 × 17.5 mm' },
    ],
    description: 'Bộ não trung tâm điều phối toàn bộ thiết bị ProWatch. Đảm nhiệm việc thu thập dữ liệu I2C từ 2 cảm biến, chạy mô hình TinyML MLP INT8 suy luận tư thế (HAR) và truyền dữ liệu qua BLE/Wi-Fi.',
    firmwareRole: 'Chạy FreeRTOS đa nhiệm (Task PPG 100Hz, Task IMU 50Hz, Task TinyML Inference 10Hz, Task Screen 30Hz) không gây nghẽn hàng đợi dữ liệu.',
    busInfo: 'Hạt nhân điều khiển I2C, SPI, ADC, Touch GPIO & Quản lý sạc pin LiPo',
  },
  max30102: {
    id: 'max30102',
    name: 'Cảm biến nhịp tim & SpO2 MAX30102',
    shortName: 'MAX30102 (PPG)',
    category: 'CẢM BIẾN SINH TRẮC HỌC',
    categoryColor: '#dc2626',
    chipset: 'Analog Devices / Maxim Integrated MAX30102',
    recommendedPreset: 'BACK_SENSOR',
    recommendedExplode: 0.35,
    specs: [
      { label: 'Nguyên lý đo', value: 'Quang thể tích PPG (Photoplethysmography)' },
      { label: 'Nguồn phát quang', value: 'LED Đỏ (660nm) & LED Hồng ngoại IR (880nm)' },
      { label: 'Bộ chuyển đổi ADC', value: '18-bit Sigma-Delta ADC tích hợp' },
      { label: 'Tần số lấy mẫu', value: '100 Hz (100 mẫu dữ liệu/giây)' },
      { label: 'Giao tiếp', value: 'I2C Bus (Địa chỉ 0x57 • Tốc độ 400 kHz)' },
      { label: 'Dòng tiêu thụ chờ', value: '0.7 µA (Chế độ tiết kiệm pin)' },
    ],
    description: 'Cảm biến tiếp xúc trực tiếp mặt lưng với cổ tay người dùng. Chiếu chùm tia đỏ và hồng ngoại xuyên qua mao mạch máu ngoại vi để thu nhận xung động dập của tim, tính toán biến thiên BVP, tần số tim (BPM) và nồng độ oxy SpO2.',
    firmwareRole: 'Đọc dữ liệu qua hàng đợi FIFO 32-sample, lọc nhiễu dải thông số (Bandpass Filter 0.5Hz - 5Hz) bằng phần mềm C++ trên ESP32-S3 trước khi tính toán đỉnh sóng tâm thu.',
    busInfo: 'I2C Bus chung (SDA: D4, SCL: D5) • Địa chỉ cố định 0x57',
  },
  mpu6050: {
    id: 'mpu6050',
    name: 'Cảm biến chuyển động 6 trục MPU-6050',
    shortName: 'MPU-6050 (IMU)',
    category: 'CẢM BIẾN QUÁN TÍNH',
    categoryColor: '#d97706',
    chipset: 'TDK InvenSense MPU-6050 MotionTracking',
    recommendedPreset: 'PERSPECTIVE',
    recommendedExplode: 0.65,
    specs: [
      { label: 'Gia tốc kế 3D', value: '3 Trục X/Y/Z (±2g / ±4g / ±8g / ±16g)' },
      { label: 'Con quay hồi chuyển', value: '3 Trục Roll/Pitch/Yaw (±250°/s đến ±2000°/s)' },
      { label: 'Xử lý phụ DMP', value: 'Digital Motion Processor nội vi tích hợp' },
      { label: 'Tần số lấy mẫu', value: '50 Hz (Chu kỳ lấy mẫu 20ms)' },
      { label: 'Giao tiếp', value: 'I2C Bus (Địa chỉ 0x68 • Tốc độ 400 kHz)' },
      { label: 'Bộ lọc tích hợp', value: 'Bộ lọc thông thấp kỹ thuật số (DLPF)' },
    ],
    description: 'Theo dõi chuyển động không gian 3 chiều của cổ tay người dùng. Dữ liệu gia tốc tổng hợp và góc nghiêng được dùng làm vector đầu vào 6 chiều cung cấp cho mô hình TinyML nhận diện hoạt động.',
    firmwareRole: 'Ngắt dữ liệu FIFO tự động kích hoạt đọc theo chu kỳ 20ms, đảm bảo chuỗi thời gian đều đặn cho cửa sổ trượt (Sliding Window) của bộ suy luận AI.',
    busInfo: 'I2C Bus chung (SDA: D4, SCL: D5) • Địa chỉ 0x68',
  },
  battery: {
    id: 'battery',
    name: 'Pin sạc LiPo 3.7V dung lượng cao',
    shortName: 'Pin LiPo 3.7V',
    category: 'NGUỒN ĐIỆN & QUẢN LÝ NĂNG LƯỢNG',
    categoryColor: '#059669',
    chipset: 'Lithium Polymer Cell 523450 / 601520',
    recommendedPreset: 'BACK_SENSOR',
    recommendedExplode: 0.4,
    specs: [
      { label: 'Điện áp danh định', value: '3.7 V (Sạc đầy 4.2V, ngắt 3.0V)' },
      { label: 'Dung lượng', value: '4000 mAh' },
      { label: 'Thời lượng sử dụng', value: '18 - 24 giờ liên tục' },
      { label: 'Mạch bảo vệ BMS', value: 'Chống quá nạp, xả sâu và ngắn mạch' },
      { label: 'Cơ chế sạc', value: 'Sạc qua cổng USB Type-C trên Xiao (350mA)' },
      { label: 'Kích thước', value: '34 × 50 × 5 mm' },
    ],
    description: 'Cung cấp nguồn năng lượng di động ổn định cho toàn bộ hệ thống ProWatch khi rời bàn làm việc. Tế bào pin thể rắn bọc màng nhôm bảo vệ cách điện Kapton giúp giảm thiểu độ dày và đảm bảo an toàn tuyệt đối khi đeo trên cổ tay.',
    firmwareRole: 'Đo điện áp pin qua cầu phân áp vào chân ADC của Xiao ESP32-S3, cảnh báo điện áp thấp trên giao diện Pip-Boy khi dưới 3.4V.',
    busInfo: 'Đấu nối trực tiếp vào pad BAT+ và BAT- trên mặt dưới Seeed Xiao',
  },
  copper_frame: {
    id: 'copper_frame',
    name: 'Khung ống đồng kép & Chốt chịu lực',
    shortName: 'Khung ống đồng',
    category: 'CƠ KHÍ CHỊU LỰC & TẢN NHIỆT',
    categoryColor: '#b45309',
    chipset: 'Hợp kim Đồng thau đánh bóng (Brass / Copper C3604)',
    recommendedPreset: 'SIDE',
    recommendedExplode: 0,
    specs: [
      { label: 'Đường kính ống', value: '2.4 mm đặc uốn định hình CNC' },
      { label: 'Khả năng chịu lực', value: 'Chịu lực kéo uốn > 150 N' },
      { label: 'Liên kết cơ khí', value: '4 Bu lông lục giác cố định 4 góc bo mạch' },
      { label: 'Hệ số dẫn nhiệt', value: '~115 W/m·K (Tản nhiệt thụ động)' },
      { label: 'Tương thích ngàm', value: 'Chuẩn dây đeo silicone 22 mm' },
    ],
    description: 'Khung xương chịu lực đặc trưng của ProWatch. Hai thanh ống đồng uốn cong hình chữ U liên kết mặt trước và mặt sau, vừa tạo vẻ đẹp cơ khí Steampunk độc đáo, vừa đóng vai trò tản nhiệt thụ động cho CPU và tạo điểm móc dây đeo chắc chắn.',
    firmwareRole: 'Cơ cấu chịu lực thụ động, bảo vệ các module điện tử khỏi ứng suất cơ học và tản nhiệt từ chip ESP32-S3.',
    busInfo: 'Khung kim loại tiếp địa thụ động chống tĩnh điện ESD',
  },
  touch_pads: {
    id: 'touch_pads',
    name: 'Cụm 3 phím cảm ứng điện dung',
    shortName: '3 Nút cảm ứng',
    category: 'GIAO TIẾP NGƯỜI - MÁY (HMI)',
    categoryColor: '#7c3aed',
    chipset: 'Nội vi ESP32-S3 Capacitive Touch Controller',
    recommendedPreset: 'FRONT',
    recommendedExplode: 0,
    specs: [
      { label: 'Cấu tạo tiếp điểm', value: '3 Lỗ khoan viền vàng hóa học ENIG' },
      { label: 'Phân bổ chức năng', value: 'Trái (Lùi) • Giữa (OK) • Phải (Tiến)' },
      { label: 'Chân tín hiệu', value: 'Touch GPIO 1, 2, 3 trên ESP32-S3' },
      { label: 'Nguyên lý', value: 'Cảm ứng điện dung phát hiện tụ điện ngón tay' },
      { label: 'Độ trễ phản hồi', value: '< 5ms với hiệu ứng nháy sáng 3D' },
    ],
    description: '3 vòng khuyên mạ vàng bố trí ở gờ dưới màn hình, cho phép chuyển đổi tức thì giữa 3 màn hình của Pip-Boy 3000: START (Mặt đồng hồ Vault-Boy), HEART (Đo PPG tim), DATA (Gia tốc & TinyML).',
    firmwareRole: 'Ngắt phần cứng Touch Interrupt gọi hàm chuyển trạng thái UI tức thời, cập nhật frame hiển thị trong vòng 5ms.',
    busInfo: 'GPIO 1, 2, 3 (Touch Chân 1, 2, 3) trên bo Seeed Xiao ESP32-S3',
  },
  power_switch: {
    id: 'power_switch',
    name: 'Công tắc gạt nguồn cơ học 3-Pin',
    shortName: 'Công tắc nguồn',
    category: 'ĐÓNG NGẮT NGUỒN VẬT LÝ',
    categoryColor: '#475569',
    chipset: 'Micro SPDT Slide Switch (3 Chân)',
    recommendedPreset: 'SIDE',
    recommendedExplode: 0.3,
    specs: [
      { label: 'Kiểu tiếp điểm', value: 'SPDT (1 Cực 2 Vị trí On / Off)' },
      { label: 'Tải định mức', value: 'DC 12V 0.5A (Điện trở < 30 mΩ)' },
      { label: 'Vị trí lắp', value: 'Cạnh phải đồng hồ, nhô ra ngoài 1.2mm' },
      { label: 'Dòng rò khi tắt', value: '0.00 µA (Ngắt vật lý hoàn toàn)' },
    ],
    description: 'Công tắc gạt vật lý giúp người dùng chủ động ngắt hoàn toàn nguồn điện khi không sử dụng, bảo toàn dung lượng pin tối đa.',
    firmwareRole: 'Khởi động nguồn tức thì khi gạt ON, firmware ESP32-S3 sẵn sàng trong 150ms.',
    busInfo: 'Nối tiếp đường nguồn dương VDD từ pin LiPo tới vi điều khiển',
  },
  straps: {
    id: 'straps',
    name: 'Dây đeo Silicone thể thao cao cấp',
    shortName: 'Dây đeo Silicone',
    category: 'CƠ THỂ HỌC & ĐEO BÁM',
    categoryColor: '#0284c7',
    chipset: 'Silicone y tế đàn hồi sinh học',
    recommendedPreset: 'PERSPECTIVE',
    recommendedExplode: 0,
    specs: [
      { label: 'Bản rộng', value: '22 mm tiêu chuẩn thể thao' },
      { label: 'Khóa cài', value: 'Khóa gài kim loại mạ đồng thau cổ điển' },
      { label: 'Độ đàn hồi', value: 'Shore A 60 (Lực ép ổn định tối ưu)' },
      { label: 'Màu tùy chọn', value: 'Obsidian, Midnight, Navy, Crimson' },
    ],
    description: 'Giữ cố định đồng hồ trên cổ tay người dùng. Lực ép đàn hồi được tính toán để cảm biến quang MAX30102 luôn áp sát biểu bì da, giảm tối đa nhiễu chuyển động.',
    firmwareRole: 'Tạo tiếp xúc cơ học ổn định để thuật toán PPG thu nhận sóng xung BVP đồng đều.',
    busInfo: 'Phụ kiện cơ khí luồn qua khung ống đồng kép',
  },
};

const HARDWARE_COMPONENTS_EN: Record<string, HardwareComponentData> = {
  display: {
    id: 'display',
    name: '1.54" IPS TFT ST7789 Display',
    shortName: 'ST7789 Display',
    category: 'DISPLAY & INTERFACE',
    categoryColor: '#2563eb',
    chipset: 'Sitronix ST7789V SPI Driver',
    recommendedPreset: 'FRONT',
    recommendedExplode: 0,
    specs: [
      { label: 'Resolution', value: '240 × 240 pixels (RGB 65K colors)' },
      { label: 'Interface Protocol', value: '4-Wire SPI (MOSI: D10, SCK: D8, CS: D7, DC: D3, RST: D2)' },
      { label: 'Bus Speed', value: '40 MHz SPI Clock (~50-60 FPS)' },
      { label: 'Display Panel', value: 'IPS Anti-glare 178° Wide Viewing Angle' },
      { label: 'Power Consumption', value: '15mA - 35mA (PWM Backlight)' },
    ],
    description: 'Primary interactive display for ProWatch, rendering the Pip-Boy 3000 (Vault-Tec CRT phosphor) interface in real-time alongside instantaneous BVP pulse waveform graphs.',
    firmwareRole: 'DMA transfer via TFT_eSPI library on ESP32-S3, optimized line buffer to eliminate CPU stalling during Vault-Boy animations.',
    busInfo: 'SPI Bus @ 40MHz • 5 GPIO pins connected to Seeed Xiao ESP32-S3',
  },
  xiao: {
    id: 'xiao',
    name: 'Seeed XIAO ESP32-S3 Microcontroller',
    shortName: 'Xiao ESP32-S3',
    category: 'CENTRAL PROCESSING & TINYML',
    categoryColor: '#4f46e5',
    chipset: 'Espressif ESP32-S3 (Xtensa Dual-Core 240MHz)',
    recommendedPreset: 'PERSPECTIVE',
    recommendedExplode: 0.5,
    specs: [
      { label: 'CPU', value: 'Xtensa Dual-Core 32-bit LX7 @ 240 MHz' },
      { label: 'RAM Memory', value: '512 KB SRAM + 8 MB integrated PSRAM' },
      { label: 'Flash Storage', value: '8 MB SPI Flash (AI Model Storage)' },
      { label: 'Wireless Connectivity', value: 'Wi-Fi 2.4 GHz + BLE 5.0 (100Hz)' },
      { label: 'Vector Acceleration', value: 'Extended Vector Instructions for TinyML' },
      { label: 'Board Dimensions', value: 'Ultra-compact 21 × 17.5 mm' },
    ],
    description: 'Central brain orchestrating the ProWatch device. Collects I2C sensor streams, runs TinyML MLP INT8 posture & human activity recognition (HAR), and streams telemetry via BLE/Wi-Fi.',
    firmwareRole: 'Runs FreeRTOS multitasking (PPG Task 100Hz, IMU Task 50Hz, TinyML Inference 10Hz, Screen Task 30Hz) without queue congestion.',
    busInfo: 'Controls I2C, SPI, ADC, Touch GPIO & LiPo battery charging management',
  },
  max30102: {
    id: 'max30102',
    name: 'MAX30102 Heart Rate & SpO2 Sensor',
    shortName: 'MAX30102 (PPG)',
    category: 'BIOMETRIC SENSORS',
    categoryColor: '#dc2626',
    chipset: 'Analog Devices / Maxim Integrated MAX30102',
    recommendedPreset: 'BACK_SENSOR',
    recommendedExplode: 0.35,
    specs: [
      { label: 'Measurement Principle', value: 'Photoplethysmography (PPG)' },
      { label: 'Optical Emitter', value: 'Red LED (660nm) & Infrared IR LED (880nm)' },
      { label: 'ADC Converter', value: 'Integrated 18-bit Sigma-Delta ADC' },
      { label: 'Sampling Rate', value: '100 Hz (100 samples/sec)' },
      { label: 'Communication', value: 'I2C Bus (Address 0x57 • Fast Mode 400 kHz)' },
      { label: 'Standby Current', value: '0.7 µA (Ultra-low power sleep)' },
    ],
    description: 'Direct wrist-contact biometric sensor. Transmits red and infrared light through capillary tissue to detect blood volume pulse (BVP), calculating heart rate (BPM) and blood oxygen saturation (SpO2).',
    firmwareRole: 'Pulls data through a 32-sample FIFO queue with 0.5Hz - 5Hz digital bandpass filtering in C++ on ESP32-S3 before systolic peak detection.',
    busInfo: 'Shared I2C Bus (SDA: D4, SCL: D5) • Fixed Address 0x57',
  },
  mpu6050: {
    id: 'mpu6050',
    name: 'MPU-6050 6-Axis Motion Tracking Sensor',
    shortName: 'MPU-6050 (IMU)',
    category: 'INERTIAL SENSORS',
    categoryColor: '#d97706',
    chipset: 'TDK InvenSense MPU-6050 MotionTracking',
    recommendedPreset: 'PERSPECTIVE',
    recommendedExplode: 0.65,
    specs: [
      { label: '3D Accelerometer', value: '3-Axis X/Y/Z (±2g / ±4g / ±8g / ±16g)' },
      { label: 'Gyroscope', value: '3-Axis Roll/Pitch/Yaw (±250°/s to ±2000°/s)' },
      { label: 'DMP Coprocessor', value: 'Integrated on-chip Digital Motion Processor' },
      { label: 'Sampling Rate', value: '50 Hz (20ms sampling period)' },
      { label: 'Communication', value: 'I2C Bus (Address 0x68 • Fast Mode 400 kHz)' },
      { label: 'Built-in Filter', value: 'Digital Low-Pass Filter (DLPF)' },
    ],
    description: 'Monitors 3D spatial wrist movement. Acceleration magnitude and tilt angles are formatted into a 6-dimensional input vector fed to the TinyML HAR classifier.',
    firmwareRole: 'Hardware FIFO interrupt fires every 20ms, guaranteeing uniform time-series data for the AI inference sliding window.',
    busInfo: 'Shared I2C Bus (SDA: D4, SCL: D5) • Address 0x68',
  },
  battery: {
    id: 'battery',
    name: 'High-Capacity 3.7V LiPo Rechargeable Battery',
    shortName: '3.7V LiPo Battery',
    category: 'POWER & ENERGY MANAGEMENT',
    categoryColor: '#059669',
    chipset: 'Lithium Polymer Cell 523450 / 601520',
    recommendedPreset: 'BACK_SENSOR',
    recommendedExplode: 0.4,
    specs: [
      { label: 'Nominal Voltage', value: '3.7 V (4.2V fully charged, 3.0V cutoff)' },
      { label: 'Capacity', value: '1000 mAh' },
      { label: 'Operating Runtime', value: '18 - 24 hours continuous' },
      { label: 'BMS Protection', value: 'Overcharge, deep discharge & short-circuit protection' },
      { label: 'Charging Method', value: 'USB Type-C port on Xiao board (350mA)' },
      { label: 'Dimensions', value: '34 × 50 × 5 mm' },
    ],
    description: 'Provides stable mobile power for ProWatch. Solid-state lithium pouch with Kapton insulation minimizes thickness while ensuring safe on-wrist wear.',
    firmwareRole: 'Voltage divider read by Xiao ESP32-S3 ADC pin triggers low-battery warnings on the Pip-Boy interface when falling below 3.4V.',
    busInfo: 'Directly soldered to BAT+ and BAT- solder pads beneath Seeed Xiao',
  },
  copper_frame: {
    id: 'copper_frame',
    name: 'Dual Brass Copper Frame & Load-Bearing Brackets',
    shortName: 'Dual Copper Frame',
    category: 'MECHANICAL CHASSIS & HEAT DISSIPATION',
    categoryColor: '#b45309',
    chipset: 'Polished Brass / Copper Alloy C3604',
    recommendedPreset: 'SIDE',
    recommendedExplode: 0,
    specs: [
      { label: 'Tube Diameter', value: '2.4 mm solid CNC precision bent' },
      { label: 'Tensile Strength', value: 'Tensile & bending load > 150 N' },
      { label: 'Mechanical Fastening', value: '4 Hex socket screws securing 4 corners' },
      { label: 'Thermal Conductivity', value: '~115 W/m·K (Passive CPU heatsink)' },
      { label: 'Strap Lug Standard', value: '22 mm standard watch lugs' },
    ],
    description: 'ProWatch signature structural backbone. Twin U-shaped polished brass rods bridge the front and rear chassis, combining Steampunk aesthetics with passive CPU heat dissipation.',
    firmwareRole: 'Passive structural protection shielding delicate electronic modules from mechanical stress while sinking heat from ESP32-S3.',
    busInfo: 'Chassis grounded for ESD passive electrostatic protection',
  },
  touch_pads: {
    id: 'touch_pads',
    name: 'Triple Capacitive Touch Navigation Pads',
    shortName: '3 Touch Pads',
    category: 'HUMAN-MACHINE INTERFACE (HMI)',
    categoryColor: '#7c3aed',
    chipset: 'ESP32-S3 Internal Capacitive Touch Controller',
    recommendedPreset: 'FRONT',
    recommendedExplode: 0,
    specs: [
      { label: 'Pad Architecture', value: '3 Gold-plated ENIG through-holes' },
      { label: 'Key Mapping', value: 'Left (Back) • Center (OK) • Right (Next)' },
      { label: 'Signal Pins', value: 'Touch GPIO 1, 2, 3 on ESP32-S3' },
      { label: 'Operating Principle', value: 'Capacitive touch sensing finger capacitance delta' },
      { label: 'Response Latency', value: '< 5ms with instant 3D highlight feedback' },
    ],
    description: '3 gold-rimmed contact rings beneath the display enable seamless cycling between Pip-Boy 3000 screens: START (Vault-Boy clock), HEART (PPG biometrics), DATA (IMU & TinyML).',
    firmwareRole: 'Touch hardware interrupts invoke instant UI state transitions, updating the display frame within 5ms.',
    busInfo: 'GPIO 1, 2, 3 (Touch Channels 1, 2, 3) on Seeed Xiao ESP32-S3',
  },
  power_switch: {
    id: 'power_switch',
    name: '3-Pin Mechanical SPDT Slide Power Switch',
    shortName: 'Power Switch',
    category: 'PHYSICAL POWER DISCONNECT',
    categoryColor: '#475569',
    chipset: 'Micro SPDT Slide Switch (3-Pin)',
    recommendedPreset: 'SIDE',
    recommendedExplode: 0.3,
    specs: [
      { label: 'Contact Type', value: 'SPDT (1 Pole 2 Throw On / Off)' },
      { label: 'Rated Load', value: 'DC 12V 0.5A (Contact resistance < 30 mΩ)' },
      { label: 'Mounting Position', value: 'Right chassis flank, protruding 1.2mm' },
      { label: 'Off Leakage Current', value: '0.00 µA (Complete galvanic disconnect)' },
    ],
    description: 'Tactile hardware slide switch allowing users to completely cut battery drain when not in use, preserving charge for months.',
    firmwareRole: 'Instant boot on slide ON, ESP32-S3 firmware ready within 150ms.',
    busInfo: 'In-line switch on positive VDD rail from LiPo battery to microcontroller',
  },
  straps: {
    id: 'straps',
    name: 'Premium Ergonomic Silicone Sports Strap',
    shortName: 'Silicone Strap',
    category: 'ERGONOMICS & WEARABLE RETENTION',
    categoryColor: '#0284c7',
    chipset: 'Bio-compatible elastic medical silicone',
    recommendedPreset: 'PERSPECTIVE',
    recommendedExplode: 0,
    specs: [
      { label: 'Strap Width', value: '22 mm standard sports lug' },
      { label: 'Buckle Hardware', value: 'Classic brass-plated stainless steel buckle' },
      { label: 'Elastic Durometer', value: 'Shore A 60 (Optimal retention tension)' },
      { label: 'Color Choices', value: 'Obsidian, Midnight, Navy, Crimson' },
    ],
    description: 'Secures the watch on user wrist. Calibrated elastic tension ensures the MAX30102 optical sensor remains flush against skin, minimizing motion artifacts.',
    firmwareRole: 'Maintains stable skin contact so PPG algorithms receive uniform blood volume pulse (BVP) waveforms.',
    busInfo: 'Mechanical accessory threaded through dual copper frame lugs',
  },
};

const getStrapColorName = (colorKey: StrapColor, lang: 'vi' | 'en') => {
  const names = {
    OBSIDIAN: lang === 'vi' ? 'Đen Obsidian' : 'Obsidian Black',
    TITANIUM: lang === 'vi' ? 'Xám Titan' : 'Titanium Gray',
    NAVY: lang === 'vi' ? 'Xanh Navy' : 'Navy Blue',
    CRIMSON: lang === 'vi' ? 'Đỏ Thể Thao' : 'Crimson Red',
  };
  return names[colorKey] || colorKey;
};

export const PrototypeTab: React.FC<PrototypeTabProps> = ({
  telemetry,
  prediction,
}) => {
  const { t, language } = useLanguage();
  const components = language === 'en' ? HARDWARE_COMPONENTS_EN : HARDWARE_COMPONENTS_VI;

  // 3D Watch Interactive States
  const [strapColor, setStrapColor] = useState<StrapColor>('OBSIDIAN');
  const watchFaceTheme: WatchFaceTheme = 'PIPBOY';
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [motionSync] = useState<boolean>(false);
  const [explodedProgress, setExplodedProgress] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('PERSPECTIVE');
  const [presetTrigger, setPresetTrigger] = useState<number>(0);

  // Interactive Component Explorer Selection State
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);

  // Reset to initial pristine state
  const handleReset = () => {
    setSelectedComponentId(null);
    setCameraPreset('PERSPECTIVE');
    setPresetTrigger(Date.now());
    setExplodedProgress(0);
    setAutoRotate(false);
  };

  // Select component handler - Updates selected component without overriding camera view or menus
  const handleSelectComponent = (id: string | null) => {
    setSelectedComponentId(id);
  };

  const activeComponent = selectedComponentId ? components[selectedComponentId] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

      {/* 1. Header Bar: System Title & Hardware Identity Pills */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        backgroundColor: '#ffffff',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '0.9rem 1.35rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            backgroundColor: '#eef2ff',
            border: '1px solid #c7d2fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4f46e5',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.08rem', fontWeight: 800, color: '#0f172a', letterSpacing: '0.3px' }}>
                {t('proto.title')}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {t('proto.subtitle')}
            </span>
          </div>
        </div>

      </div>

      {/* 2. Interactive Digital Twin & Component Explorer Studio (2-Column Responsive Layout) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.35fr) minmax(360px, 0.95fr)',
        gap: '1.25rem',
        alignItems: 'stretch',
        width: '100%',
      }}>

        {/* Column 1 (Left): 3D Studio Showcase Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}>
          {/* Top Control Bar: Camera Presets & Rotate 360 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.85rem',
          }}>
            {/* Camera Presets Segmented Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.2px' }}>
                {t('proto.view')}
              </span>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '3px',
                gap: '3px',
              }}>
                {(['PERSPECTIVE', 'FRONT', 'BACK_SENSOR', 'SIDE'] as CameraPreset[]).map((preset) => {
                  const labels: Record<CameraPreset, string> = {
                    PERSPECTIVE: t('proto.viewPerspective'),
                    FRONT: t('proto.viewFront'),
                    BACK_SENSOR: t('proto.viewBack'),
                    SIDE: t('proto.viewSide'),
                  };
                  const titles: Record<CameraPreset, string> = {
                    PERSPECTIVE: language === 'vi' ? 'Góc nhìn phối cảnh 3D (3/4)' : '3D Perspective View (3/4)',
                    FRONT: language === 'vi' ? 'Mặt trước (Màn hình TFT LCD 1.54")' : 'Front View (1.54" TFT LCD Display)',
                    BACK_SENSOR: language === 'vi' ? 'Mặt sau (Cảm biến quang học MAX30102)' : 'Rear Biometric Sensor (MAX30102)',
                    SIDE: language === 'vi' ? 'Cạnh bên (Khung ống đồng & Cổng sạc Type-C)' : 'Side Profile (Copper Frame & USB-C)',
                  };
                  const isSelected = cameraPreset === preset;
                  return (
                    <button
                      key={preset}
                      onClick={() => {
                        setCameraPreset(preset);
                        setPresetTrigger(Date.now());
                        setAutoRotate(false);
                      }}
                      title={titles[preset]}
                      style={{
                        padding: '0.38rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: isSelected ? '#ffffff' : 'transparent',
                        color: isSelected ? '#4f46e5' : '#64748b',
                        boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {labels[preset]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto Rotate Toggle */}
            <button
              onClick={() => setAutoRotate(!autoRotate)}
              title={language === 'vi' ? 'Bật/Tắt chế độ tự động xoay quanh đồng hồ 360 độ' : 'Toggle 360° Auto-Rotate'}
              style={{
                padding: '0.38rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: autoRotate ? 700 : 600,
                borderRadius: '8px',
                border: autoRotate ? '1px solid #38bdf8' : '1px solid #e2e8f0',
                backgroundColor: autoRotate ? '#f0f9ff' : '#ffffff',
                color: autoRotate ? '#0284c7' : '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <RotateCw size={13} style={{ transform: autoRotate ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }} />
              {t('proto.rotate360')}
            </button>
          </div>

          {/* 3D WebGL Canvas Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '560px',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <Watch3DCanvas
              telemetry={telemetry}
              prediction={prediction}
              strapColor={strapColor}
              watchFaceTheme={watchFaceTheme}
              autoRotate={autoRotate}
              motionSync={motionSync}
              explodedProgress={explodedProgress}
              cameraPreset={cameraPreset}
              presetTrigger={presetTrigger}
              selectedComponentId={selectedComponentId}
            />

            {/* Hint overlay on bottom left */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(6px)',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '0.7rem',
              color: '#475569',
              pointerEvents: 'none',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <MousePointerClick size={14} color="#4f46e5" />
              <span>{t('proto.canvasHint')}</span>
            </div>
          </div>

          {/* Bottom Customization Dock */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            alignItems: 'center',
            paddingTop: '0.85rem',
            borderTop: '1px solid #f1f5f9',
          }}>
            {/* 1. Exploded View Slider */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={14} color="#4f46e5" />
                  {t('proto.exploded')}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: '#4f46e5',
                  fontWeight: 800,
                  backgroundColor: '#eef2ff',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '6px',
                }}>
                  {Math.round(explodedProgress * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedProgress}
                onChange={(e) => {
                  setExplodedProgress(parseFloat(e.target.value));
                  if (parseFloat(e.target.value) > 0.05) {
                    setAutoRotate(false);
                  }
                }}
                style={{
                  width: '100%',
                  accentColor: '#4f46e5',
                  cursor: 'pointer',
                  height: '6px',
                }}
              />
            </div>

            {/* 2. Strap Color Selector */}
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 700 }}>
                  {t('proto.strapColor')}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 700, backgroundColor: '#eef2ff', padding: '0.1rem 0.5rem', borderRadius: '6px' }}>
                  {getStrapColorName(strapColor, language)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.65rem' }}>
                {(Object.keys(STRAP_COLORS) as StrapColor[]).map((colorKey) => {
                  const cfg = STRAP_COLORS[colorKey];
                  const isSelected = strapColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      onClick={() => setStrapColor(colorKey)}
                      title={getStrapColorName(colorKey, language)}
                      style={{
                        flex: 1,
                        height: '28px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                        backgroundColor: cfg.css,
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 0 2px rgba(79, 70, 229, 0.25)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2 (Right): Interactive Component Explorer Side Panel */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.25rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}>
          {/* Explorer Header with Reset Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.85rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#f5f3ff',
                border: '1px solid #ddd6fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
              }}>
                <Cpu size={16} />
              </div>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
                  {t('proto.detailHeader')}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {t('proto.detailSubtitle')}
                </span>
              </div>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              title={language === 'vi' ? 'Đặt lại trạng thái ban đầu: Bỏ chọn linh kiện, góc nhìn mặc định và đóng tách lớp' : 'Reset to default view: Deselect component, default camera and close exploded view'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.38rem 0.75rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#475569',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eef2ff';
                e.currentTarget.style.borderColor = '#c7d2fe';
                e.currentTarget.style.color = '#4f46e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#475569';
              }}
            >
              <RotateCcw size={13} />
              {language === 'vi' ? 'Đặt lại' : 'Reset'}
            </button>
          </div>

          {/* Quick Component Selection Pills Bar */}
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '0.45rem' }}>
              {t('proto.listHeader')}
            </div>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.4rem',
            }}>
              {Object.values(components).map((comp) => {
                const isSelected = selectedComponentId === comp.id;
                return (
                  <button
                    key={comp.id}
                    onClick={() => handleSelectComponent(isSelected ? null : comp.id)}
                    style={{
                      padding: '0.35rem 0.72rem',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eef2ff' : '#f8fafc',
                      color: isSelected ? '#4f46e5' : '#475569',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 3px rgba(79, 70, 229, 0.15)' : 'none',
                    }}
                  >
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isSelected ? '#4f46e5' : '#94a3b8',
                      display: 'inline-block',
                    }} />
                    {comp.shortName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Component Detail Card OR Empty State Guide */}
          {activeComponent ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.15rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              animation: 'fadeIn 0.2s ease-in-out',
            }}>
              {/* Component Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#0f172a' }}>
                    {activeComponent.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem' }}>
                    {activeComponent.chipset}
                  </div>
                </div>
              </div>

              {/* Functional Role Description */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.73rem',
                color: '#334155',
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Info size={14} color="#4f46e5" />
                  {language === 'vi' ? 'Vai trò & Chức năng trong ProWatch:' : 'Role & Function in ProWatch:'}
                </div>
                {activeComponent.description}
              </div>

              {/* Firmware & Hardware Integration */}
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.72rem',
                color: '#334155',
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Sliders size={14} color="#059669" />
                  {language === 'vi' ? 'Xử lý Firmware & Đường truyền:' : 'Firmware & Pipeline Integration:'}
                </div>
                {activeComponent.firmwareRole}
                <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed #e2e8f0', color: '#64748b', fontSize: '0.68rem', fontWeight: 600 }}>
                  🔌 {activeComponent.busInfo}
                </div>
              </div>

              {/* Hardware Specifications Table */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  {t('proto.specHeader')}
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                }}>
                  {activeComponent.specs.map((spec, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '0.38rem 0.65rem',
                        fontSize: '0.7rem',
                      }}
                    >
                      <span style={{ color: '#64748b', fontWeight: 600 }}>{spec.label}</span>
                      <strong style={{ color: '#0f172a', textAlign: 'right' }}>{spec.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Empty State: Explorer Overview */
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              backgroundColor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '1.25rem',
              height: '100%',
              justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#eef2ff',
                  border: '1px solid #c7d2fe',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4f46e5',
                  marginBottom: '0.65rem',
                }}>
                  <MousePointerClick size={22} />
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>
                  {t('proto.detailSubtitle')}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', lineHeight: 1.5, maxWidth: '340px', margin: '0 auto' }}>
                  {t('proto.emptyDetail')}
                </div>
              </div>

              {/* Mini Overview Cards of the 4 Subsystems */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.55rem',
                marginTop: '0.5rem',
              }}>
                <div
                  onClick={() => handleSelectComponent('xiao')}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#c7d2fe'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4f46e5', marginBottom: '0.2rem' }}>
                    {language === 'vi' ? 'VI ĐIỀU KHIỂN & AI' : 'MICROCONTROLLER & AI'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>
                    Xiao ESP32-S3 (240MHz)
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                    TinyML INT8 Inference
                  </div>
                </div>

                <div
                  onClick={() => handleSelectComponent('max30102')}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#fee2e2'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', marginBottom: '0.2rem' }}>
                    {language === 'vi' ? 'CẢM BIẾN PPG & IMU' : 'PPG & IMU SENSORS'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>
                    MAX30102 &amp; MPU6050
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                    I2C 400kHz Fast Mode
                  </div>
                </div>

                <div
                  onClick={() => handleSelectComponent('display')}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#bfdbfe'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2563eb', marginBottom: '0.2rem' }}>
                    {language === 'vi' ? 'MÀN HÌNH & GIAO DIỆN' : 'DISPLAY & INTERFACE'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>
                    1.54&quot; TFT ST7789 SPI
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                    UI Pip-Boy 3000 Vault-Tec
                  </div>
                </div>

                <div
                  onClick={() => handleSelectComponent('battery')}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#bbf7d0'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#059669', marginBottom: '0.2rem' }}>
                    {language === 'vi' ? 'NGUỒN & KHUNG CƠ KHÍ' : 'POWER & CHASSIS'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#334155', fontWeight: 600 }}>
                    {language === 'vi' ? 'LiPo 3.7V + Khung đồng' : 'LiPo 3.7V + Copper Frame'}
                  </div>
                  <div style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                    {language === 'vi' ? 'Pin 1000mAh, sạc Type-C' : '1000mAh Cell, USB-C Charge'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export const RealtimeTab = PrototypeTab;
