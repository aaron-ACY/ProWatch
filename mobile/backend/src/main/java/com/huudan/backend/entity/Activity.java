package com.huudan.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "device_id", length = 64)
    private String deviceId;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "activity", length = 100)
    private String activity;

    @Column(name = "steps")
    private Integer steps;

    @Column(name = "calories")
    private Double calories;

    @Column(name = "accel_x")
    private Double accelX;

    @Column(name = "accel_y")
    private Double accelY;

    @Column(name = "accel_z")
    private Double accelZ;

    @Column(name = "offline_seq")
    private Long offlineSeq;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (recordedAt == null) {
            recordedAt = Instant.now();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (activity == null) {
            activity = "Đứng yên";
        }
        if (steps == null) {
            steps = 0;
        }
        if (calories == null) {
            calories = 0.0;
        }
    }
}

