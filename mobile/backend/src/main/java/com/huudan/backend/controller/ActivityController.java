package com.huudan.backend.controller;

import com.huudan.backend.entity.Activity;
import com.huudan.backend.service.TelemetryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/activities")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ActivityController {

    private final TelemetryService telemetryService;

    @GetMapping("/records")
    public ResponseEntity<List<Activity>> getActivityRecords(
            @RequestParam(defaultValue = "XIAO-ESP32S3-PROWATCH-01") String deviceId,
            @RequestParam(defaultValue = "30") int limit) {
        return ResponseEntity.ok(telemetryService.getActivityRecords(deviceId, limit));
    }

    @PostMapping
    public ResponseEntity<Activity> ingestActivity(@RequestBody Activity activity) {
        Activity saved = telemetryService.ingestActivity(activity);
        log.info("Received manual activity upload: ID={}, Activity={}, Steps={}",
                saved.getId(), saved.getActivity(), saved.getSteps());
        return ResponseEntity.ok(saved);
    }
}

