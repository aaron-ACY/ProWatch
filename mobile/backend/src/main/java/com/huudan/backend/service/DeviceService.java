package com.huudan.backend.service;

import com.huudan.backend.dto.DeviceRegistrationRequest;
import com.huudan.backend.entity.Device;
import com.huudan.backend.entity.DeviceConfig;
import com.huudan.backend.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final ConcurrentHashMap<String, DeviceConfig> configStore = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> pendingCommands = new ConcurrentHashMap<>();

    public void queueCommand(String deviceId, String command) {
        pendingCommands.put(deviceId, command);
        log.debug("Queued command '{}' for device '{}'", command, deviceId);
    }

    public String pollCommand(String deviceId) {
        String cmd = pendingCommands.remove(deviceId);
        if (cmd != null && !cmd.isBlank()) {
            log.info("🚀 [ĐÃ GỬI LỆNH ĐO SANG XIAO] Đồng hồ '{}' vừa lấy lệnh '{}' thành công từ Backend!", deviceId, cmd);
            System.out.println("🚀 [BACKEND -> XIAO ESP32-S3] Đồng hồ " + deviceId + " đã lấy lệnh: " + cmd);
        }
        return cmd;
    }

    @Transactional
    public Device registerOrUpdateDevice(DeviceRegistrationRequest req) {
        String deviceId = (req.getDeviceId() != null && !req.getDeviceId().isBlank()) 
                ? req.getDeviceId() 
                : "XIAO-ESP32S3-DEFAULT";

        Optional<Device> existingOpt = deviceRepository.findByDeviceId(deviceId);
        Device device = existingOpt.orElseGet(() -> Device.builder()
                .deviceId(deviceId)
                .createdAt(Instant.now())
                .build());

        if (req.getDeviceName() != null) device.setDeviceName(req.getDeviceName());
        if (req.getMacAddress() != null) device.setMacAddress(req.getMacAddress());
        if (req.getUserId() != null && !req.getUserId().isBlank()) {
            try {
                device.setUserId(UUID.fromString(req.getUserId().trim()));
            } catch (IllegalArgumentException e) {
                // not a valid UUID
            }
        }
        if (req.getModel() != null) device.setModel(req.getModel());
        if (req.getFirmwareVersion() != null) device.setFirmwareVersion(req.getFirmwareVersion());
        if (req.getConnectionMode() != null) device.setConnectionMode(req.getConnectionMode());
        if (req.getIpAddress() != null) device.setIpAddress(req.getIpAddress());

        device.setIsOnline(true);
        device.setLastHeartbeat(Instant.now());

        Device saved = deviceRepository.save(device);
        log.info("Registered/Updated device: {} (Online: true)", saved.getDeviceId());

        // Dam bao co san DeviceConfig mac dinh
        getOrCreateConfig(saved.getDeviceId());

        return saved;
    }

    @Transactional
    public void updateHeartbeat(String deviceId, Integer battery, Boolean isCharging, String ipAddress) {
        deviceRepository.findByDeviceId(deviceId).ifPresent(d -> {
            d.setIsOnline(true);
            d.setLastHeartbeat(Instant.now());
            if (battery != null) d.setBatteryLevel(battery);
            if (isCharging != null) d.setIsCharging(isCharging);
            if (ipAddress != null) d.setIpAddress(ipAddress);
            deviceRepository.save(d);
        });
    }

    public Optional<Device> getDevice(String deviceId) {
        return deviceRepository.findByDeviceId(deviceId);
    }

    public List<Device> listDevices() {
        return deviceRepository.findAll();
    }

    public DeviceConfig getOrCreateConfig(String deviceId) {
        return configStore.computeIfAbsent(deviceId, id -> DeviceConfig.builder()
                .deviceId(id)
                .watchFace("health")
                .alwaysOnDisplay(true)
                .raiseToWake(true)
                .measurementIntervalMinutes(15)
                .hrAlertHigh(110)
                .hrAlertLow(50)
                .spo2AlertLow(95)
                .updatedAt(Instant.now())
                .build());
    }

    public DeviceConfig updateConfig(String deviceId, DeviceConfig newConfig) {
        DeviceConfig cfg = getOrCreateConfig(deviceId);
        if (newConfig.getWatchFace() != null) cfg.setWatchFace(newConfig.getWatchFace());
        if (newConfig.getAlwaysOnDisplay() != null) cfg.setAlwaysOnDisplay(newConfig.getAlwaysOnDisplay());
        if (newConfig.getRaiseToWake() != null) cfg.setRaiseToWake(newConfig.getRaiseToWake());
        if (newConfig.getMeasurementIntervalMinutes() != null) cfg.setMeasurementIntervalMinutes(newConfig.getMeasurementIntervalMinutes());
        if (newConfig.getHrAlertHigh() != null) cfg.setHrAlertHigh(newConfig.getHrAlertHigh());
        if (newConfig.getHrAlertLow() != null) cfg.setHrAlertLow(newConfig.getHrAlertLow());
        if (newConfig.getSpo2AlertLow() != null) cfg.setSpo2AlertLow(newConfig.getSpo2AlertLow());
        cfg.setUpdatedAt(Instant.now());
        configStore.put(deviceId, cfg);
        return cfg;
    }

    @Transactional
    public void markDeviceOffline(String deviceId) {
        deviceRepository.findByDeviceId(deviceId).ifPresent(d -> {
            d.setIsOnline(false);
            deviceRepository.save(d);
            log.info("Device {} marked as offline.", deviceId);
        });
    }
}
