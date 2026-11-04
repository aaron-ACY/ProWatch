package com.huudan.backend.service;

import com.huudan.backend.dto.HealthStatisticsDto;
import com.huudan.backend.dto.HealthSummaryDto;
import com.huudan.backend.entity.Activity;
import com.huudan.backend.entity.Device;
import com.huudan.backend.entity.HealthRecord;
import com.huudan.backend.repository.ActivityRepository;
import com.huudan.backend.repository.DeviceRepository;
import com.huudan.backend.repository.HealthRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TelemetryServiceTest {

    @Mock
    private HealthRecordRepository healthRecordRepo;

    @Mock
    private ActivityRepository activityRepo;

    @Mock
    private DeviceRepository deviceRepo;

    @Mock
    private DeviceService deviceService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private TelemetryService telemetryService;

    private final String deviceId = "XIAO-ESP32S3-PROWATCH-01";

    @BeforeEach
    void setUp() {
    }

    @Test
    @DisplayName("Health Summary preserves latest biometric readings even when device is offline")
    void testGetHealthSummaryOfflinePreservesLatestValues() {
        Device device = Device.builder()
                .deviceId(deviceId)
                .isOnline(false)
                .lastHeartbeat(Instant.now().minusSeconds(100))
                .batteryLevel(85)
                .isCharging(false)
                .build();
        when(deviceRepo.findByDeviceId(deviceId)).thenReturn(Optional.of(device));

        HealthRecord hrRec = HealthRecord.builder()
                .id(1L)
                .deviceId(deviceId)
                .heartRate(72)
                .spo2(98)
                .riskScore(0.12)
                .riskLevel("Low")
                .recordedAt(Instant.now().minusSeconds(300))
                .build();
        when(healthRecordRepo.findByDeviceIdOrderByRecordedAtDesc(eq(deviceId), any(PageRequest.class)))
                .thenReturn(List.of(hrRec));

        Activity act = Activity.builder()
                .deviceId(deviceId)
                .activity("REST")
                .steps(5400)
                .calories(210.0)
                .build();
        when(activityRepo.findFirstByDeviceIdOrderByRecordedAtDesc(deviceId)).thenReturn(Optional.of(act));
        when(healthRecordRepo.countByDeviceIdAndRecordedAtBetween(eq(deviceId), any(), any())).thenReturn(5L);
        when(healthRecordRepo.countByDeviceId(deviceId)).thenReturn(24L);

        HealthSummaryDto summary = telemetryService.getHealthSummary(deviceId);

        assertNotNull(summary);
        assertFalse(summary.getIsConnected());
        assertEquals(72, summary.getCurrentBpm());
        assertEquals(98, summary.getCurrentSpO2());
        assertEquals(5400, summary.getSteps());
        assertEquals(210, summary.getCalories());
        assertEquals("Low", summary.getRiskLevel());
        assertEquals(0.12, summary.getRiskScore());
        assertEquals(5, summary.getTotalMeasurementsToday());
        assertEquals(24L, summary.getTotalMeasurementsTotal());
    }

    @Test
    @DisplayName("Health Statistics returns hasData=false and empty lists for fresh accounts")
    void testGetHealthStatisticsEmptyState() {
        when(healthRecordRepo.findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtAsc(eq(deviceId), any(), any()))
                .thenReturn(Collections.emptyList());
        when(healthRecordRepo.findByDeviceIdOrderByRecordedAtDesc(eq(deviceId), any(PageRequest.class)))
                .thenReturn(Collections.emptyList());

        HealthStatisticsDto stats = telemetryService.getHealthStatistics(deviceId, "today");

        assertNotNull(stats);
        assertEquals("today", stats.getTimeframe());
        assertEquals("hôm nay", stats.getPeriodText());
        assertFalse(stats.getHasData());
        assertEquals(0, stats.getAvgHr());
        assertEquals(0, stats.getHrCount());
        assertEquals(0, stats.getSpo2Count());
        assertTrue(stats.getHrPoints().isEmpty());
        assertTrue(stats.getSpo2Points().isEmpty());
    }

    @Test
    @DisplayName("Health Statistics correctly computes stats and points scaled to max 150 BPM")
    void testGetHealthStatisticsWithData() {
        Instant now = Instant.now();
        HealthRecord r1 = HealthRecord.builder().id(1L).deviceId(deviceId).heartRate(60).spo2(97).recordedAt(now.minusSeconds(3600)).build();
        HealthRecord r2 = HealthRecord.builder().id(2L).deviceId(deviceId).heartRate(90).spo2(99).recordedAt(now).build();

        when(healthRecordRepo.findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtAsc(eq(deviceId), any(), any()))
                .thenReturn(List.of(r1, r2));
        when(healthRecordRepo.findByDeviceIdOrderByRecordedAtDesc(eq(deviceId), any(PageRequest.class)))
                .thenReturn(List.of(r2, r1));

        HealthStatisticsDto stats = telemetryService.getHealthStatistics(deviceId, "today");

        assertNotNull(stats);
        assertTrue(stats.getHasData());
        assertEquals(75, stats.getAvgHr());
        assertEquals(60, stats.getMinHr());
        assertEquals(90, stats.getMaxHr());
        assertEquals(90, stats.getLatestHr());
        assertEquals(2, stats.getHrCount());
        assertEquals(2, stats.getHrPoints().size());

        // Verify no "Đo chủ động" tag in history items
        stats.getHrHistory().forEach(item -> assertNull(item.getActivity()));
    }
}

