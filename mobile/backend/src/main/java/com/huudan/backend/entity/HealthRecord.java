package com.huudan.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "health_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HealthRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", length = 64)
    private String deviceId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "spo2")
    private Integer spo2;

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(name = "risk_level", length = 32)
    private String riskLevel;

    @Column(name = "offline_seq")
    private Long offlineSeq;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) {
            recordedAt = Instant.now();
        }
    }
}
