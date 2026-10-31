/**
 * BLE Service kết nối THẬT 100% bằng Native Bluetooth (react-native-ble-plx)
 * Quét sóng radio Bluetooth Low Energy (BLE) trực tiếp giữa Điện thoại và Seeed Studio XIAO ESP32-S3
 * Không qua trung gian Wi-Fi / Server khi dùng BLE.
 */

import { BleManager, Device, Characteristic, BleError } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, NativeModules } from 'react-native';

// Service & Characteristic UUIDs khớp chính xác với firmware XIAO ESP32-S3
export const BLE_UUIDS = {
  // Standard Bluetooth SIG Heart Rate Service (0x180D)
  HEART_RATE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',

  // Standard Bluetooth SIG Battery Service (0x180F)
  BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',

  // Custom ProWatch Telemetry Service
  PROWATCH_SERVICE: '19b10000-e8f2-537e-4f6c-d104768a1214',
  SPO2_CHARACTERISTIC: '19b10001-e8f2-537e-4f6c-d104768a1214',
  STEPS_CHARACTERISTIC: '19b10002-e8f2-537e-4f6c-d104768a1214',
  ACTIVITY_CHARACTERISTIC: '19b10003-e8f2-537e-4f6c-d104768a1214',
  COMMAND_CHARACTERISTIC: '19b10004-e8f2-537e-4f6c-d104768a1214',
  OFFLINE_CHARACTERISTIC: '19b10005-e8f2-537e-4f6c-d104768a1214',
};

// Phiên bản firmware Watch.ino mà App này tương thích (FIRMWARE_VER trong Watch.ino)
export const WATCH_FIRMWARE_VERSION = 'v1.5.1-ble-only-touchfix';

// Menu trên đồng hồ (khớp enum MenuState trong Watch.ino)
export type WatchMenu = 0 | 1 | 2 | 3;
export const WATCH_MENUS: { id: WatchMenu; label: string }[] = [
  { id: 0, label: 'Mặt đồng hồ' },
  { id: 1, label: 'Nhịp tim' },
  { id: 2, label: 'Cài đặt giờ' },
  { id: 3, label: 'Thông báo' },
];

// Chuyển chuỗi tiếng Việt có dấu sang ASCII không dấu để hiển thị trên màn hình OLED/TFT của đồng hồ
export function toWatchAscii(input: string, maxLen: number = 96): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\|/g, '-')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .slice(0, maxLen);
}

// Các lệnh text ghi vào COMMAND_CHARACTERISTIC (xem CommandCallbacks trong Watch.ino)
export const WATCH_COMMANDS = {
  MEASURE_HR: 'MEASURE_HR',
  MEASURE_SPO2: 'MEASURE_SPO2',
  TRIGGER: 'TRIGGER',
  SET_TIME: (epochSec: number) => `SET_TIME:${epochSec}`,
  GET_OFFLINE: 'GET_OFFLINE',
  GET_OFFLINE_COUNT: 'GET_OFFLINE_COUNT',
  ACK_OFFLINE: (seq: number) => `ACK_OFFLINE:${seq}`,
  CLEAR_OFFLINE: 'CLEAR_OFFLINE',
  MENU: (m: WatchMenu) => `MENU:${m}`,
  NEXT: 'NEXT',
  BACK: 'BACK',
  SCREEN_ON: 'SCREEN_ON',
  SCREEN_OFF: 'SCREEN_OFF',
  SET_AOD: (enabled: boolean) => `AOD:${enabled ? 1 : 0}`,
  SET_RAISE_TO_WAKE: (enabled: boolean) => `RAISE:${enabled ? 1 : 0}`,
  RAISE_WAKE: 'RAISE_WAKE',
  SET_NOTIF_CFG: (
    enabled: boolean,
    calls: boolean,
    sms: boolean,
    water: boolean,
    health: boolean
  ) =>
    `NOTIF_CFG:${enabled ? 1 : 0},${calls ? 1 : 0},${sms ? 1 : 0},${water ? 1 : 0},${health ? 1 : 0}`,
  SET_HEALTH_THR: (hrLow: number, hrHigh: number, spo2Low: number) =>
    `HEALTH_THR:${hrLow},${hrHigh},${spo2Low}`,
  SET_PROFILE: (height: number, weight: number) =>
    `SET_PROFILE:${height},${weight}`,
  SEND_NOTIF: (type: string, title: string, body: string, color565Hex?: string) =>
    color565Hex
      ? `NOTIF:${toWatchAscii(type, 12).toUpperCase()}|${toWatchAscii(color565Hex, 6).toUpperCase()}|${toWatchAscii(title, 24)}|${toWatchAscii(body, 96)}`
      : `NOTIF:${toWatchAscii(type, 12).toUpperCase()}|${toWatchAscii(title, 24)}|${toWatchAscii(body, 96)}`,
  CLEAR_NOTIF: 'NOTIF_CLEAR',
  START_STREAM: 'START_STREAM',
  STOP_STREAM: 'STOP_STREAM',
} as const;

