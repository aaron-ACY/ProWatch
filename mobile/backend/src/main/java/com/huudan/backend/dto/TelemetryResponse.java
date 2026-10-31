package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryResponse {
    private boolean success;
    private String message;
    private Instant serverTime;
    private String syncStatus;
    private String command;
    private Map<String, Object> deviceConfig;
}
