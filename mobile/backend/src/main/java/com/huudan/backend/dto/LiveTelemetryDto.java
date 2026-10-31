package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiveTelemetryDto {
    private String deviceId;
    private Integer heartRate;
    private Integer spo2;
    private Integer steps;
    private Integer calories;
    private String activity;
    private Double accelX;
    private Double accelY;
    private Double accelZ;
    private Double riskScore;
    private String riskLevel;
    private Integer battery;
    private Boolean isCharging;
    private Boolean isOnline;
    private String connectionMode;
    private Instant timestamp;
}
