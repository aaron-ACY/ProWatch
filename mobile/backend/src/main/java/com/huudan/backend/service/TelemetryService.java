package com.huudan.backend.service;

import com.huudan.backend.dto.HealthSummaryDto;
import com.huudan.backend.dto.LiveTelemetryDto;
import com.huudan.backend.dto.TelemetryRequest;
import com.huudan.backend.dto.TelemetryResponse;
import com.huudan.backend.entity.Activity;
import com.huudan.backend.entity.Device;
import com.huudan.backend.entity.DeviceConfig;
import com.huudan.backend.entity.HealthRecord;
import com.huudan.backend.repository.ActivityRepository;
import com.huudan.backend.repository.DeviceRepository;
import com.huudan.backend.repository.HealthRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TelemetryService {

    private final HealthRecordRepository healthRecordRepo;
    private final ActivityRepository activityRepo;
    private final DeviceRepository deviceRepo;
    private final DeviceService deviceService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public TelemetryResponse ingestTelemetry(TelemetryRequest req) {
        String deviceId = (req.getDeviceId() != null && !req.getDeviceId().isBlank())
                ? req.getDeviceId()
                : "XIAO-ESP32S3-PROWATCH-01";
        
        UUID userUuid = null;
        if (req.getUserId() != null && !req.getUserId().isBlank() && !"guest_user".equalsIgnoreCase(req.getUserId())) {
            try {
                userUuid = UUID.fromString(req.getUserId().trim());
            } catch (IllegalArgumentException e) {
                // Not a valid UUID, keep null for Supabase auth.users FK
            }
        }

        Instant now = Instant.now();
        Instant recordTime = (req.getTimestamp() != null && req.getTimestamp() > 1700000000L)
                ? Instant.ofEpochSecond(req.getTimestamp())
                : now;

        String seqTag = (req.getOfflineSeq() != null) ? " [Seq #" + req.getOfflineSeq() + "]" : "";
        if ((req.getTimestamp() != null && req.getTimestamp() > 1700000000L && req.getTimestamp() < now.getEpochSecond() - 30)
                || req.getOfflineSeq() != null) {
            log.info("📥 [OFFLINE SYNC{}] Nhận bản ghi đo Offline từ {}: Đo lúc={}, BPM={}, SpO2={}%",
                    seqTag, deviceId, recordTime, req.getHeartRate(), req.getSpo2());
            System.out.println("📥 [OFFLINE SYNC -> SUPABASE]" + seqTag + " Lưu bản ghi Offline từ " + deviceId 
                    + " -> Thời điểm đo: " + recordTime + " | BPM: " + req.getHeartRate() + " | SpO2: " + req.getSpo2() + "%");
        }

        // 1. Cập nhật trạng thái thiết bị Device (online, battery, charging)
        Optional<Device> devOpt = deviceRepo.findByDeviceId(deviceId);
        Device device = devOpt.orElseGet(() -> Device.builder()
                .deviceId(deviceId)
                .deviceName("XIAO ESP32-S3 Watch")
                .macAddress(req.getMacAddress())
                .model("XIAO-ESP32-S3")
                .createdAt(now)
                .build());

        device.setIsOnline(true);
        device.setLastHeartbeat(now);
        if (userUuid != null) device.setUserId(userUuid);
        if (req.getBattery() != null) device.setBatteryLevel(req.getBattery());
        if (req.getIsCharging() != null) device.setIsCharging(req.getIsCharging());
        if (req.getConnectionMode() != null) device.setConnectionMode(req.getConnectionMode());
        if (req.getFirmwareVersion() != null) device.setFirmwareVersion(req.getFirmwareVersion());
        deviceRepo.save(device);

        boolean isHealthDuplicate = false;
        Double computedRiskScore = req.getRiskScore();
        String computedRiskLevel = req.getRiskLevel();

        // 2. Lưu bản ghi sức khỏe vào bảng health_records (chỉ lưu nhịp tim & SpO2)
        boolean hasHealthData = (req.getHeartRate() != null && req.getHeartRate() > 0)
                || (req.getSpo2() != null && req.getSpo2() > 0);

        if (hasHealthData && computedRiskScore == null) {
            computedRiskScore = evaluateRiskScore(req.getHeartRate(), req.getSpo2());
            computedRiskLevel = mapRiskLevel(computedRiskScore);
        }

        if (hasHealthData) {
            if (req.getOfflineSeq() != null && healthRecordRepo.existsByDeviceIdAndOfflineSeq(deviceId, req.getOfflineSeq())) {
                log.info("⏩ [OFFLINE SYNC DEDUPLICATED] Bản ghi Seq #{} của {} đã tồn tại trên health_records, bỏ qua.",
                        req.getOfflineSeq(), deviceId);
                isHealthDuplicate = true;
            } else {
                HealthRecord record = HealthRecord.builder()
                        .deviceId(deviceId)
                        .userId(userUuid)
                        .heartRate(req.getHeartRate() != null && req.getHeartRate() > 0 ? req.getHeartRate() : null)
                        .spo2(req.getSpo2() != null && req.getSpo2() > 0 ? req.getSpo2() : null)
                        .riskScore(computedRiskScore)
                        .riskLevel(computedRiskLevel)
                        .offlineSeq(req.getOfflineSeq())
                        .recordedAt(recordTime)
                        .build();
                HealthRecord saved = healthRecordRepo.save(record);
                log.info("💾 [BACKEND SAVE HEALTH SUCCESS] Đã lưu HealthRecord ID={} (BPM={}, SpO2={}%, RiskScore={}, RiskLevel={})",
                        saved.getId(), saved.getHeartRate(), saved.getSpo2(), saved.getRiskScore(), saved.getRiskLevel());
            }
        }

        // 3. Lưu bản ghi vận động & cảm biến MPU6050 vào bảng activities
        boolean hasActivityData = (req.getSteps() != null && req.getSteps() > 0)
                || (req.getCalories() != null && req.getCalories() > 0)
                || (req.getAccelX() != null || req.getAccelY() != null || req.getAccelZ() != null)
                || (req.getActivity() != null && !req.getActivity().isBlank() && !"Tự động đo".equalsIgnoreCase(req.getActivity()) && !"Đo chủ động".equalsIgnoreCase(req.getActivity()));

        if (hasActivityData) {
            boolean isActivityDuplicate = req.getOfflineSeq() != null && activityRepo.existsByDeviceIdAndOfflineSeq(deviceId, req.getOfflineSeq());
            if (isActivityDuplicate) {
                log.info("⏩ [ACTIVITY DEDUPLICATED] Bản ghi Seq #{} của {} đã tồn tại trên activities, bỏ qua.",
                        req.getOfflineSeq(), deviceId);
            } else {
                Activity act = Activity.builder()
                        .deviceId(deviceId)
                        .userId(userUuid)
                        .activity(req.getActivity() != null && !req.getActivity().isBlank() ? req.getActivity() : "Đứng yên")
                        .steps(req.getSteps() != null ? req.getSteps() : 0)
                        .calories(req.getCalories() != null ? req.getCalories().doubleValue() : 0.0)
                        .accelX(req.getAccelX())
                        .accelY(req.getAccelY())
                        .accelZ(req.getAccelZ())
                        .offlineSeq(req.getOfflineSeq())
                        .recordedAt(recordTime)
                        .createdAt(now)
                        .build();
                Activity savedAct = activityRepo.save(act);
                log.info("🏃 [BACKEND SAVE ACTIVITY SUCCESS] Đã lưu Activity ID={} (Activity={}, Steps={}, Accel=[{}, {}, {}])",
                        savedAct.getId(), savedAct.getActivity(), savedAct.getSteps(),
                        savedAct.getAccelX(), savedAct.getAccelY(), savedAct.getAccelZ());
            }
        }

        // 4. Broadcast dữ liệu Real-time qua WebSocket cho App
        LiveTelemetryDto liveDto = LiveTelemetryDto.builder()
                .deviceId(deviceId)
                .heartRate(req.getHeartRate())
                .spo2(req.getSpo2())
                .steps(req.getSteps())
                .calories(req.getCalories())
                .activity(req.getActivity())
                .accelX(req.getAccelX())
                .accelY(req.getAccelY())
                .accelZ(req.getAccelZ())
                .riskScore(computedRiskScore)
                .riskLevel(computedRiskLevel)
                .battery(req.getBattery())
                .isCharging(req.getIsCharging())
                .isOnline(true)
                .connectionMode(req.getConnectionMode() != null ? req.getConnectionMode() : "WIFI")
                .timestamp(now)
                .build();

        try {
            messagingTemplate.convertAndSend("/topic/telemetry", liveDto);
            messagingTemplate.convertAndSend("/topic/device/" + deviceId, liveDto);
            log.debug("Broadcasted live telemetry for device {}: BPM={}, SpO2={}, Steps={}, AccelX={}",
                    deviceId, req.getHeartRate(), req.getSpo2(), req.getSteps(), req.getAccelX());
        } catch (Exception e) {
            log.warn("Failed to broadcast WebSocket telemetry: {}", e.getMessage());
        }

        // 5. Trả về Response kèm Config hiện tại và lệnh đo (nếu có) để ESP32 thực thi
        DeviceConfig cfg = deviceService.getOrCreateConfig(deviceId);
        Map<String, Object> configMap = new HashMap<>();
        configMap.put("watchFace", cfg.getWatchFace());
        configMap.put("intervalMinutes", cfg.getMeasurementIntervalMinutes());
        configMap.put("hrAlertHigh", cfg.getHrAlertHigh());
        configMap.put("hrAlertLow", cfg.getHrAlertLow());
        configMap.put("spo2AlertLow", cfg.getSpo2AlertLow());

        String pendingCmd = deviceService.pollCommand(deviceId);

        return TelemetryResponse.builder()
                .success(true)
                .message(isHealthDuplicate ? "Record deduplicated" : "Telemetry received and synced successfully")
                .serverTime(now)
                .syncStatus(isHealthDuplicate ? "DEDUPLICATED" : "OK")
                .command(pendingCmd)
                .deviceConfig(configMap)
                .build();
    }

    public List<HealthRecord> getHealthRecords(String deviceId, int limit) {
        return healthRecordRepo.findByDeviceIdOrderByRecordedAtDesc(deviceId, PageRequest.of(0, limit));
    }

    public List<Activity> getActivityRecords(String deviceId, int limit) {
        return activityRepo.findByDeviceIdOrderByRecordedAtDesc(deviceId, PageRequest.of(0, limit));
    }

    public Activity ingestActivity(Activity activity) {
        return activityRepo.save(activity);
    }

    @SuppressWarnings("null")
    public HealthSummaryDto getHealthSummary(String deviceId) {
        final String effectiveId = (deviceId == null || deviceId.isBlank() || "XIAO-ESP32S3-01".equals(deviceId))
                ? "XIAO-ESP32S3-PROWATCH-01"
                : deviceId;

        Optional<Device> devOpt = deviceRepo.findByDeviceId(effectiveId);
        boolean isConnected = devOpt.map(d -> Boolean.TRUE.equals(d.getIsOnline()) && 
                d.getLastHeartbeat() != null && 
                Instant.now().isBefore(d.getLastHeartbeat().plusSeconds(25))).orElse(false);

        List<HealthRecord> recentRecords = healthRecordRepo.findByDeviceIdOrderByRecordedAtDesc(effectiveId, PageRequest.of(0, 50));
        Optional<Activity> latestActivity = activityRepo.findFirstByDeviceIdOrderByRecordedAtDesc(effectiveId);

        Optional<HealthRecord> latestHrRecord = recentRecords.stream()
                .filter(r -> r.getHeartRate() != null && r.getHeartRate() > 0)
                .findFirst();

        Optional<HealthRecord> latestSpo2Record = recentRecords.stream()
                .filter(r -> r.getSpo2() != null && r.getSpo2() > 0)
                .findFirst();

        int maxHr = recentRecords.stream()
                .filter(r -> r.getHeartRate() != null && r.getHeartRate() > 0)
                .mapToInt(HealthRecord::getHeartRate)
                .max()
                .orElse(0);

        int minHr = recentRecords.stream()
                .filter(r -> r.getHeartRate() != null && r.getHeartRate() > 0)
                .mapToInt(HealthRecord::getHeartRate)
                .min()
                .orElse(0);

        int avgSpo2 = (int) Math.round(
                recentRecords.stream()
                        .filter(r -> r.getSpo2() != null && r.getSpo2() > 0)
                        .mapToInt(HealthRecord::getSpo2)
                        .average()
                        .orElse(0.0)
        );

        // Chỉ khi đồng hồ đang kết nối (online) mới trả về số đo trực tiếp; nếu không có bản ghi hoặc offline trả về null/0
        Integer currentBpm = isConnected ? latestHrRecord.map(HealthRecord::getHeartRate).orElse(null) : null;
        Integer currentSpo2 = isConnected ? latestSpo2Record.map(HealthRecord::getSpo2).orElse(null) : null;
        Integer steps = isConnected ? latestActivity.map(Activity::getSteps).orElse(0) : 0;
        Integer calories = isConnected ? latestActivity.map(a -> a.getCalories() != null ? a.getCalories().intValue() : 0).orElse(0) : 0;

        return HealthSummaryDto.builder()
                .currentBpm(currentBpm)
                .currentSpO2(currentSpo2)
                .steps(steps != null ? steps : 0)
                .stepsGoal(10000)
                .calories(calories != null ? calories : 0)
                .restingHr(minHr)
                .maxHrToday(maxHr)
                .minHrToday(minHr)
                .avgSpO2Today(avgSpo2)
                .battery(devOpt.map(Device::getBatteryLevel).orElse(0))
                .isCharging(devOpt.map(Device::getIsCharging).orElse(false))
                .isConnected(isConnected)
                .lastSync(devOpt.map(d -> d.getLastHeartbeat().toString()).orElse("Chưa đồng bộ"))
                .lastHeartRateTime(latestHrRecord.map(HealthRecord::getRecordedAt).orElse(null))
                .lastSpo2Time(latestSpo2Record.map(HealthRecord::getRecordedAt).orElse(null))
                .build();
    }

    /**
     * Đánh giá điểm rủi ro sức khỏe (0.0 đến 1.0) dựa trên quy tắc chuẩn hóa của mô hình
     */
    public Double evaluateRiskScore(Integer heartRate, Integer spo2) {
        if (heartRate == null && spo2 == null) return null;
        double hr = (heartRate != null && heartRate > 0) ? heartRate.doubleValue() : 75.0;
        double ox = (spo2 != null && spo2 > 0) ? spo2.doubleValue() : 98.0;

        // Mô hình dựa trên các chỉ số nguy cơ: HR > 105 hoặc < 50 BPM, SpO2 < 96%
        double score = 0.05;
        if (ox < 90.0) score += 0.80;
        else if (ox < 94.0) score += 0.50;
        else if (ox < 96.0) score += 0.25;

        if (hr > 130.0 || hr < 40.0) score += 0.60;
        else if (hr > 110.0 || hr < 50.0) score += 0.35;
        else if (hr > 100.0 || hr < 55.0) score += 0.15;

        double finalScore = Math.min(1.0, Math.max(0.0, score));
        return Math.round(finalScore * 100.0) / 100.0;
    }

    /**
     * Ánh xạ điểm rủi ro sang phân loại 3 mức: Low, Medium, High
     */
    public String mapRiskLevel(Double score) {
        if (score == null) return "Low";
        if (score >= 0.55) return "High";
        if (score >= 0.25) return "Medium";
        return "Low";
    }
}
