package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private Integer restingHr;
    private Integer maxHrToday;
    private Integer minHrToday;
    private Integer avgSpO2Today;
    private Integer battery;
    private Boolean isCharging;
    private Boolean isConnected;
    private String lastSync;
    private java.time.Instant lastHeartRateTime;
    private java.time.Instant lastSpo2Time;
}
