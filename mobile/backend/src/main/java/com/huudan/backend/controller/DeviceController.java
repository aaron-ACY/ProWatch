package com.huudan.backend.controller;

import com.huudan.backend.dto.DeviceRegistrationRequest;
import com.huudan.backend.dto.TelemetryRequest;
import com.huudan.backend.dto.TelemetryResponse;
import com.huudan.backend.entity.Device;
import com.huudan.backend.entity.DeviceConfig;
import com.huudan.backend.service.DeviceService;
import com.huudan.backend.service.TelemetryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DeviceController {

    private final DeviceService deviceService;
    private final TelemetryService telemetryService;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    /**
     * Endpoint chinh nhan Telemetry (BPM, SpO2, Buoc chan, Pin) tu XIAO ESP32-S3 qua Wi-Fi
     * hoac duoc chuyen tiep tu Mobile App qua BLE
     */
    @PostMapping("/telemetry")
    public ResponseEntity<TelemetryResponse> receiveTelemetry(@RequestBody TelemetryRequest request) {
        boolean hasMeasureData = (request.getHeartRate() != null && request.getHeartRate() > 0) 
                || (request.getSpo2() != null && request.getSpo2() > 0);
        if (hasMeasureData) {
            System.out.println("================================================================================");
            System.out.println("✅ [XIAO ĐÃ ĐO XONG] Nhận kết quả đo thật từ " + request.getDeviceId() 
                    + " -> Nhịp tim: " + request.getHeartRate() + " BPM | SpO2: " + request.getSpo2() + "% | Pin: " + request.getBattery() + "%");
            System.out.println("📱 [BACKEND -> APP] Đã lưu kết quả đo thật và chuyển về App để hiển thị!");
            System.out.println("================================================================================");
            log.info("✅ [XIAO ĐÃ ĐO XONG] Nhận kết quả đo thật từ {}: Nhịp tim={} BPM, SpO2={}%",
                    request.getDeviceId(), request.getHeartRate(), request.getSpo2());
        } else {
            log.debug("Telemetry heartbeat from {}: battery={}", request.getDeviceId(), request.getBattery());
        }
        TelemetryResponse response = telemetryService.ingestTelemetry(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Dang ky hoac ghep doi thiet bi moi
     */
    @PostMapping("/register")
    public ResponseEntity<Device> registerDevice(@RequestBody DeviceRegistrationRequest request) {
        Device device = deviceService.registerOrUpdateDevice(request);
        return ResponseEntity.ok(device);
    }

    /**
     * Heartbeat dinh ky tu ESP32-S3
     * Tra ve kem lenh do (command) neu co de Xiao nhan lenh tuc thi
     */
    @PostMapping("/{deviceId}/heartbeat")
    public ResponseEntity<Map<String, Object>> heartbeat(
            @PathVariable String deviceId,
            @RequestParam(required = false) Integer battery,
            @RequestParam(required = false) Boolean isCharging,
            @RequestParam(required = false) String ipAddress) {
        deviceService.updateHeartbeat(deviceId, battery, isCharging, ipAddress);
        String pendingCmd = deviceService.pollCommand(deviceId);
        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("status", "ONLINE");
        resp.put("deviceId", deviceId);
        if (pendingCmd != null && !pendingCmd.isBlank()) {
            resp.put("command", pendingCmd);
            System.out.println("🚀 [XIAO ĐÃ NHẬN LỆNH QUA HEARTBEAT] Đồng hồ " + deviceId + " đã nhận lệnh: " + pendingCmd + " -> Bắt đầu đo!");
            log.info("🚀 [XIAO ĐÃ NHẬN LỆNH] Gửi kèm lệnh đo '{}' trong Heartbeat cho thiết bị: {}", pendingCmd, deviceId);
        }
        return ResponseEntity.ok(resp);
    }

    /**
     * ESP32-S3 polling lay lenh dang cho tu Backend qua Wi-Fi
     */
    @GetMapping("/{deviceId}/command")
    public ResponseEntity<Map<String, Object>> getPendingCommand(@PathVariable String deviceId) {
        deviceService.updateHeartbeat(deviceId, null, null, null);
        String pendingCmd = deviceService.pollCommand(deviceId);
        if (pendingCmd != null && !pendingCmd.isBlank()) {
            System.out.println("🚀 [XIAO ĐÃ NHẬN LỆNH] Đồng hồ " + deviceId + " vừa lấy lệnh '" + pendingCmd + "' -> BẮT ĐẦU ĐO TRÊN CẢM BIẾN!");
            log.info("🚀 [XIAO ĐÃ NHẬN LỆNH] Đồng hồ {} vừa lấy lệnh '{}' -> Bắt đầu tiến hành đo!", deviceId, pendingCmd);
        }
        Map<String, Object> resp = new java.util.HashMap<>();
        resp.put("deviceId", deviceId);
        resp.put("command", pendingCmd != null ? pendingCmd : "");
        return ResponseEntity.ok(resp);
    }

    /**
     * Lay thong tin chi tiet thiet bi
     */
    @GetMapping("/{deviceId}")
    public ResponseEntity<Device> getDevice(@PathVariable String deviceId) {
        return deviceService.getDevice(deviceId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Danh sach tat ca thiet bi da ket noi
     */
    @GetMapping
    public ResponseEntity<List<Device>> listDevices() {
        return ResponseEntity.ok(deviceService.listDevices());
    }

    /**
     * Lay cau hinh mat dong ho va nguong canh bao cho ESP32
     */
    @GetMapping("/{deviceId}/config")
    public ResponseEntity<DeviceConfig> getConfig(@PathVariable String deviceId) {
        return ResponseEntity.ok(deviceService.getOrCreateConfig(deviceId));
    }

    /**
     * Cap nhat cau hinh mat dong ho hoac nguong canh bao tu App
     */
    @PutMapping("/{deviceId}/config")
    public ResponseEntity<DeviceConfig> updateConfig(
            @PathVariable String deviceId,
            @RequestBody DeviceConfig config) {
        return ResponseEntity.ok(deviceService.updateConfig(deviceId, config));
    }

    /**
     * Endpoint kich hoat bat dau do tu App (qua Wi-Fi / Backend)
     * Luu lenh MEASURE vao hang doi va broadcast WebSocket de dong ho thuc hien do that
     */
    @PostMapping("/{deviceId}/measure")
    public ResponseEntity<Map<String, Object>> requestMeasure(
            @PathVariable String deviceId,
            @RequestParam(defaultValue = "MEASURE") String type) {
        System.out.println("================================================================================");
        System.out.println("🎯 [BẤM ĐO TRÊN APP] Nhận yêu cầu đo (" + type + ") cho thiết bị: " + deviceId);
        System.out.println("📤 [BACKEND -> XIAO] Đã đưa lệnh đo '" + type + "' vào hàng đợi & gửi tới Xiao ESP32-S3!");
        System.out.println("================================================================================");
        log.info("🎯 [BẤM ĐO TRÊN APP] Nhận yêu cầu đo ({}) cho thiết bị {}. Đã gửi lệnh sang Xiao!", type, deviceId);
        deviceService.queueCommand(deviceId, type);

        // Broadcast qua WebSocket cho thiet bi va App
        Map<String, Object> commandPayload = Map.of(
                "command", type,
                "deviceId", deviceId,
                "timestamp", java.time.Instant.now().toString(),
                "status", "MEASURING"
        );
        messagingTemplate.convertAndSend("/topic/device/" + deviceId + "/command", (Object) commandPayload);
        messagingTemplate.convertAndSend("/topic/commands", (Object) commandPayload);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã gửi lệnh bắt đầu đo tới thiết bị " + deviceId,
                "command", type,
                "deviceId", deviceId
        ));
    }

    /**
     * Endpoint kich hoat telemetry va do tu App
     */
    @PostMapping("/{deviceId}/trigger-telemetry")
    public ResponseEntity<TelemetryResponse> triggerTelemetry(
            @PathVariable String deviceId,
            @RequestParam(required = false) Integer heartRate,
            @RequestParam(required = false) Integer spo2,
            @RequestParam(required = false) Integer battery) {
        log.info("App ban lenh kich hoat do telemetry cho thiet bi: {}", deviceId);

        // Dat lenh MEASURE vao hang doi de khi ESP32 gui request qua Wi-Fi se nhan lenh va thuc thi do ngay
        deviceService.queueCommand(deviceId, "MEASURE");

        // Broadcast qua WebSocket
        Map<String, Object> commandPayload = Map.of(
                "command", "MEASURE",
                "deviceId", deviceId,
                "timestamp", java.time.Instant.now().toString(),
                "status", "MEASURING"
        );
        messagingTemplate.convertAndSend("/topic/device/" + deviceId + "/command", (Object) commandPayload);
        messagingTemplate.convertAndSend("/topic/commands", (Object) commandPayload);

        // Neu request co san gia tri do that thi luu vao DB
        if (heartRate != null || spo2 != null) {
            TelemetryRequest req = TelemetryRequest.builder()
                    .deviceId(deviceId)
                    .heartRate(heartRate)
                    .spo2(spo2)
                    .battery(battery != null ? battery : 90)
                    .activity("Đo theo lệnh từ App")
                    .connectionMode("HYBRID")
                    .firmwareVersion("v1.2.0-hybrid")
                    .build();
            return ResponseEntity.ok(telemetryService.ingestTelemetry(req));
        }

        TelemetryResponse resp = TelemetryResponse.builder()
                .success(true)
                .message("Đã kích hoạt chế độ bắt đầu đo trên vi điều khiển")
                .serverTime(java.time.Instant.now())
                .syncStatus("MEASURING")
                .command("MEASURE")
                .build();
        return ResponseEntity.ok(resp);
    }

    /**
     * Ngat ket noi chu dong voi thiet bi tu App
     */
    @PostMapping("/{deviceId}/disconnect")
    public ResponseEntity<Map<String, Object>> disconnectDevice(@PathVariable String deviceId) {
        log.info("App gui lenh ngat ket noi voi thiet bi: {}", deviceId);
        deviceService.markDeviceOffline(deviceId);
        return ResponseEntity.ok(Map.of("status", "DISCONNECTED", "deviceId", deviceId));
    }
}
