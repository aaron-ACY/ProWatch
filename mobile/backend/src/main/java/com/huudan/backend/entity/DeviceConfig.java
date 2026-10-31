package com.huudan.backend.entity;

import lombok.*;

import java.time.Instant;

/**
 * Cấu hình tạm thời cho thiết bị (chạy in-memory, không lưu vào database)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeviceConfig {

    private String deviceId;
    private String watchFace; // "health", "sport", "cyber", "minimal"
    private Boolean alwaysOnDisplay;
    private Boolean raiseToWake;
    private Integer measurementIntervalMinutes;
    private Integer hrAlertHigh;
    private Integer hrAlertLow;
    private Integer spo2AlertLow;
    private Instant updatedAt;
}
