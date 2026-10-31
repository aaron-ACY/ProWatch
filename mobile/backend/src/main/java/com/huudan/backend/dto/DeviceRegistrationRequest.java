package com.huudan.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeviceRegistrationRequest {
    private String deviceId;
    private String deviceName;
    private String macAddress;
    private String userId;
    private String model;
    private String firmwareVersion;
    private String connectionMode;
    private String ipAddress;
}