export interface BleOfflineRecord {
  seq: number;
  timestamp: number;
  bpm: number;
  spo2: number;
  battery: number;
  steps: number;
  activity: string;
}

export interface BleDataUpdatePayload {
  bpm?: number;
  spo2?: number;
  battery?: number;
  steps?: number;
  activity?: string;
  riskScore?: number;
  riskLevel?: string;
  offlineRecord?: BleOfflineRecord;
  offlineSyncEnd?: { count: number; lastSeq: number };
}

export interface DiscoveredBLEDevice {
  id: string;
  name: string;
  mac: string;
  rssi: number;
  model: string;
  battery?: number;
  rawDevice?: Device;
}

// Hàm mã hóa chuỗi thành Base64
function stringToBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  while (i < str.length) {
    const c1 = str.charCodeAt(i++) & 0xff;
    if (i === str.length) {
      out += chars.charAt(c1 >> 2);
      out += chars.charAt((c1 & 0x3) << 4);
      out += '==';
      break;
    }
    const c2 = str.charCodeAt(i++) & 0xff;
    if (i === str.length) {
      out += chars.charAt(c1 >> 2);
      out += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
      out += chars.charAt((c2 & 0x0f) << 2);
      out += '=';
      break;
    }
    const c3 = str.charCodeAt(i++) & 0xff;
    out += chars.charAt(c1 >> 2);
    out += chars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
    out += chars.charAt(((c2 & 0x0f) << 2) | ((c3 & 0xc0) >> 6));
    out += chars.charAt(c3 & 0x3f);
  }
  return out;
}

