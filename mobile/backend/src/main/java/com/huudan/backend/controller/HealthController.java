package com.huudan.backend.controller;

import com.huudan.backend.dto.HealthStatisticsDto;
import com.huudan.backend.dto.HealthSummaryDto;
import com.huudan.backend.entity.HealthRecord;
import com.huudan.backend.service.TelemetryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HealthController {

    private final TelemetryService telemetryService;

    @GetMapping("/records")
    public ResponseEntity<List<HealthRecord>> getHealthRecords(
            @RequestParam(defaultValue = "XIAO-ESP32S3-PROWATCH-01") String deviceId,
            @RequestParam(defaultValue = "30") int limit) {
        return ResponseEntity.ok(telemetryService.getHealthRecords(deviceId, limit));
    }

    @GetMapping("/summary")
    public ResponseEntity<HealthSummaryDto> getHealthSummary(
            @RequestParam(defaultValue = "XIAO-ESP32S3-PROWATCH-01") String deviceId) {
        HealthSummaryDto summary = telemetryService.getHealthSummary(deviceId);
        log.debug("Health summary sync for device {}: BPM={}, SpO2={}", deviceId, summary.getCurrentBpm(), summary.getCurrentSpO2());
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/statistics")
    public ResponseEntity<HealthStatisticsDto> getHealthStatistics(
            @RequestParam(defaultValue = "XIAO-ESP32S3-PROWATCH-01") String deviceId,
            @RequestParam(defaultValue = "today") String timeframe) {
        HealthStatisticsDto stats = telemetryService.getHealthStatistics(deviceId, timeframe);
        log.debug("Health statistics sync for device {}: timeframe={}, hasData={}, avgHr={}", 
                deviceId, timeframe, stats.getHasData(), stats.getAvgHr());
        return ResponseEntity.ok(stats);
    }
}

