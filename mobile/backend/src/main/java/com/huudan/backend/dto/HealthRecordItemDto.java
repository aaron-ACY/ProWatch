package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthRecordItemDto {
    private String id;
    private String timestamp;
    private Integer bpm;
    private Integer percentage;
    private String status; // "resting" | "normal" | "elevated" | "optimal" | "low"
    private String activity;
}

