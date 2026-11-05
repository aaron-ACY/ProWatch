package com.huudan.backend.service;

import com.huudan.backend.dto.*;
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

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
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
        if ((req.getTimestamp() != null && req.getTimestamp() > 1700000000L
                && req.getTimestamp() < now.getEpochSecond() - 30)
                || req.getOfflineSeq() != null) {
            log.info("📥 [OFFLINE SYNC{}] Nhận bản ghi đo Offline từ {}: Đo lúc={}, BPM={}, SpO2={}%",
                    seqTag, deviceId, recordTime, req.getHeartRate(), req.getSpo2());
            System.out.println("📥 [OFFLINE SYNC -> SUPABASE]" + seqTag + " Lưu bản ghi Offline từ " + deviceId
                    + " -> Thời điểm đo: " + recordTime + " | BPM: " + req.getHeartRate() + " | SpO2: " + req.getSpo2()
                    + "%");
        }

        // 1. Cập nhật trạng thái thiết bị Device (online, battery, charging,
        // macAddress, firmware, ipAddress)
        Optional<Device> devOpt = deviceRepo.findByDeviceId(deviceId);
        Device device = devOpt.orElseGet(() -> Device.builder()
                .deviceId(deviceId)
                .deviceName("ProWatch-S3 (XIAO ESP32-S3)")
                .macAddress(req.getMacAddress() != null && !req.getMacAddress().isBlank() ? req.getMacAddress()
                        : "DC:54:75:E3:S3:01")
                .model("Seeed XIAO ESP32-S3")
                .firmwareVersion(req.getFirmwareVersion() != null && !req.getFirmwareVersion().isBlank()
                        ? req.getFirmwareVersion()
                        : "v1.5.3-max30102-no-offline")
                .batteryLevel(req.getBattery() != null ? req.getBattery() : 90)
                .isCharging(req.getIsCharging() != null ? req.getIsCharging() : false)
                .connectionMode(req.getConnectionMode() != null ? req.getConnectionMode() : "BLE")
                .ipAddress("BLE-GATT-DIRECT")
                .createdAt(now)
                .build());

        device.setIsOnline(true);
        device.setLastHeartbeat(now);
        if (device.getDeviceName() == null || device.getDeviceName().isBlank()) {
            device.setDeviceName("ProWatch-S3 (XIAO ESP32-S3)");
        }
        if (req.getMacAddress() != null && !req.getMacAddress().isBlank()) {
            device.setMacAddress(req.getMacAddress());
        } else if (device.getMacAddress() == null || device.getMacAddress().isBlank()) {
            device.setMacAddress("DC:54:75:E3:S3:01");
        }
        if (userUuid != null)
            device.setUserId(userUuid);
        if (device.getModel() == null || device.getModel().isBlank()) {
            device.setModel("Seeed XIAO ESP32-S3");
        }
        if (req.getBattery() != null) {
            device.setBatteryLevel(req.getBattery());
        } else if (device.getBatteryLevel() == null) {
            device.setBatteryLevel(90);
        }
        if (req.getIsCharging() != null) {
            device.setIsCharging(req.getIsCharging());
        } else if (device.getIsCharging() == null) {
            device.setIsCharging(false);
        }
        if (req.getConnectionMode() != null && !req.getConnectionMode().isBlank()) {
            device.setConnectionMode(req.getConnectionMode());
        } else if (device.getConnectionMode() == null || device.getConnectionMode().isBlank()) {
            device.setConnectionMode("BLE");
        }
        if (req.getFirmwareVersion() != null && !req.getFirmwareVersion().isBlank()) {
            device.setFirmwareVersion(req.getFirmwareVersion());
        } else if (device.getFirmwareVersion() == null || device.getFirmwareVersion().isBlank()) {
            device.setFirmwareVersion("v1.5.3-max30102-no-offline");
        }
        if (device.getIpAddress() == null || device.getIpAddress().isBlank()) {
            device.setIpAddress("BLE-GATT-DIRECT");
        }
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

        Long effectiveSeq = (req.getOfflineSeq() != null && req.getOfflineSeq() > 0)
                ? req.getOfflineSeq()
                : recordTime.getEpochSecond();

        if (hasHealthData) {
            if (healthRecordRepo.existsByDeviceIdAndOfflineSeq(deviceId, effectiveSeq)) {
                log.info("⏩ [OFFLINE SYNC DEDUPLICATED] Bản ghi Seq #{} của {} đã tồn tại trên health_records, bỏ qua.",
                        effectiveSeq, deviceId);
                isHealthDuplicate = true;
            } else {
                HealthRecord record = HealthRecord.builder()
                        .deviceId(deviceId)
                        .userId(userUuid)
                        .heartRate(req.getHeartRate() != null && req.getHeartRate() > 0 ? req.getHeartRate() : null)
                        .spo2(req.getSpo2() != null && req.getSpo2() > 0 ? req.getSpo2() : null)
                        .riskScore(computedRiskScore)
                        .riskLevel(computedRiskLevel)
                        .offlineSeq(effectiveSeq)
                        .recordedAt(recordTime)
                        .build();
                HealthRecord saved = healthRecordRepo.save(record);
                log.info(
                        "💾 [BACKEND SAVE HEALTH SUCCESS] Đã lưu HealthRecord ID={} (Seq=#{} | BPM={}, SpO2={}%, RiskScore={}, RiskLevel={})",
                        saved.getId(), saved.getOfflineSeq(), saved.getHeartRate(), saved.getSpo2(),
                        saved.getRiskScore(), saved.getRiskLevel());
            }
        }

        // 3. Lưu bản ghi vận động & cảm biến MPU6050 vào bảng activities
        boolean hasActivityData = (req.getSteps() != null && req.getSteps() > 0)
                || (req.getCalories() != null && req.getCalories() > 0)
                || (req.getAccelX() != null || req.getAccelY() != null || req.getAccelZ() != null)
                || (req.getActivity() != null && !req.getActivity().isBlank()
                        && !"Tự động đo".equalsIgnoreCase(req.getActivity())
                        && !"Chưa có dữ liệu".equalsIgnoreCase(req.getActivity()));

        if (hasActivityData) {
            boolean isActivityDuplicate = activityRepo.existsByDeviceIdAndOfflineSeq(deviceId, effectiveSeq);
            if (isActivityDuplicate) {
                log.info("⏩ [ACTIVITY DEDUPLICATED] Bản ghi Seq #{} của {} đã tồn tại trên activities, bỏ qua.",
                        effectiveSeq, deviceId);
            } else {
                Activity act = Activity.builder()
                        .deviceId(deviceId)
                        .userId(userUuid)
                        .activity(req.getActivity() != null && !req.getActivity().isBlank() ? req.getActivity()
                                : "Đứng yên")
                        .steps(req.getSteps() != null ? req.getSteps() : 0)
                        .calories(req.getCalories() != null ? req.getCalories().doubleValue() : 0.0)
                        .accelX(req.getAccelX())
                        .accelY(req.getAccelY())
                        .accelZ(req.getAccelZ())
                        .offlineSeq(effectiveSeq)
                        .recordedAt(recordTime)
                        .createdAt(now)
                        .build();
                Activity savedAct = activityRepo.save(act);
                log.info(
                        "🏃 [BACKEND SAVE ACTIVITY SUCCESS] Đã lưu Activity ID={} (Activity={}, Steps={}, Accel=[{}, {}, {}])",
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

    private UUID parseUserUuid(String userId) {
        if (userId != null && !userId.isBlank() && !"guest_user".equalsIgnoreCase(userId)) {
            try {
                return UUID.fromString(userId.trim());
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        return null;
    }

    public List<HealthRecord> getHealthRecords(String deviceId, int limit) {
        return getHealthRecords(deviceId, null, limit);
    }

    public List<HealthRecord> getHealthRecords(String deviceId, String userId, int limit) {
        UUID uid = parseUserUuid(userId);
        if (uid != null) {
            return healthRecordRepo.findByUserIdOrderByRecordedAtDesc(uid, PageRequest.of(0, limit));
        }
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
        return getHealthSummary(deviceId, null);
    }

    @SuppressWarnings("null")
    public HealthSummaryDto getHealthSummary(String deviceId, String userId) {
        final String effectiveId = (deviceId == null || deviceId.isBlank() || "XIAO-ESP32S3-01".equals(deviceId))
                ? "XIAO-ESP32S3-PROWATCH-01"
                : deviceId;

        UUID uid = parseUserUuid(userId);

        Optional<Device> devOpt = deviceRepo.findByDeviceId(effectiveId);
        boolean isConnected = devOpt.map(d -> Boolean.TRUE.equals(d.getIsOnline()) &&
                d.getLastHeartbeat() != null &&
                Instant.now().isBefore(d.getLastHeartbeat().plusSeconds(25))).orElse(false);

        List<HealthRecord> recentRecords;
        Optional<Activity> latestActivity;

        if (uid != null) {
            recentRecords = healthRecordRepo.findByUserIdOrderByRecordedAtDesc(uid, PageRequest.of(0, 50));
            latestActivity = activityRepo.findFirstByUserIdOrderByRecordedAtDesc(uid);
        } else {
            recentRecords = Collections.emptyList();
            latestActivity = Optional.empty();
        }

        // BẢO VỆ NGƯỜI DÙNG MỚI ĐĂNG KÝ HOẶC CHƯA XÁC THỰC USER_ID: Nếu chưa có số đo
        // nào của chính user đó, trả về trạng thái trắng (0 / null)
        if (recentRecords.isEmpty() && latestActivity.isEmpty()) {
            return HealthSummaryDto.builder()
                    .currentBpm(null)
                    .currentSpO2(null)
                    .steps(0)
                    .stepsGoal(10000)
                    .calories(0)
                    .sleepHours(0.0)
                    .restingHr(0)
                    .maxHrToday(0)
                    .minHrToday(0)
                    .avgSpO2Today(0)
                    .battery(devOpt.map(Device::getBatteryLevel).orElse(0))
                    .isCharging(devOpt.map(Device::getIsCharging).orElse(false))
                    .isConnected(isConnected)
                    .lastSync("Chưa có dữ liệu")
                    .riskScore(null)
                    .riskLevel(null)
                    .currentActivity("Chưa có dữ liệu")
                    .totalMeasurementsToday(0)
                    .totalMeasurementsTotal(0L)
                    .build();
        }

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
                        .orElse(0.0));

        // Luôn bảo lưu số đo gần nhất của người dùng ngay cả khi đồng hồ tạm thời ngắt
        // kết nối
        Integer currentBpm = latestHrRecord.map(HealthRecord::getHeartRate).orElse(null);
        Integer currentSpo2 = latestSpo2Record.map(HealthRecord::getSpo2).orElse(null);
        Integer steps = latestActivity.map(Activity::getSteps).orElse(0);
        Integer calories = latestActivity.map(a -> a.getCalories() != null ? a.getCalories().intValue() : 0).orElse(0);
        String currentActivity = latestActivity.map(Activity::getActivity).filter(a -> a != null && !a.isBlank())
                .orElse(recentRecords.isEmpty() ? "Chưa có dữ liệu" : "REST");

        // Đánh giá điểm rủi ro AI từ bản ghi hoặc tính toán trực tiếp
        Double riskScore = recentRecords.stream()
                .filter(r -> r.getRiskScore() != null)
                .map(HealthRecord::getRiskScore)
                .findFirst()
                .orElseGet(() -> evaluateRiskScore(currentBpm, currentSpo2));

        String riskLevel = recentRecords.stream()
                .filter(r -> r.getRiskLevel() != null && !r.getRiskLevel().isBlank())
                .map(HealthRecord::getRiskLevel)
                .findFirst()
                .orElseGet(() -> mapRiskLevel(riskScore));

        Instant startOfDay = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
        int totalToday = (uid != null)
                ? (int) healthRecordRepo.countByUserIdAndRecordedAtBetween(uid, startOfDay, Instant.now())
                : (int) healthRecordRepo.countByDeviceIdAndRecordedAtBetween(effectiveId, startOfDay, Instant.now());
        long totalAll = (uid != null)
                ? healthRecordRepo.countByUserId(uid)
                : healthRecordRepo.countByDeviceId(effectiveId);

        return HealthSummaryDto.builder()
                .currentBpm(currentBpm)
                .currentSpO2(currentSpo2)
                .steps(steps != null ? steps : 0)
                .stepsGoal(10000)
                .calories(calories != null ? calories : 0)
                .sleepHours(recentRecords.isEmpty() ? 0.0 : 7.5)
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
                .riskScore(riskScore)
                .riskLevel(riskLevel)
                .currentActivity(currentActivity)
                .totalMeasurementsToday(totalToday)
                .totalMeasurementsTotal(totalAll)
                .build();
    }

    /**
     * Lấy dữ liệu thống kê Ngày / Tuần / Tháng đồng bộ hoàn toàn với logic hiển thị
     * đồ thị của App
     */
    public HealthStatisticsDto getHealthStatistics(String deviceId, String timeframe) {
        return getHealthStatistics(deviceId, timeframe, null);
    }

    public HealthStatisticsDto getHealthStatistics(String deviceId, String timeframe, String userId) {
        final String effectiveId = (deviceId == null || deviceId.isBlank() || "XIAO-ESP32S3-01".equals(deviceId))
                ? "XIAO-ESP32S3-PROWATCH-01"
                : deviceId;

        UUID uid = parseUserUuid(userId);

        String tf = (timeframe == null || timeframe.isBlank()) ? "today" : timeframe.toLowerCase();
        Instant now = Instant.now();
        Instant start;
        String periodText;

        if ("week".equals(tf)) {
            start = now.minus(Duration.ofDays(7));
            periodText = "tuần này";
        } else if ("month".equals(tf)) {
            start = now.minus(Duration.ofDays(30));
            periodText = "tháng này";
        } else {
            tf = "today";
            start = LocalDate.now().atStartOfDay(ZoneId.systemDefault()).toInstant();
            periodText = "hôm nay";
        }

        List<HealthRecord> periodRecords;
        List<HealthRecord> allRecent;

        if (uid != null) {
            periodRecords = healthRecordRepo.findByUserIdAndRecordedAtBetweenOrderByRecordedAtAsc(uid, start, now);
            allRecent = healthRecordRepo.findByUserIdOrderByRecordedAtDesc(uid, PageRequest.of(0, 50));
            if (allRecent.isEmpty()) {
                return HealthStatisticsDto.builder()
                        .timeframe(tf)
                        .periodText(periodText)
                        .hasData(false)
                        .avgHr(0)
                        .minHr(0)
                        .maxHr(0)
                        .latestHr(0)
                        .latestHrTime("")
                        .hrCount(0)
                        .hrPoints(java.util.Collections.emptyList())
                        .avgSpo2(0)
                        .minSpo2(0)
                        .maxSpo2(0)
                        .latestSpo2(0)
                        .latestSpo2Time("")
                        .spo2Count(0)
                        .spo2Points(java.util.Collections.emptyList())
                        .hrHistory(java.util.Collections.emptyList())
                        .spo2History(java.util.Collections.emptyList())
                        .build();
            }
        } else {
            periodRecords = healthRecordRepo.findByDeviceIdAndRecordedAtBetweenOrderByRecordedAtAsc(effectiveId, start,
                    now);
            allRecent = healthRecordRepo.findByDeviceIdOrderByRecordedAtDesc(effectiveId, PageRequest.of(0, 50));
        }

        boolean hasData = !allRecent.isEmpty();

        // Thống kê Nhịp tim
        List<HealthRecord> hrRecords = periodRecords.stream()
                .filter(r -> r.getHeartRate() != null && r.getHeartRate() > 0)
                .toList();

        int avgHr = (int) Math.round(hrRecords.stream().mapToInt(HealthRecord::getHeartRate).average().orElse(0.0));
        int minHr = hrRecords.stream().mapToInt(HealthRecord::getHeartRate).min().orElse(0);
        int maxHr = hrRecords.stream().mapToInt(HealthRecord::getHeartRate).max().orElse(0);

        HealthRecord latestHrRec = !hrRecords.isEmpty() ? hrRecords.get(hrRecords.size() - 1) : null;
        if (latestHrRec == null && !allRecent.isEmpty()) {
            latestHrRec = allRecent.stream().filter(r -> r.getHeartRate() != null && r.getHeartRate() > 0).findFirst()
                    .orElse(null);
        }
        Integer latestHr = latestHrRec != null ? latestHrRec.getHeartRate() : 0;
        String latestHrTime = latestHrRec != null ? formatTime(latestHrRec.getRecordedAt()) : "";

        // Thống kê SpO2
        List<HealthRecord> spo2Records = periodRecords.stream()
                .filter(r -> r.getSpo2() != null && r.getSpo2() > 0)
                .toList();

        int avgSpo2 = (int) Math.round(spo2Records.stream().mapToInt(HealthRecord::getSpo2).average().orElse(0.0));
        int minSpo2 = spo2Records.stream().mapToInt(HealthRecord::getSpo2).min().orElse(0);
        int maxSpo2 = spo2Records.stream().mapToInt(HealthRecord::getSpo2).max().orElse(0);

        HealthRecord latestSpo2Rec = !spo2Records.isEmpty() ? spo2Records.get(spo2Records.size() - 1) : null;
        if (latestSpo2Rec == null && !allRecent.isEmpty()) {
            latestSpo2Rec = allRecent.stream().filter(r -> r.getSpo2() != null && r.getSpo2() > 0).findFirst()
                    .orElse(null);
        }
        Integer latestSpo2 = latestSpo2Rec != null ? latestSpo2Rec.getSpo2() : 0;
        String latestSpo2Time = latestSpo2Rec != null ? formatTime(latestSpo2Rec.getRecordedAt()) : "";

        // Điểm biểu đồ cho App (theo thang đo chuẩn max 150 BPM cho Nhịp tim)
        List<ChartPointDto> hrPoints = mapChartPoints(hrRecords, true, tf);
        List<ChartPointDto> spo2Points = mapChartPoints(spo2Records, false, tf);

        // Lịch sử đo đồng nhất (giữ nguyên khi chuyển tab)
        List<HealthRecordItemDto> hrHistory = allRecent.stream()
                .filter(r -> r.getHeartRate() != null && r.getHeartRate() > 0)
                .map(r -> HealthRecordItemDto.builder()
                        .id(String.valueOf(r.getId()))
                        .bpm(r.getHeartRate())
                        .timestamp(formatDisplayTime(r.getRecordedAt()))
                        .status(mapHrStatus(r.getHeartRate()))
                        .activity(null)
                        .build())
                .toList();

        List<HealthRecordItemDto> spo2History = allRecent.stream()
                .filter(r -> r.getSpo2() != null && r.getSpo2() > 0)
                .map(r -> HealthRecordItemDto.builder()
                        .id(String.valueOf(r.getId()))
                        .percentage(r.getSpo2())
                        .timestamp(formatDisplayTime(r.getRecordedAt()))
                        .status(mapSpo2Status(r.getSpo2()))
                        .build())
                .toList();

        return HealthStatisticsDto.builder()
                .timeframe(tf)
                .periodText(periodText)
                .hasData(hasData)
                .avgHr(avgHr)
                .minHr(minHr)
                .maxHr(maxHr)
                .latestHr(latestHr)
                .latestHrTime(latestHrTime)
                .hrCount(hrRecords.size())
                .hrPoints(hrPoints)
                .avgSpo2(avgSpo2)
                .minSpo2(minSpo2)
                .maxSpo2(maxSpo2)
                .latestSpo2(latestSpo2)
                .latestSpo2Time(latestSpo2Time)
                .spo2Count(spo2Records.size())
                .spo2Points(spo2Points)
                .hrHistory(hrHistory)
                .spo2History(spo2History)
                .build();
    }

    private List<ChartPointDto> mapChartPoints(List<HealthRecord> records, boolean isHr, String tf) {
        if (records == null || records.isEmpty())
            return List.of();
        double minSafe = isHr ? 50.0 : 70.0;
        double maxSafe = isHr ? 150.0 : 100.0;
        double safeTop = 22.0;
        double safeBottom = 76.0;
        double chartWidth = 280.0;
        ZoneId zone = ZoneId.systemDefault();

        return records.stream().map(r -> {
            int val = isHr ? r.getHeartRate() : r.getSpo2();
            double yRatio = (val - minSafe) / (maxSafe - minSafe);
            double y = safeBottom - yRatio * (safeBottom - safeTop);
            double clampedY = Math.max(14.0, Math.min(84.0, y));

            ZonedDateTime zdt = r.getRecordedAt().atZone(zone);
            double x;
            if ("today".equals(tf)) {
                double frac = (zdt.getHour() + zdt.getMinute() / 60.0) / 24.0;
                x = 10.0 + Math.max(0.05, Math.min(0.95, frac)) * (chartWidth - 20.0);
            } else {
                x = 14.0;
            }

            return ChartPointDto.builder()
                    .x(Math.round(x * 10.0) / 10.0)
                    .y(Math.round(clampedY * 10.0) / 10.0)
                    .value(val)
                    .timestamp(formatTime(r.getRecordedAt()))
                    .build();
        }).toList();
    }

    private String mapHrStatus(int bpm) {
        if (bpm < 60)
            return "resting";
        if (bpm <= 100)
            return "normal";
        if (bpm <= 120)
            return "elevated";
        return "high";
    }

    private String mapSpo2Status(int spo2) {
        if (spo2 >= 98)
            return "optimal";
        if (spo2 >= 95)
            return "normal";
        return "low";
    }

    private String formatTime(Instant instant) {
        if (instant == null)
            return "--:--";
        ZonedDateTime zdt = instant.atZone(ZoneId.systemDefault());
        return String.format("%02d:%02d", zdt.getHour(), zdt.getMinute());
    }

    private String formatDisplayTime(Instant instant) {
        if (instant == null)
            return "--:--";
        ZonedDateTime zdt = instant.atZone(ZoneId.systemDefault());
        LocalDate today = LocalDate.now();
        String timeStr = String.format("%02d:%02d", zdt.getHour(), zdt.getMinute());
        if (zdt.toLocalDate().equals(today)) {
            return timeStr + " hôm nay";
        }
        return String.format("%s %02d/%02d", timeStr, zdt.getDayOfMonth(), zdt.getMonthValue());
    }

    /**
     * Đánh giá điểm rủi ro sức khỏe (0.0 đến 1.0) dựa trên quy tắc chuẩn hóa của mô
     * hình
     */
    public Double evaluateRiskScore(Integer heartRate, Integer spo2) {
        if (heartRate == null && spo2 == null)
            return null;
        double hr = (heartRate != null && heartRate > 0) ? heartRate.doubleValue() : 75.0;
        double ox = (spo2 != null && spo2 > 0) ? spo2.doubleValue() : 98.0;

        // Mô hình dựa trên các chỉ số nguy cơ: HR > 105 hoặc < 50 BPM, SpO2 < 96%
        double score = 0.05;
        if (ox < 90.0)
            score += 0.80;
        else if (ox < 94.0)
            score += 0.50;
        else if (ox < 96.0)
            score += 0.25;

        if (hr > 130.0 || hr < 40.0)
            score += 0.60;
        else if (hr > 110.0 || hr < 50.0)
            score += 0.35;
        else if (hr > 100.0 || hr < 55.0)
            score += 0.15;

        double finalScore = Math.min(1.0, Math.max(0.0, score));
        return Math.round(finalScore * 100.0) / 100.0;
    }

    /**
     * Ánh xạ điểm rủi ro sang phân loại 3 mức: Low, Medium, High
     */
    public String mapRiskLevel(Double score) {
        if (score == null)
            return "Low";
        if (score >= 0.55)
            return "High";
        if (score >= 0.25)
            return "Medium";
        return "Low";
    }
}
