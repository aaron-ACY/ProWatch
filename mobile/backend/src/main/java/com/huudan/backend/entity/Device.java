package com.huudan.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "devices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", unique = true, nullable = false, length = 64)
    private String deviceId;

    @Column(name = "device_name", length = 100)
    private String deviceName;

    @Column(name = "mac_address", length = 32)
    private String macAddress;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "model", length = 50)
    private String model;

    @Column(name = "firmware_version", length = 32)
    private String firmwareVersion;

    @Column(name = "battery_level")
    private Integer batteryLevel;

    @Column(name = "is_charging")
    private Boolean isCharging;

    @Column(name = "connection_mode", length = 20)
    private String connectionMode; // "HYBRID", "WIFI", "BLE"

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "is_online")
    private Boolean isOnline;

    @Column(name = "last_heartbeat")
    private Instant lastHeartbeat;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (lastHeartbeat == null) {
            lastHeartbeat = Instant.now();
        }
        if (isOnline == null) {
            isOnline = true;
        }
        if (batteryLevel == null) {
            batteryLevel = 100;
        }
        if (isCharging == null) {
            isCharging = false;
        }
        if (model == null) {
            model = "XIAO-ESP32-S3";
        }
    }
}