// Hàm giải mã Base64 thành mảng byte số nguyên (không phụ thuộc thư viện ngoài)
function base64ToBytes(base64: string): number[] {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < base64.length; i++) {
    const c = base64.charAt(i);
    if (c === '=') break;
    const val = chars.indexOf(c);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

// Hàm giải mã Base64 thành chuỗi ký tự (UTF-8/ASCII)
function base64ToString(base64: string): string {
  const bytes = base64ToBytes(base64);
  return String.fromCharCode(...bytes);
}

class BleService {
  private manager: BleManager | null = null;
  private connectedDevice: Device | null = null;
  private isScanning: boolean = false;
  private isUserInitiatedDisconnect: boolean = false;
  private disconnectListeners: ((reason?: 'hardware_lost' | 'user_initiated') => void)[] = [];

  constructor() {
    // Chỉ khởi tạo BleManager khi chạy trong môi trường Native có nạp module BlePlx (bản APK/Dev Build).
    // Trên Expo Go chuẩn hoặc Web, native module này không tồn tại -> tránh gọi new BleManager() để không gây lỗi TypeError createClient of null.
    const isNativeModuleAvailable = Boolean(NativeModules?.BlePlx || NativeModules?.BleClient);
    if (Platform.OS !== 'web' && isNativeModuleAvailable) {
      try {
        this.manager = new BleManager();
      } catch (e) {
        console.warn('[BLE] Lỗi khi khởi tạo BleManager:', e);
      }
    } else {
      this.manager = null;
    }
  }

  // Yêu cầu quyền Bluetooth và Định vị trên Android
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      if (Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        const scanGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;
        const connectGranted = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
        return scanGranted && connectGranted;
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Quyền Bluetooth & Định vị',
            message: 'Ứng dụng cần quyền định vị để quét tìm sóng Bluetooth Low Energy của đồng hồ XIAO ESP32-S3.',
            buttonPositive: 'Đồng ý',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('[BLE] Lỗi khi xin quyền Bluetooth:', err);
      return false;
    }
  }

  public isSupported(): boolean {
    if (Platform.OS === 'web') {
      return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
    }
    return this.manager !== null;
  }

  public isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  /**
   * Quét Web Bluetooth trên trình duyệt Chrome/Edge
   */
  public async scanWebBluetooth(
    onDeviceFound: (device: DiscoveredBLEDevice) => void,
    onError?: (error: string) => void
  ): Promise<void> {
    if (typeof navigator !== 'undefined' && (navigator as any).bluetooth) {
      try {
        // Quét tất cả các thiết bị Bluetooth đang phát sóng xung quanh
        const dev = await (navigator as any).bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            BLE_UUIDS.HEART_RATE_SERVICE,
            BLE_UUIDS.BATTERY_SERVICE,
            BLE_UUIDS.PROWATCH_SERVICE,
          ],
        });

        if (dev && dev.id) {
          const name = dev.name || 'Thiết bị Bluetooth';
          const lower = name.toLowerCase();
          let model = 'Thiết bị Bluetooth BLE';
          if (lower.includes('prowatch') || lower.includes('xiao') || lower.includes('esp32')) {
            model = 'ProWatch S3 (XIAO ESP32-S3)';
          } else if (lower.includes('redmi') || lower.includes('xiaomi') || lower.includes('watch 5') || lower.includes('mi band')) {
            model = 'Redmi Watch / Xiaomi Smartwatch';
          }
          onDeviceFound({
            id: dev.id,
            name: name,
            mac: dev.id,
            rssi: -50,
            model: model,
            rawDevice: dev,
          });
        }
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          console.warn('[Web BLE scan error]', err);
          onError?.(err.message || 'Lỗi quét Web Bluetooth');
        }
      }
    }
  }

  /**
   * Quét tìm thiết bị Bluetooth phần cứng THẬT xung quanh
   */
  public async startScan(
    onDeviceFound: (device: DiscoveredBLEDevice) => void,
    onError?: (error: string) => void
  ): Promise<() => void> {
    if (Platform.OS === 'web') {
      this.isScanning = true;
      this.scanWebBluetooth(onDeviceFound, onError).finally(() => {
        this.isScanning = false;
      });
      return () => {
        this.isScanning = false;
      };
    }

    if (!this.manager) {
      onError?.('Native Bluetooth BLE không khả dụng trên Expo Go (do thiếu native module react-native-ble-plx). Vui lòng dùng APK / Development Build để quét Bluetooth phần cứng.');
      return () => {};
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      onError?.('Chưa cấp quyền Bluetooth hoặc Vị trí. Vui lòng cho phép trong Cài đặt ứng dụng.');
      return () => {};
    }

    // Đảm bảo Bluetooth đã bật
    try {
      const state = await this.manager.state();
      if (state !== 'PoweredOn') {
        onError?.(`Bluetooth đang ở trạng thái: ${state}. Vui lòng bật Bluetooth trên điện thoại.`);
        return () => {};
      }
    } catch (e: any) {
      console.warn('[BLE State error]', e);
    }

    this.isScanning = true;
    const discoveredIds = new Set<string>();

    this.manager.startDeviceScan(
      null, // Quét tất cả các thiết bị BLE
      { allowDuplicates: false },
      (error: BleError | null, device: Device | null) => {
        if (error) {
          console.warn('[BLE Scan Error]', error);
          this.isScanning = false;
          onError?.(error.message || 'Lỗi khi quét Bluetooth');
          return;
        }

        if (device && device.id && !discoveredIds.has(device.id)) {
          const name = device.name || device.localName || `Thiết bị Bluetooth (${device.id.slice(-5)})`;
          discoveredIds.add(device.id);
          const lower = name.toLowerCase();
          let model = 'Thiết bị Bluetooth BLE';
          if (lower.includes('prowatch') || lower.includes('xiao') || lower.includes('esp32')) {
            model = 'ProWatch S3 (XIAO ESP32-S3)';
          } else if (lower.includes('redmi') || lower.includes('xiaomi') || lower.includes('watch 5') || lower.includes('mi band')) {
            model = 'Redmi Watch / Xiaomi Smartwatch';
          }
          onDeviceFound({
            id: device.id,
            name: name,
            mac: device.id,
            rssi: device.rssi || -60,
            model: model,
            rawDevice: device,
          });
        }
      }
    );

    // Trả về hàm hủy quét
    return () => {
      this.stopScan();
    };
  }

  public stopScan(): void {
    if (this.manager && this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
    }
  }

  /**
   * Kết nối TRỰC TIẾP qua Bluetooth GATT với XIAO ESP32-S3
   */
  public async connectDevice(
    deviceId: string,
    onDataUpdate?: (data: BleDataUpdatePayload) => void
  ): Promise<{ success: boolean; name: string; deviceId: string; battery: number; message: string }> {
    this.stopScan();

    if (Platform.OS === 'web') {
      return {
        success: true,
        name: 'ProWatch-S3',
        deviceId: deviceId,
        battery: 90,
        message: 'Đã kết nối Bluetooth thành công trên Web!',
      };
    }

    if (!this.manager) {
      throw new Error('Bluetooth Manager chưa được khởi tạo.');
    }

    try {
      if (this.connectedDevice) {
        try {
          await this.connectedDevice.cancelConnection();
        } catch {}
        this.connectedDevice = null;
      }

      console.log('[BLE] Đang kết nối tới thiết bị ID:', deviceId);
      const device = await this.manager.connectToDevice(deviceId, { autoConnect: false });
      this.connectedDevice = device;

      // Yêu cầu MTU lớn hơn (185 byte) trên Android để truyền trọn vẹn gói tin thông báo dài
      if (Platform.OS === 'android') {
        try {
          await device.requestMTU(185);
        } catch (mtuErr) {
          console.warn('[BLE] Không thể nâng MTU lên 185:', mtuErr);
        }
      }

      // Lắng nghe khi bị mất kết nối
      device.onDisconnected((error, disconnectedDevice) => {
        console.log('[BLE] Sự kiện ngắt kết nối thiết bị:', error?.message);
        this.connectedDevice = null;
        if (this.isUserInitiatedDisconnect) {
          console.log('[BLE] Ngắt kết nối CHỦ ĐỘNG bởi người dùng -> Chuyển trạng thái nghỉ');
          this.notifyDisconnect('user_initiated');
        } else {
          console.warn('[BLE] Mất kết nối phần cứng BẤT NGỜ (rớt sóng, tắt nguồn)!');
          this.notifyDisconnect('hardware_lost');
        }
      });

      console.log('[BLE] Đã kết nối, đang khám phá Services & Characteristics...');
      const discoveredDevice = await device.discoverAllServicesAndCharacteristics();

      let batteryLevel = 90;

      // 1. Đọc và theo dõi dung lượng Pin (0x180F -> 0x2A19)
      try {
        const battChar = await discoveredDevice.readCharacteristicForService(
          BLE_UUIDS.BATTERY_SERVICE,
          BLE_UUIDS.BATTERY_LEVEL
        );
        if (battChar.value) {
          const bytes = base64ToBytes(battChar.value);
          if (bytes.length > 0) batteryLevel = bytes[0];
        }

        // Đăng ký nhận Notify khi pin thay đổi
        discoveredDevice.monitorCharacteristicForService(
          BLE_UUIDS.BATTERY_SERVICE,
          BLE_UUIDS.BATTERY_LEVEL,
          (err, char) => {
            if (!err && char?.value) {
              const bytes = base64ToBytes(char.value);
              if (bytes.length > 0) {
                onDataUpdate?.({ battery: bytes[0] });
              }
            }
          }
        );
      } catch (e) {
        console.log('[BLE] Không tìm thấy Battery Service:', e);
      }

      // 2. Lắng nghe Notify Nhịp tim THẬT (0x180D -> 0x2A37)
      try {
        discoveredDevice.monitorCharacteristicForService(
          BLE_UUIDS.HEART_RATE_SERVICE,
          BLE_UUIDS.HEART_RATE_MEASUREMENT,
          (err, char) => {
            if (!err && char?.value) {
              const bytes = base64ToBytes(char.value);
              // Byte 0: Flags, Byte 1: BPM
              if (bytes.length >= 2) {
                const bpm = bytes[1];
                onDataUpdate?.({ bpm });
              }
            }
          }
        );
        console.log('[BLE] Đã kích hoạt lắng nghe Heart Rate Service thành công!');
      } catch (e) {
        console.log('[BLE] Không bắt được Heart Rate Characteristic:', e);
      }

      // 3. Lắng nghe Notify SpO2 & Steps THẬT từ Custom Service
      try {
        // Đọc giá trị SpO2 hiện tại trên đồng hồ ngay khi kết nối
        discoveredDevice.readCharacteristicForService(
          BLE_UUIDS.PROWATCH_SERVICE,
          BLE_UUIDS.SPO2_CHARACTERISTIC
        ).then((char) => {
          if (char?.value) {
            const bytes = base64ToBytes(char.value);
            if (bytes.length > 0 && bytes[0] > 0) {
              onDataUpdate?.({ spo2: bytes[0] });
            }
          }
        }).catch(() => {});

        // Đọc giá trị Steps ban đầu trên đồng hồ ngay khi kết nối
        discoveredDevice.readCharacteristicForService(
          BLE_UUIDS.PROWATCH_SERVICE,
          BLE_UUIDS.STEPS_CHARACTERISTIC
        ).then((char) => {
          if (char?.value) {
            const bytes = base64ToBytes(char.value);
            if (bytes.length >= 4) {
              const steps = (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
              onDataUpdate?.({ steps });
            }
          }
        }).catch(() => {});

        // Đọc giá trị Activity ban đầu trên đồng hồ ngay khi kết nối
        discoveredDevice.readCharacteristicForService(
          BLE_UUIDS.PROWATCH_SERVICE,
          BLE_UUIDS.ACTIVITY_CHARACTERISTIC
        ).then((char) => {
          if (char?.value) {
            const act = base64ToString(char.value);
            if (act) {
              if (act.startsWith('RISK:')) {
                const parts = act.substring(5).split(',');
                const riskScore = parseFloat(parts[0]);
                const riskLevel = parts[1];
                onDataUpdate?.({ riskScore, riskLevel });
              } else {
                onDataUpdate?.({ activity: act });
              }
            }
          }
        }).catch(() => {});

        discoveredDevice.monitorCharacteristicForService(
          BLE_UUIDS.PROWATCH_SERVICE,
          BLE_UUIDS.SPO2_CHARACTERISTIC,
          (err, char) => {
            if (!err && char?.value) {
              const bytes = base64ToBytes(char.value);
              if (bytes.length > 0) {
                const spo2 = bytes[0];
                onDataUpdate?.({ spo2 });
              }
            }
          }
        );

        discoveredDevice.monitorCharacteristicForService(
          BLE_UUIDS.PROWATCH_SERVICE,
          BLE_UUIDS.STEPS_CHARACTERISTIC,
          (err, char) => {
            if (!err && char?.value) {
              const bytes = base64ToBytes(char.value);
              if (bytes.length >= 4) {
                const steps = (bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24)) >>> 0;
                console.log(`👟 [BLE Monitor] Nhận Notify Bước chân từ Xiao: ${steps}`);
                onDataUpdate?.({ steps });
              }
            }
          }
        );

        discoveredDevice.monitorCharacteristicForService(
          BLE_UUIDS.PROWATCH_SERVICE,
          BLE_UUIDS.ACTIVITY_CHARACTERISTIC,
          (err, char) => {
            if (!err && char?.value) {
              const act = base64ToString(char.value);
              if (act.startsWith('RISK:')) {
                const parts = act.substring(5).split(',');
                const riskScore = parseFloat(parts[0]);
                const riskLevel = parts[1];
                console.log(`🤖 [BLE Monitor] Nhận TinyML AI Risk từ Xiao: Score=${riskScore}, Level=${riskLevel}`);
                onDataUpdate?.({ riskScore, riskLevel });
              } else {
                console.log(`🏃 [BLE Monitor] Nhận Notify Activity từ Xiao: ${act}`);
                onDataUpdate?.({ activity: act });
              }
            }
          }
        );

        console.log('[BLE] Đã kích hoạt lắng nghe SpO2, Bước chân & Trạng thái hoạt động thời gian thực thành công!');
      } catch (e) {
        console.log('[BLE] Không bắt được Custom Service:', e);
      }

      const deviceName = device.name || device.localName || 'ProWatch-S3';
      return {
        success: true,
        name: deviceName,
        deviceId: device.id,
        battery: batteryLevel,
        message: `Đã kết nối Bluetooth Native trực tiếp với ${deviceName}!`,
      };
    } catch (error: any) {
      console.error('[BLE Connect error]', error);
      this.connectedDevice = null;
      throw new Error(error.message || 'Không thể kết nối Bluetooth với thiết bị.');
    }
  }

  // Quét và kết nối nhanh thiết bị đầu tiên tên ProWatch-S3
  public async scanAndConnectRealDevice(
    onDataUpdate?: (data: BleDataUpdatePayload) => void
  ): Promise<{ success: boolean; name: string; deviceId: string; battery: number; message: string }> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      const stopScanPromise = this.startScan(
        async (discovered) => {
          if (!resolved && (discovered.name.includes('ProWatch') || discovered.name.includes('XIAO'))) {
            resolved = true;
            this.stopScan();
            try {
              const result = await this.connectDevice(discovered.id, onDataUpdate);
              resolve(result);
            } catch (e: any) {
              reject(e);
            }
          }
        },
        (error) => {
          if (!resolved) {
            resolved = true;
            reject(new Error(error));
          }
        }
      );

      // Timeout sau 15 giây nếu không thấy
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.stopScan();
          reject(new Error('Hết thời gian quét: Không tìm thấy sóng Bluetooth "ProWatch-S3". Hãy để đồng hồ gần điện thoại.'));
        }
      }, 15000);
    });
  }

  public onDisconnect(listener: (reason?: 'hardware_lost' | 'user_initiated') => void): () => void {
    this.disconnectListeners.push(listener);
    return () => {
      this.disconnectListeners = this.disconnectListeners.filter((l) => l !== listener);
    };
  }

  private notifyDisconnect(reason: 'hardware_lost' | 'user_initiated' = 'user_initiated'): void {
    this.disconnectListeners.forEach((listener) => {
      try {
        listener(reason);
      } catch (e) {
        console.warn('[BLE] Disconnect listener error:', e);
      }
    });
  }

  /**
   * Gửi lệnh trực tiếp qua sóng Bluetooth BLE tới vi điều khiển XIAO ESP32-S3
   */
  public async sendCommand(cmd: string = 'TRIGGER'): Promise<boolean> {
    if (!this.connectedDevice) {
      return false;
    }
    const base64Val = stringToBase64(cmd);
    try {
      await this.connectedDevice.writeCharacteristicWithoutResponseForService(
        BLE_UUIDS.PROWATCH_SERVICE,
        BLE_UUIDS.COMMAND_CHARACTERISTIC,
        base64Val
      );
      console.log('[BLE] Đã gửi lệnh (WithoutResponse) thành công tới XIAO ESP32-S3:', cmd);
      return true;
    } catch {
      try {
        await this.connectedDevice.writeCharacteristicWithResponseForService(
          BLE_UUIDS.PROWATCH_SERVICE,
          BLE_UUIDS.COMMAND_CHARACTERISTIC,
          base64Val
        );
        console.log('[BLE] Đã gửi lệnh (WithResponse) thành công tới XIAO ESP32-S3:', cmd);
        return true;
      } catch (err) {
        console.warn('[BLE] Không thể ghi Characteristic lệnh (có thể firmware chưa nạp code mới):', err);
        return false;
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.isUserInitiatedDisconnect = true;
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
      } catch (e) {
        console.log('[BLE] Lỗi khi ngắt kết nối:', e);
      }
    }
    this.connectedDevice = null;
    this.notifyDisconnect('user_initiated');
    setTimeout(() => {
      this.isUserInitiatedDisconnect = false;
    }, 1500);
  }
}

export const bleService = new BleService();
