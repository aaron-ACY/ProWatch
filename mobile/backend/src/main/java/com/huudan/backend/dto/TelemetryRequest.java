package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryRequest {
    private String deviceId;        // e.g. "XIAO-ESP32S3-01"
    private String macAddress;      // e.g. "F4:12:FA:86:B2:1A"
    private String userId;          // User ID or "guest_user"
    private Integer heartRate;      // BPM (e.g. 75)
    private Integer spo2;           // SpO2 percentage (e.g. 98)
    private Integer steps;          // Step count (e.g. 6420)
    private Integer calories;       // Active calories (e.g. 385)
    private Double accelX;          // MPU6050 Accel X (g or m/s^2)
    private Double accelY;          // MPU6050 Accel Y (g or m/s^2)
    private Double accelZ;          // MPU6050 Accel Z (g or m/s^2)
    private Integer battery;        // Battery percentage (0 - 100)
    private Boolean isCharging;     // Charging status
    private String connectionMode;  // "WIFI", "BLE", "HYBRID"
    private String firmwareVersion; // e.g. "v1.0.0-esp32s3"
    private String activity;        // e.g. "Đi bộ", "Chạy", "Đứng yên"
    private Double riskScore;       // AI Risk Score (0.0 to 1.0)
    private String riskLevel;       // "Low", "Medium", "High"
    private Long timestamp;         // Epoch timestamp (seconds) when measured offline
    private Long offlineSeq;        // Persistent sequence number for deduplication
}
