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
public class HealthSummaryDto {
    private Integer currentBpm;
    private Integer currentSpO2;
    private Integer steps;
    private Integer stepsGoal;
    private Integer calories;
    private Double sleepHours;
    private Integer restingHr;
    private Integer maxHrToday;
    private Integer minHrToday;
    private Integer avgSpO2Today;
    private Integer battery;
    private Boolean isCharging;
    private Boolean isConnected;
    private String lastSync;
    private Instant lastHeartRateTime;
    private Instant lastSpo2Time;

    // AI Risk & Activity
    private Double riskScore;
    private String riskLevel;
    private String currentActivity;

    // Thống kê đo lường
    private Integer totalMeasurementsToday;
    private Long totalMeasurementsTotal;
}

