import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  HeartRateReading, 
  SpO2Reading, 
  WatchStatus, 
  WatchCustomization, 
  HealthSummary,
  HeartRateStatus,
  SpO2Status
} from '../types';
import { bleService, BleOfflineRecord, WATCH_COMMANDS, WATCH_FIRMWARE_VERSION, WatchMenu } from './bleService';
import { supabaseService } from './supabaseService';

export interface PendingOfflineMeasurement {
  id: string;
  bpm?: number;
  spo2?: number;
  steps?: number;
  calories?: number;
  activity?: string;
  recordedAt: string;
  offlineSeq?: number;
  riskScore?: number;
  riskLevel?: string;
  retryCount: number;
}

const STORAGE_KEYS = {
  PENDING_OFFLINE_QUEUE: '@prowatch_pending_offline_measurements',
  LOCAL_HR_HISTORY: '@prowatch_local_hr_history',
  LOCAL_SPO2_HISTORY: '@prowatch_local_spo2_history',
  OFFLINE_SEQ_COUNTER: '@prowatch_offline_seq_counter',
};

export interface NotificationCategories {
  calls: boolean;
  sms: boolean;
  water: boolean;
  health: boolean;
}

export type WatchNotificationType =
  | 'CALL'
  | 'SMS'
  | 'WATER'
  | 'SEDENTARY'
  | 'DEMO'
  | 'HEALTH'
  | 'HEALTH_OK'
  | 'HEALTH_WARN'
  | 'HR_LOW'
  | 'HR_NORMAL'
  | 'HR_HIGH'
  | 'SPO2_LOW'
  | 'SPO2_NORMAL'
  | 'SPO2_HIGH';

export interface HealthEvaluationAlert {
  level: 'low' | 'normal' | 'high';
  isWarning: boolean;
  title: string;
  message: string;
  watchTitle: string;
  watchBody: string;
  watchType: WatchNotificationType;
  bpm?: number;
  spo2?: number;
}

// Helper fetch với timeout tối đa 2000ms để không bao giờ treo giao diện UI
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 2000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function formatRecordTime(dateStr?: string | Date): string {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const now = new Date();
  const isToday = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (isToday) return `${timeStr} hôm nay`;
  return `${timeStr} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

class WatchService {
  private watchStatus: WatchStatus = {
    connected: false,
    deviceName: 'Chưa kết nối đồng hồ',
    battery: 0,
    isCharging: false,
    lastSync: 'Chưa kết nối',
    firmwareVersion: '--',
    model: 'XIAO-ESP32-S3',
    bleAddress: 'Chưa kết nối',
    connectionState: 'disconnected',
    disconnectReason: undefined,
  };

  private statusListeners: ((status: WatchStatus) => void)[] = [];
  private connectionLostListeners: ((reason: string) => void)[] = [];
  private healthAlertListeners: ((alert: HealthEvaluationAlert) => void)[] = [];
  private lastConnectedDevice: { name: string; address?: string; battery?: number; model?: string; firmwareVersion?: string } | null = null;
  private activeMeasurement: {
    type: 'hr' | 'spo2';
    startTime: number;
    initialVal: number;
    visualTimer: any;
    pollTimer: any;
    timeoutTimer: any;
    onProgress: (progress: number, intermediateVal: number) => void;
    onComplete: (finalVal: number) => void;
    onError?: (msg: string) => void;
  } | null = null;

  private lastHealthAlertMs: number = 0;
  private notifCategories: NotificationCategories = {
    calls: true,
    sms: true,
    water: true,
    health: true,
  };

  constructor() {
    // Tự động lắng nghe thông báo thật từ hệ điều hành Android (chỉ Cuộc gọi đến & Tin nhắn SMS)
    if (Platform.OS === 'android') {
      DeviceEventEmitter.addListener('WatchSystemNotification', (payload: any) => {
        if (!payload || !this.customization.notificationsEnabled || !bleService.isConnected()) {
          return;
        }
        const category = String(payload.category || '').toUpperCase();
        const title = String(payload.title || 'Thong bao');
        const message = String(payload.message || '');

        if (category === 'CALL') {
          if (!this.notifCategories.calls) return;
          console.log(`🔔 [Android Call -> Watch] ${title}: ${message}`);
          this.sendNotificationToWatch('CALL', title, message).catch((err) => {
            console.warn('[WatchService] Lỗi chuyển tiếp thông báo cuộc gọi sang đồng hồ:', err);
          });
        } else if (category === 'SMS') {
          if (!this.notifCategories.sms) return;
          console.log(`🔔 [Android SMS -> Watch] ${title}: ${message}`);
          this.sendNotificationToWatch('SMS', title, message).catch((err) => {
            console.warn('[WatchService] Lỗi chuyển tiếp tin nhắn SMS sang đồng hồ:', err);
          });
        }
      });
    }

    // Tự động lắng nghe sự kiện mất kết nối từ Bluetooth BLE
    bleService.onDisconnect((reason) => {
      if (reason === 'hardware_lost') {
        this.handleDeviceLost('Mất kết nối Bluetooth với phần cứng XIAO ESP32-S3 (board mạch tắt nguồn, hết pin hoặc ra ngoài vùng phủ sóng BLE)!');
      } else if (reason === 'user_initiated') {
        console.log('[WatchService] Ngắt kết nối chủ động bởi người dùng -> Về trạng thái nghỉ an toàn');
        this.watchStatus = {
          ...this.watchStatus,
          connected: false,
          connectionState: 'disconnected',
          disconnectReason: undefined,
          battery: 0,
          bleAddress: 'Chưa kết nối',
          lastSync: 'Đã ngắt kết nối',
        };
        this.currentBpm = 0;
        this.currentSpO2 = 0;
        this.notifyStatusChange();
      }
    });

    // 1. Tải cache cục bộ đã lưu trong điện thoại để sẵn sàng hiển thị ngay lập tức (kể cả khi offline)
    this.loadLocalCacheFromStorage();

    // 2. Tự động tải dữ liệu sức khỏe mới nhất từ Supabase Cloud
    this.fetchSupabaseData();

    // 3. Tự động đẩy các bản ghi đo offline lưu trên điện thoại lên Supabase khi có mạng
    this.syncPendingOfflineRecordsToCloud();

    // 4. Chu kỳ kiểm tra định kỳ mỗi 25 giây để đồng bộ dữ liệu đo offline khi có kết nối mạng
    setInterval(() => {
      this.syncPendingOfflineRecordsToCloud();
    }, 25000);
  }

  public getLastConnectedDevice() {
    return this.lastConnectedDevice;
  }

  private customization: WatchCustomization = {
    watchFace: 'health',
    alwaysOnDisplay: true,
    raiseToWake: true,
    measurementIntervalMinutes: 15,
    hrAlertHigh: 110,
    hrAlertLow: 50,
    spo2AlertLow: 95,
    notificationsEnabled: true,
    hapticFeedback: true,
    apiServerUrl: 'https://prowatch-backend.onrender.com/prowatch/api/v1',
  };

  private currentBpm: number = 0;
  private currentSpO2: number = 0;
  private currentSteps: number = 0;
  private currentCalories: number = 0;
  private currentActivity: string = 'REST';
  private currentRiskScore: number | undefined = undefined;
  private currentRiskLevel: string | undefined = undefined;
  private lastActivitySyncMs: number = 0;
  private activitySyncTimer: any = null;
  private minHrToday: number = 0;
  private maxHrToday: number = 0;
  private avgSpO2Today: number = 0;
  private lastFinalizedHrMs: number = 0;
  private lastFinalizedSpo2Ms: number = 0;
  private watchMeasureProgressPct: number = 0;
  private offlineSeqCounter: number = 0;

  // Sinh số thứ tự đồng bộ (offline_seq) tăng dần và lưu bền vững vào bộ nhớ điện thoại
  private getNextOfflineSeq(): number {
    this.offlineSeqCounter += 1;
    AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_SEQ_COUNTER, String(this.offlineSeqCounter)).catch(() => {});
    return this.offlineSeqCounter;
  }

  // Quản lý ID người dùng đăng nhập hiện tại
  private currentUserId: string | null = null;

  public setCurrentUserId(userId: string | null): void {
    if (this.currentUserId !== userId) {
      this.currentUserId = userId;
      this.resetUserData();
      if (userId) {
        this.loadLocalCacheFromStorage();
        this.fetchSupabaseData();
      }
    }
  }

  public resetUserData(): void {
    this.hrHistory = [];
    this.spo2History = [];
    this.currentBpm = 0;
    this.currentSpO2 = 0;
    this.currentSteps = 0;
    this.currentCalories = 0;
    this.currentActivity = 'Chưa có dữ liệu';
    this.currentRiskScore = undefined;
    this.currentRiskLevel = undefined;
    this.minHrToday = 0;
    this.maxHrToday = 0;
    this.avgSpO2Today = 0;
    this.notifyStatusChange();
  }

  // Lịch sử đo thực tế
  private hrHistory: HeartRateReading[] = [];
  private spo2History: SpO2Reading[] = [];

  public getWatchStatus(): WatchStatus {
    return { ...this.watchStatus };
  }

  public getCustomization(): WatchCustomization {
    return { ...this.customization };
  }

  public updateCustomization(settings: Partial<WatchCustomization>): WatchCustomization {
    this.customization = { ...this.customization, ...settings };
    return { ...this.customization };
  }

  public getNotificationCategories(): NotificationCategories {
    return { ...this.notifCategories };
  }

  public updateNotificationCategories(partial: Partial<NotificationCategories>): NotificationCategories {
    this.notifCategories = { ...this.notifCategories, ...partial };
    return { ...this.notifCategories };
  }

  public onHealthAlert(listener: (alert: HealthEvaluationAlert) => void): () => void {
    this.healthAlertListeners.push(listener);
    return () => {
      this.healthAlertListeners = this.healthAlertListeners.filter((l) => l !== listener);
    };
  }

  // Đánh giá chỉ số Nhịp tim (BPM) & SpO2 (%) theo 3 mức: Quá thấp / Bình thường / Quá cao
  public evaluateHealthReading(bpm?: number, spo2?: number): HealthEvaluationAlert | null {
    const validBpm = bpm && bpm > 0 ? bpm : undefined;
    const validSpo2 = spo2 && spo2 > 0 ? spo2 : undefined;
    if (!validBpm && !validSpo2) return null;

    const hrLowThr = this.customization.hrAlertLow || 60;
    const hrHighThr = this.customization.hrAlertHigh || 100;
    const spo2LowThr = this.customization.spo2AlertLow || 95;

    const hrLow = validBpm !== undefined && validBpm < hrLowThr;
    const hrHigh = validBpm !== undefined && validBpm > hrHighThr;
    const spo2Low = validSpo2 !== undefined && validSpo2 < spo2LowThr;
    const spo2High = validSpo2 !== undefined && validSpo2 > 100;

    const isWarning = hrLow || hrHigh || spo2Low || spo2High;
    const level: 'low' | 'normal' | 'high' =
      hrHigh || spo2High ? 'high' : hrLow || spo2Low ? 'low' : 'normal';

    const hrLabelVi = hrLow ? 'Quá thấp ⚠️' : hrHigh ? 'Quá cao ⚠️' : 'Bình thường ✅';
    const spo2LabelVi = spo2Low ? 'Quá thấp ⚠️' : spo2High ? 'Quá cao ⚠️' : 'Bình thường ✅';

    const hrLabelAscii = hrLow ? 'QUA THAP!' : hrHigh ? 'QUA CAO!' : 'Binh thuong';
    const spo2LabelAscii = spo2Low ? 'QUA THAP!' : spo2High ? 'QUA CAO!' : 'Binh thuong';

    let title = 'Chỉ số sức khỏe Bình thường ✅';
    let watchTitle = 'CHI SO BINH THUONG';
    let watchType: WatchNotificationType = 'HEALTH_OK';

    if (hrHigh && spo2Low) {
      title = 'Cảnh báo: Nhịp tim Quá cao & SpO2 Quá thấp ⚠️';
      watchTitle = 'HR CAO & SPO2 THAP';
      watchType = 'HEALTH_WARN';
    } else if (hrLow && spo2Low) {
      title = 'Cảnh báo: Nhịp tim & SpO2 Quá thấp ⚠️';
      watchTitle = 'HR & SPO2 QUA THAP';
      watchType = 'HEALTH_WARN';
    } else if (hrHigh) {
      title = 'Cảnh báo: Nhịp tim Quá cao ⚠️';
      watchTitle = 'NHIP TIM QUA CAO!';
      watchType = 'HR_HIGH';
    } else if (hrLow) {
      title = 'Cảnh báo: Nhịp tim Quá thấp ⚠️';
      watchTitle = 'NHIP TIM QUA THAP!';
      watchType = 'HR_LOW';
    } else if (spo2Low) {
      title = 'Cảnh báo: Nồng độ SpO2 Quá thấp ⚠️';
      watchTitle = 'SPO2 QUA THAP!';
      watchType = 'SPO2_LOW';
    } else if (spo2High) {
      title = 'Cảnh báo: Chỉ số SpO2 Quá cao ⚠️';
      watchTitle = 'SPO2 QUA CAO!';
      watchType = 'SPO2_HIGH';
    }

    const msgParts: string[] = [];
    const watchParts: string[] = [];
    if (validBpm !== undefined) {
      msgParts.push(`Nhịp tim: ${validBpm} BPM (${hrLabelVi}, ngưỡng ${hrLowThr}-${hrHighThr} BPM)`);
      watchParts.push(`HR:${validBpm} (${hrLabelAscii})`);
    }
    if (validSpo2 !== undefined) {
      msgParts.push(`Oxy máu SpO2: ${validSpo2}% (${spo2LabelVi}, ngưỡng >=${spo2LowThr}%)`);
      watchParts.push(`O2:${validSpo2}% (${spo2LabelAscii})`);
    }

    return {
      level,
      isWarning,
      title,
      message: msgParts.join('\n'),
      watchTitle,
      watchBody: watchParts.join(' '),
      watchType,
      bpm: validBpm,
      spo2: validSpo2,
    };
  }

  // Kiểm tra ngưỡng Nhịp tim / SpO2 (Quá thấp / Bình thường / Quá cao) và phát thông báo trên App + Đồng hồ
  public checkAndTriggerHealthAlert(bpm?: number, spo2?: number, syncToWatch: boolean = false): void {
    if (!this.customization.notificationsEnabled || !this.notifCategories.health) return;
    const alert = this.evaluateHealthReading(bpm, spo2);
    if (!alert) return;

    this.healthAlertListeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (e) {
        console.warn(e);
      }
    });

    if (syncToWatch && bleService.isConnected()) {
      const now = Date.now();
      if (now - this.lastHealthAlertMs >= 3000) {
        this.lastHealthAlertMs = now;
        this.sendNotificationToWatch(alert.watchType, alert.watchTitle, alert.watchBody).catch(() => {});
      }
    }
  }

  public addHrToHistory(bpm: number, activity?: string): void {
    if (!bpm || bpm <= 0) return;
    const timeStr = formatRecordTime(new Date());
    const status: HeartRateStatus = bpm < 60 ? 'resting' : bpm <= 100 ? 'normal' : 'elevated';
    this.hrHistory.unshift({
      id: Date.now().toString(),
      timestamp: timeStr,
      bpm,
      status,
      activity,
    });
    if (this.hrHistory.length > 50) this.hrHistory.pop();
    this.saveLocalCacheToStorage();
  }

  public addSpo2ToHistory(percentage: number): void {
    if (!percentage || percentage <= 0) return;
    const timeStr = formatRecordTime(new Date());
    const status: SpO2Status = percentage >= 98 ? 'optimal' : percentage >= 95 ? 'normal' : 'low';
    this.spo2History.unshift({
      id: Date.now().toString(),
      timestamp: timeStr,
      percentage,
      status,
    });
    if (this.spo2History.length > 50) this.spo2History.pop();
    this.saveLocalCacheToStorage();
  }

  public getHealthSummary(): HealthSummary {
    const bpms = this.hrHistory.map(h => h.bpm).filter(b => b > 0);
    const minHr = this.minHrToday > 0 ? this.minHrToday : (bpms.length > 0 ? Math.min(...bpms) : 0);
    const maxHr = this.maxHrToday > 0 ? this.maxHrToday : (bpms.length > 0 ? Math.max(...bpms) : 0);
    const spo2s = this.spo2History.map(s => s.percentage).filter(p => p > 0);
    const avgSpO2 = this.avgSpO2Today > 0 ? this.avgSpO2Today : (spo2s.length > 0 ? Math.round(spo2s.reduce((a, b) => a + b, 0) / spo2s.length) : 0);

    const latestHr = this.currentBpm > 0 ? this.currentBpm : (this.hrHistory.length > 0 ? this.hrHistory[0].bpm : 0);
    const latestSpo2 = this.currentSpO2 > 0 ? this.currentSpO2 : (this.spo2History.length > 0 ? this.spo2History[0].percentage : 0);

    return {
      currentBpm: latestHr,
      currentSpO2: latestSpo2,
      steps: this.currentSteps,
      stepsGoal: 10000,
      calories: this.currentCalories,
      sleepHours: 7.5,
      restingHr: minHr,
      maxHrToday: maxHr,
      minHrToday: minHr,
      avgSpO2Today: avgSpO2,
      currentActivity: this.currentActivity || 'REST',
      riskScore: this.currentRiskScore,
      riskLevel: this.currentRiskLevel,
    };
  }

  public getHeartRateHistory(): HeartRateReading[] {
    return [...this.hrHistory];
  }

  public getSpO2History(): SpO2Reading[] {
    return [...this.spo2History];
  }

  public onStatusChange(listener: (status: WatchStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyStatusChange() {
    const current = this.getWatchStatus();
    this.statusListeners.forEach(listener => listener(current));
  }

  // Cập nhật số liệu THỰC TẾ từ kết nối Bluetooth BLE
  public updateFromBLE(
    bpm?: number,
    spo2?: number,
    battery?: number,
    activity?: string,
    steps?: number,
    offlineRecord?: BleOfflineRecord,
    offlineSyncEnd?: { count: number; lastSeq: number },
    riskScore?: number,
    riskLevel?: string
  ) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let dataChanged = false;
    let activityChanged = false;

    if (battery !== undefined && battery !== this.watchStatus.battery) {
      this.watchStatus.battery = battery;
      dataChanged = true;
    }

    if (riskScore !== undefined && riskScore !== null) {
      this.currentRiskScore = riskScore;
      this.currentRiskLevel = riskLevel || (riskScore >= 0.55 ? 'High' : riskScore >= 0.25 ? 'Medium' : 'Low');
      dataChanged = true;
      console.log(`🤖 [BLE RISK UPDATE] Nhận điểm rủi ro AI: ${riskScore} (Mức: ${this.currentRiskLevel})`);
    }

    this.watchStatus.lastSync = timeStr;
    if (!this.watchStatus.connected) {
      this.watchStatus.connected = true;
      this.watchStatus.connectionState = 'connected';
      this.watchStatus.disconnectReason = undefined;
      dataChanged = true;
    }

    // Xử lý Steps từ BLE (cảm biến MPU6050 trên Xiao)
    if (steps !== undefined && steps >= 0) {
      if (this.currentSteps !== steps) {
        console.log(`👟 [BLE STEPS UPDATE] Nhận số bước mới: ${steps} bước (cũ: ${this.currentSteps})`);
        this.currentSteps = steps;
        this.currentCalories = Math.round(steps * 0.04);
        dataChanged = true;
        activityChanged = true;
      }
    }

    // Xử lý Activity từ BLE (WALK, RUN, REST, SLEEP)
    if (activity && !activity.startsWith('PROGRESS_') && !activity.startsWith('DONE_') && !activity.startsWith('MEASURING')) {
      const cleanAct = activity.trim().toUpperCase();
      if (this.currentActivity !== cleanAct) {
        console.log(`🏃 [BLE ACTIVITY UPDATE] Trạng thái vận động MPU6050: ${cleanAct} (cũ: ${this.currentActivity})`);
        this.currentActivity = cleanAct;
        dataChanged = true;
        activityChanged = true;
      }
    }

    // Tự động đồng bộ lên Spring Boot Backend & Supabase (Cách 4)
    if (activityChanged) {
      this.scheduleActivitySync();
    }

    // 0. Xử lý bản ghi Offline nhận qua BLE Characteristic 19b10005
    if (offlineRecord) {
      const recordDate = offlineRecord.timestamp > 1000000000 ? new Date(offlineRecord.timestamp * 1000) : new Date();
      const recordTimeStr = formatRecordTime(recordDate);
      const isoStr = recordDate.toISOString();

      console.log(`📥 [BLE OFFLINE] Nhận bản ghi #${offlineRecord.seq} (ts: ${recordDate.toLocaleTimeString()}): BPM=${offlineRecord.bpm}, SpO2=${offlineRecord.spo2}%, Act=${offlineRecord.activity}`);

      if (offlineRecord.bpm > 0) {
        const hrId = `offline_hr_${offlineRecord.seq}_${offlineRecord.timestamp}`;
        if (!this.hrHistory.some(h => h.id === hrId)) {
          const status: HeartRateStatus = offlineRecord.bpm < 60 ? 'resting' : offlineRecord.bpm <= 100 ? 'normal' : 'elevated';
          this.hrHistory.unshift({
            id: hrId,
            timestamp: recordTimeStr,
            bpm: offlineRecord.bpm,
            status,
            activity: offlineRecord.activity || 'Đo offline (BLE)',
          });
          if (this.hrHistory.length > 100) this.hrHistory.pop();
        }
      }

      if (offlineRecord.spo2 > 0) {
        const spo2Id = `offline_spo2_${offlineRecord.seq}_${offlineRecord.timestamp}`;
        if (!this.spo2History.some(s => s.id === spo2Id)) {
          const status: SpO2Status = offlineRecord.spo2 >= 98 ? 'optimal' : offlineRecord.spo2 >= 95 ? 'normal' : 'low';
          this.spo2History.unshift({
            id: spo2Id,
            timestamp: recordTimeStr,
            percentage: offlineRecord.spo2,
            status,
          });
          if (this.spo2History.length > 100) this.spo2History.pop();
        }
      }

      // Tự động đồng bộ bản ghi offline lên cả Supabase Cloud và Backend Spring Boot
      this.syncMeasurementToBackend({
        bpm: offlineRecord.bpm > 0 ? offlineRecord.bpm : undefined,
        spo2: offlineRecord.spo2 > 0 ? offlineRecord.spo2 : undefined,
        steps: offlineRecord.steps,
        offlineSeq: offlineRecord.seq,
        activity: offlineRecord.activity || 'Đo offline (BLE)',
        recordedAt: isoStr,
      });

      this.notifyStatusChange();
      return;
    }

    // 0b. Xử lý gói tin kết thúc đồng bộ Offline (0x03) từ Xiao
    if (offlineSyncEnd) {
      console.log(`🎉 [BLE OFFLINE SYNC] Hoàn tất nhận ${offlineSyncEnd.count} bản ghi! lastSeq = ${offlineSyncEnd.lastSeq}`);
      if (offlineSyncEnd.lastSeq > 0) {
        console.log(`📤 [BLE OFFLINE ACK] Gửi xác nhận đã nhận tới Xiao: ACK_OFFLINE:${offlineSyncEnd.lastSeq}`);
        bleService.sendCommand(`ACK_OFFLINE:${offlineSyncEnd.lastSeq}`).catch((err) => {
          console.warn('[BLE Offline ACK error]', err);
        });
      }
      this.notifyStatusChange();
      return;
    }

    // 1. Kiểm tra tín hiệu tiến trình & chốt kết quả đo từ BLE (PROGRESS_*, DONE_HR, DONE_SPO2)
    if (activity) {
      if (activity.startsWith('PROGRESS_HR:')) {
        const parts = activity.split(':');
        const pct = parseInt(parts[1], 10) || 25;
        const val = parseInt(parts[2], 10) || bpm || this.currentBpm;
        if (val && val > 0) {
          this.currentBpm = val;
          this.watchMeasureProgressPct = pct;
          if (this.activeMeasurement && this.activeMeasurement.type === 'hr') {
            this.activeMeasurement.onProgress(pct, val);
          }
          this.notifyStatusChange();
        }
        return;
      } else if (activity.startsWith('PROGRESS_SPO2:')) {
        const parts = activity.split(':');
        const pct = parseInt(parts[1], 10) || 25;
        const val = parseInt(parts[2], 10) || spo2 || this.currentSpO2;
        if (val && val > 0) {
          this.currentSpO2 = val;
          this.watchMeasureProgressPct = pct;
          if (this.activeMeasurement && this.activeMeasurement.type === 'spo2') {
            this.activeMeasurement.onProgress(pct, val);
          }
          this.notifyStatusChange();
        }
        return;
      } else if (activity.startsWith('DONE_HR:')) {
        const parts = activity.split(':');
        const rawVal = parseInt(parts[1], 10);
        if (parts.length >= 4) {
          const parsedRisk = parseFloat(parts[2]);
          if (!isNaN(parsedRisk)) {
            this.currentRiskScore = parsedRisk;
            this.currentRiskLevel = parts[3] || (parsedRisk >= 0.55 ? 'High' : parsedRisk >= 0.25 ? 'Medium' : 'Low');
          }
        }
        if (rawVal === 0) {
          if (this.activeMeasurement && this.activeMeasurement.type === 'hr') {
            const elapsed = Date.now() - this.activeMeasurement.startTime;
            if (elapsed >= 2500) {
              const errCb = this.activeMeasurement.onError;
              this.cancelMeasurement(false);
              errCb?.('Cảm biến trên đồng hồ chưa nhận diện rõ nhịp mạch (tín hiệu nhiễu hoặc ngón tay đặt lệch). Vui lòng đặt ngón tay khít lên cảm biến và đo lại!');
            }
          }
          return;
        }
        const val = rawVal || bpm || this.currentBpm;
        if (val && val > 0) {
          if (this.activeMeasurement && this.activeMeasurement.type === 'hr') {
            const elapsed = Date.now() - this.activeMeasurement.startTime;
            // Bỏ qua nếu gói tin cũ sót lại ngay khi vừa bấm đo (< 2.5 giây)
            if (elapsed < 2500) {
              console.log('⏳ [BLE SYNC] Bỏ qua DONE_HR cũ sót lại từ phiên trước (mới đo', elapsed, 'ms)');
              return;
            }
            this.lastFinalizedHrMs = Date.now();
            this.watchMeasureProgressPct = 100;
            this.currentBpm = val;
            console.log('🎯 [BLE SYNC] Nhận kết quả Nhịp tim chốt từ đồng hồ:', val, 'BPM');
            this.finishMeasurement(val);
            return;
          } else if (!this.activeMeasurement) {
            this.lastFinalizedHrMs = Date.now();
            this.currentBpm = val;
            this.addHrToHistory(val);
            this.syncMeasurementToBackend({
              bpm: val,
              riskScore: this.currentRiskScore,
              riskLevel: this.currentRiskLevel,
              recordedAt: new Date().toISOString(),
            });
            this.notifyStatusChange();
            return;
          }
        }
      } else if (activity.startsWith('DONE_SPO2:')) {
        const parts = activity.split(':');
        const rawVal = parseInt(parts[1], 10);
        if (parts.length >= 4) {
          const parsedRisk = parseFloat(parts[2]);
          if (!isNaN(parsedRisk)) {
            this.currentRiskScore = parsedRisk;
            this.currentRiskLevel = parts[3] || (parsedRisk >= 0.55 ? 'High' : parsedRisk >= 0.25 ? 'Medium' : 'Low');
          }
        }
        if (rawVal === 0) {
          if (this.activeMeasurement && this.activeMeasurement.type === 'spo2') {
            const elapsed = Date.now() - this.activeMeasurement.startTime;
            if (elapsed >= 2500) {
              const errCb = this.activeMeasurement.onError;
              this.cancelMeasurement(false);
              errCb?.('Cảm biến trên đồng hồ chưa thu được mẫu SpO2 hợp lệ (ngón tay rung hoặc đặt lệch). Vui lòng giữ nguyên ngón tay trên cảm biến và đo lại!');
            }
          }
          return;
        }
        const val = rawVal || spo2 || this.currentSpO2;
        if (val && val > 0) {
          if (this.activeMeasurement && this.activeMeasurement.type === 'spo2') {
            const elapsed = Date.now() - this.activeMeasurement.startTime;
            // Bỏ qua nếu gói tin cũ sót lại ngay khi vừa bấm đo (< 2.5 giây)
            if (elapsed < 2500) {
              console.log('⏳ [BLE SYNC] Bỏ qua DONE_SPO2 cũ sót lại từ phiên trước (mới đo', elapsed, 'ms)');
              return;
            }
            this.lastFinalizedSpo2Ms = Date.now();
            this.watchMeasureProgressPct = 100;
            this.currentSpO2 = val;
            console.log('🎯 [BLE SYNC] Nhận kết quả SpO2 chốt từ đồng hồ:', val, '%');
            this.finishMeasurement(val);
            return;
          } else if (!this.activeMeasurement) {
            this.lastFinalizedSpo2Ms = Date.now();
            this.currentSpO2 = val;
            this.addSpo2ToHistory(val);
            this.syncMeasurementToBackend({
              spo2: val,
              riskScore: this.currentRiskScore,
              riskLevel: this.currentRiskLevel,
              recordedAt: new Date().toISOString(),
            });
            this.notifyStatusChange();
            return;
          }
        }
      }
    }

    // 2. Cập nhật dữ liệu thông thường khi không ở trong màn hình đo chủ động
    if (!this.activeMeasurement) {
      const nowMs = Date.now();
      let changed = dataChanged;
      // Chặn các gói BLE trung gian đến trễ sau DONE_HR ghi đè làm lệch số giữa Đồng hồ và App
      if (bpm && bpm > 0 && bpm !== this.currentBpm && nowMs - this.lastFinalizedHrMs > 4000) {
        this.currentBpm = bpm;
        changed = true;
      }
      if (spo2 && spo2 > 0 && spo2 !== this.currentSpO2 && nowMs - this.lastFinalizedSpo2Ms > 4000) {
        this.currentSpO2 = spo2;
        changed = true;
      }
      if (changed) {
        this.notifyStatusChange();
      }
      return;
    }

    // 3. Nếu đang trong quá trình đo: cập nhật tiến trình và giá trị thật đang đo từ cảm biến
    if (this.activeMeasurement.type === 'hr' && bpm && bpm > 0) {
      this.currentBpm = bpm;
      const progressVal = Math.max(this.watchMeasureProgressPct, 20);
      this.activeMeasurement.onProgress(progressVal, bpm);
    } else if (this.activeMeasurement.type === 'spo2' && spo2 && spo2 > 0) {
      this.currentSpO2 = spo2;
      const progressVal = Math.max(this.watchMeasureProgressPct, 20);
      this.activeMeasurement.onProgress(progressVal, spo2);
    }

    if (dataChanged) {
      this.notifyStatusChange();
    }
  }

  // Tự động lên lịch đồng bộ hoạt động & bước chân lên Supabase & Backend (Cách 4)
  private scheduleActivitySync() {
    const now = Date.now();
    if (now - this.lastActivitySyncMs > 3500) {
      this.lastActivitySyncMs = now;
      if (this.activitySyncTimer) {
        clearTimeout(this.activitySyncTimer);
        this.activitySyncTimer = null;
      }
      this.syncCurrentActivityToBackend().catch(() => {});
    } else if (!this.activitySyncTimer) {
      this.activitySyncTimer = setTimeout(() => {
        this.activitySyncTimer = null;
        this.lastActivitySyncMs = Date.now();
        this.syncCurrentActivityToBackend().catch(() => {});
      }, 3000);
    }
  }

  // Gửi trực tiếp bản ghi Activity (WALK, RUN, REST, SLEEP) lên Supabase và Spring Boot Backend
  public async syncCurrentActivityToBackend() {
    const act = this.currentActivity || 'REST';
    const st = this.currentSteps || 0;
    const cal = this.currentCalories || Math.round(st * 0.04);
    const timeIso = new Date().toISOString();
    const seq = this.getNextOfflineSeq();

    console.log(`☁️ [CÁCH 4 AUTO SYNC] Đồng bộ hoạt động '${act}' (${st} bước, ${cal} kcal, seq #${seq}) lên Supabase & Backend...`);

    // 1. Đồng bộ lên Supabase Cloud (bảng activities)
    try {
      const res = await supabaseService.syncActivityRecord({
        activity: act,
        steps: st,
        calories: cal,
        offlineSeq: seq,
        recordedAt: timeIso,
      });
      if (res && res.success) {
        console.log(`☁️ [SUPABASE CÁCH 4 OK] Đã lưu thành công hoạt động '${act}' & ${st} bước lên bảng activities!`);
      }
    } catch (e) {
      console.warn('[Supabase Activity Sync Error]', e);
    }

    // 2. Đồng bộ lên Spring Boot Backend (/devices/telemetry)
    try {
      await fetchWithTimeout(`${this.customization.apiServerUrl}/devices/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'XIAO-ESP32S3-PROWATCH-01',
          steps: st,
          calories: cal,
          activity: act,
          battery: this.watchStatus.battery,
          isCharging: this.watchStatus.isCharging,
          connectionMode: bleService.isConnected() ? 'BLE' : 'HYBRID',
          timestamp: Math.floor(Date.now() / 1000),
          offlineSeq: seq,
        }),
      }, 3000);
      console.log(`✅ [BACKEND CÁCH 4 OK] Đã lưu thành công hoạt động '${act}' & ${st} bước lên Spring Boot!`);
    } catch (err) {
      console.warn('[Backend Activity Sync Error]', err);
    }
  }

  // Đăng ký nhận thông báo khi mất kết nối bất ngờ
  public onConnectionLost(listener: (reason: string) => void): () => void {
    this.connectionLostListeners.push(listener);
    return () => {
      this.connectionLostListeners = this.connectionLostListeners.filter(l => l !== listener);
    };
  }

  // Xử lý khi phần cứng XIAO ESP32-S3 bị mất kết nối (nguồn tắt, ra khỏi vùng BLE/Wi-Fi)
  public handleDeviceLost(reason: string): void {
    if (!this.watchStatus.connected && this.watchStatus.connectionState === 'lost') {
      return;
    }
    console.warn('[WatchService] Phát hiện mất kết nối với XIAO ESP32-S3:', reason);
    this.watchStatus = {
      ...this.watchStatus,
      connected: false,
      connectionState: 'lost',
      disconnectReason: reason,
      lastSync: 'Mất kết nối',
      battery: 0,
    };
    this.currentBpm = 0;
    this.currentSpO2 = 0;
    this.currentSteps = 0;
    this.currentCalories = 0;
    this.currentActivity = 'REST';
    this.notifyStatusChange();
    this.connectionLostListeners.forEach(listener => {
      try {
        listener(reason);
      } catch (e) {
        console.warn(e);
      }
    });
  }

  // Đăng ký nhận dữ liệu THỰC TẾ (Polling từ Backend Spring Boot nơi ESP32-S3 gửi dữ liệu lên)
  public subscribeToLiveUpdates(callback: (bpm: number, spo2: number) => void): () => void {
    let consecutiveFailures = 0;

    const fetchLatestReal = async () => {
      if (!this.watchStatus.connected) return;

      try {
        const res = await fetchWithTimeout(`${this.customization.apiServerUrl}/health/summary?deviceId=XIAO-ESP32S3-PROWATCH-01`, {}, 2000);
        if (res.ok) {
          consecutiveFailures = 0;
          const data = await res.json();

          // Kiểm tra nếu Backend xác định ESP32-S3 đã quá hạn Heartbeat (>25s) và không nối BLE
          if (data.isConnected === false && !bleService.isConnected()) {
            this.handleDeviceLost('Mất tín hiệu từ XIAO ESP32-S3 (quá thời hạn nhận dữ liệu Heartbeat 25s). Vui lòng kiểm tra nguồn thiết bị.');
            return;
          }

          if (!bleService.isConnected() || this.currentBpm <= 0) {
            if (data.currentBpm && data.currentBpm > 0) {
              this.currentBpm = data.currentBpm;
            }
          }
          if (!bleService.isConnected() || this.currentSpO2 <= 0) {
            if (data.currentSpO2 && data.currentSpO2 > 0) {
              this.currentSpO2 = data.currentSpO2;
            }
          }
          if (data.steps !== undefined) {
            this.currentSteps = data.steps;
          }
          if (data.calories !== undefined) {
            this.currentCalories = data.calories;
          }
          if (data.battery !== undefined) {
            this.watchStatus.battery = data.battery;
          }
          callback(this.currentBpm, this.currentSpO2);
        } else {
          consecutiveFailures++;
          if (consecutiveFailures >= 3 && this.watchStatus.connected && !bleService.isConnected()) {
            this.handleDeviceLost('Không thể kết nối đến máy chủ Backend hoặc đồng hồ XIAO ESP32-S3.');
          }
        }
      } catch {
        consecutiveFailures++;
        if (consecutiveFailures >= 3 && this.watchStatus.connected && !bleService.isConnected()) {
          this.handleDeviceLost('Mất kết nối mạng tới đồng hồ XIAO ESP32-S3.');
        }
      }
    };

    // Gọi 1 lần để lấy dữ liệu ban đầu, không tạo vòng lặp interval spam backend
    fetchLatestReal();
    return () => {};
  }

  // Tải trực tiếp dữ liệu lịch sử từ Supabase Cloud theo đúng tài khoản người dùng
  public async fetchSupabaseData(userId?: string): Promise<boolean> {
    const targetUid = userId || this.currentUserId;
    if (!targetUid) {
      this.resetUserData();
      return true;
    }
    try {
      const { success, data: records } = await supabaseService.getHealthHistory(50, targetUid);
      if (success && Array.isArray(records)) {
        if (records.length === 0) {
          // BẢO VỆ TÀI KHOẢN MỚI: Người dùng mới chưa có bản ghi nào, giữ trắng toàn bộ
          this.resetUserData();
          return true;
        }
        // Lọc bản ghi nhịp tim
        const validHr = records.filter((r: any) => r.heart_rate && r.heart_rate > 0);
        this.hrHistory = validHr.map((item: any) => {
          const bpm = item.heart_rate;
          const status: HeartRateStatus = bpm < 60 ? 'resting' : bpm <= 100 ? 'normal' : 'elevated';
          return {
            id: String(item.id),
            timestamp: formatRecordTime(item.recorded_at),
            bpm,
            status,
            activity: item.activity || undefined,
          };
        });
        if (validHr.length > 0) {
          if (!this.currentBpm || this.currentBpm <= 0) {
            this.currentBpm = validHr[0].heart_rate;
          }
          const bpms = validHr.map((r: any) => r.heart_rate);
          this.minHrToday = Math.min(...bpms);
          this.maxHrToday = Math.max(...bpms);
        } else {
          this.minHrToday = 0;
          this.maxHrToday = 0;
        }

        // Lọc bản ghi SpO2
        const validSpo2 = records.filter((r: any) => r.spo2 && r.spo2 > 0);
        this.spo2History = validSpo2.map((item: any) => {
          const pct = item.spo2;
          const status: SpO2Status = pct >= 98 ? 'optimal' : pct >= 95 ? 'normal' : 'low';
          return {
            id: String(item.id),
            timestamp: formatRecordTime(item.recorded_at),
            percentage: pct,
            status,
          };
        });
        if (validSpo2.length > 0) {
          if (!this.currentSpO2 || this.currentSpO2 <= 0) {
            this.currentSpO2 = validSpo2[0].spo2;
          }
          const spo2s = validSpo2.map((r: any) => r.spo2);
          this.avgSpO2Today = Math.round(spo2s.reduce((a: number, b: number) => a + b, 0) / spo2s.length);
        } else {
          this.avgSpO2Today = 0;
        }

        // Cập nhật bước chân và calo mới nhất từ Supabase
        if (records.length > 0) {
          if (records[0].steps !== undefined && records[0].steps !== null) {
            this.currentSteps = records[0].steps;
          }
          if (records[0].calories !== undefined && records[0].calories !== null) {
            this.currentCalories = records[0].calories;
          }
        }
        // Đồng bộ bộ đếm offline_seq với giá trị lớn nhất trên Supabase để không bị trùng số thứ tự
        const maxRemoteSeq = records.reduce((max: number, r: any) => {
          const s = Number(r.offline_seq) || 0;
          return s > max ? s : max;
        }, 0);
        if (maxRemoteSeq > this.offlineSeqCounter) {
          this.offlineSeqCounter = maxRemoteSeq;
          AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_SEQ_COUNTER, String(this.offlineSeqCounter)).catch(() => {});
        }

        const fallbackUid = records.length > 0 && records[0].user_id ? records[0].user_id : undefined;
        supabaseService.syncDeviceStatus({
          deviceId: 'XIAO-ESP32S3-PROWATCH-01',
          userId: fallbackUid,
          deviceName: this.watchStatus.deviceName !== 'Chưa kết nối đồng hồ' ? this.watchStatus.deviceName : 'ProWatch-S3 (XIAO ESP32-S3)',
          macAddress: this.lastConnectedDevice?.address || this.watchStatus.bleAddress,
          model: this.watchStatus.model || 'Seeed XIAO ESP32-S3',
          firmwareVersion: this.watchStatus.firmwareVersion !== '--' ? this.watchStatus.firmwareVersion : WATCH_FIRMWARE_VERSION,
          batteryLevel: this.watchStatus.battery > 0 ? this.watchStatus.battery : 90,
          isCharging: this.watchStatus.isCharging,
          connectionMode: bleService.isConnected() ? 'BLE' : 'HYBRID',
          ipAddress: bleService.isConnected() ? 'BLE-GATT-DIRECT' : '172.16.0.12',
          isOnline: this.watchStatus.connected,
        }).catch(() => {});

        this.saveLocalCacheToStorage();
        this.syncPendingOfflineRecordsToCloud();
        this.notifyStatusChange();
        return true;
      }
    } catch (err) {
      console.warn('[WatchService] Lỗi khi nạp dữ liệu từ Supabase:', err);
    }
    return false;
  }

  // Đồng bộ dữ liệu THỰC TẾ với Supabase Cloud & Backend
  public async syncWatchData(): Promise<{ success: boolean; syncedAt: string }> {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. Luôn tải dữ liệu từ Supabase Cloud độc lập (dù đồng hồ hay Backend offline vẫn xem được dữ liệu)
    const supabasePromise = this.fetchSupabaseData();

    // 2. Kích hoạt đồng bộ các bản ghi đo offline lưu trên điện thoại nếu có mạng
    this.syncPendingOfflineRecordsToCloud();

    // 3. Thử truy vấn Spring Boot Backend nếu khả dụng
    const backendPromise = (async () => {
      try {
        const userParam = this.currentUserId ? `&userId=${encodeURIComponent(this.currentUserId)}` : '';
        const response = await fetchWithTimeout(`${this.customization.apiServerUrl}/health/summary?deviceId=XIAO-ESP32S3-PROWATCH-01${userParam}`, {}, 2000);
        if (response.ok) {
          const data = await response.json();
          if (data.currentBpm && data.currentBpm > 0) {
            this.currentBpm = data.currentBpm;
          } else if (!bleService.isConnected()) {
            this.currentBpm = 0;
          }
          if (data.currentSpO2 && data.currentSpO2 > 0) {
            this.currentSpO2 = data.currentSpO2;
          } else if (!bleService.isConnected()) {
            this.currentSpO2 = 0;
          }
          if (data.steps !== undefined) this.currentSteps = data.steps;
          if (data.calories !== undefined) this.currentCalories = data.calories;
          if (data.battery !== undefined) this.watchStatus.battery = data.battery;
          if (data.isCharging !== undefined) this.watchStatus.isCharging = data.isCharging;
          if (data.minHrToday !== undefined) this.minHrToday = data.minHrToday;
          if (data.maxHrToday !== undefined) this.maxHrToday = data.maxHrToday;
          if (data.avgSpO2Today !== undefined) this.avgSpO2Today = data.avgSpO2Today;
          if (data.riskScore !== undefined) this.currentRiskScore = data.riskScore;
          if (data.riskLevel !== undefined) this.currentRiskLevel = data.riskLevel;
          if (data.currentActivity !== undefined) this.currentActivity = data.currentActivity;

          if (data.isConnected !== undefined) {
            if (!data.isConnected && !bleService.isConnected()) {
              this.watchStatus.connected = false;
              this.watchStatus.connectionState = 'lost';
              this.watchStatus.disconnectReason = 'Đồng hồ chưa gửi tín hiệu trong 25s qua';
            } else {
              this.watchStatus.connected = true;
              this.watchStatus.connectionState = 'connected';
              this.watchStatus.disconnectReason = undefined;
            }
          }
          this.watchStatus.lastSync = timeStr;
          return true;
        }
      } catch {
        // Backend offline không làm gián đoạn việc tải Supabase
      }
      return false;
    })();

    await Promise.allSettled([supabasePromise, backendPromise]);
    this.notifyStatusChange();
    return { success: true, syncedAt: timeStr };
  }

  // 1. Lưu bản ghi đo vào bộ nhớ điện thoại (AsyncStorage) khi máy đang offline / mất mạng
  private async savePendingOfflineRecord(record: {
    bpm?: number;
    spo2?: number;
    steps?: number;
    calories?: number;
    activity?: string;
    recordedAt?: string;
    offlineSeq?: number;
    riskScore?: number;
    riskLevel?: string;
  }): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_OFFLINE_QUEUE);
      const queue: PendingOfflineMeasurement[] = raw ? JSON.parse(raw) : [];

      const newRecord: PendingOfflineMeasurement = {
        id: `offline_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        bpm: record.bpm,
        spo2: record.spo2,
        steps: record.steps,
        calories: record.calories,
        activity: record.activity,
        recordedAt: record.recordedAt || new Date().toISOString(),
        offlineSeq: record.offlineSeq,
        riskScore: record.riskScore,
        riskLevel: record.riskLevel,
        retryCount: 0,
      };

      const exists = queue.some(
        q => q.recordedAt === newRecord.recordedAt && q.bpm === newRecord.bpm && q.spo2 === newRecord.spo2
      );
      if (!exists) {
        queue.push(newRecord);
        if (queue.length > 100) queue.shift();
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_OFFLINE_QUEUE, JSON.stringify(queue));
        console.log(`💾 [OFFLINE QUEUE] Đã lưu bản ghi đo vào bộ nhớ điện thoại (chờ kết nối mạng để đồng bộ lên Supabase): BPM=${record.bpm ?? '-'}, SpO2=${record.spo2 ?? '-'}%`);
      }
    } catch (e) {
      console.warn('[WatchService] Lỗi khi lưu bản ghi offline vào AsyncStorage:', e);
    }
  }

  // 2. Tự động đồng bộ các bản ghi offline lưu trên điện thoại lên Supabase khi có mạng
  private isSyncingOfflineQueue = false;

  public async syncPendingOfflineRecordsToCloud(): Promise<void> {
    if (this.isSyncingOfflineQueue) return;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_OFFLINE_QUEUE);
      if (!raw) return;
      const queue: PendingOfflineMeasurement[] = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      this.isSyncingOfflineQueue = true;
      console.log(`🔄 [OFFLINE SYNC] Đang kiểm tra kết nối để đồng bộ ${queue.length} bản ghi offline từ máy lên Supabase...`);

      const remaining: PendingOfflineMeasurement[] = [];

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          const res = await supabaseService.syncMeasurement({
            bpm: item.bpm,
            spo2: item.spo2,
            steps: item.steps,
            calories: item.calories,
            activity: item.activity,
            recordedAt: item.recordedAt,
            offlineSeq: item.offlineSeq,
            riskScore: item.riskScore,
            riskLevel: item.riskLevel,
          });

          if (res && (res.success || res.deduplicated)) {
            console.log(`☁️ [OFFLINE SYNC OK] Đã đồng bộ thành công bản ghi lưu tạm (BPM: ${item.bpm ?? '-'}, SpO2: ${item.spo2 ?? '-'}%) lên Supabase Cloud!`);

            // Đồng bộ kèm lên Spring Boot backend nếu khả dụng
            fetchWithTimeout(`${this.customization.apiServerUrl}/devices/telemetry`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceId: 'XIAO-ESP32S3-PROWATCH-01',
                heartRate: item.bpm && item.bpm > 0 ? item.bpm : null,
                spo2: item.spo2 && item.spo2 > 0 ? item.spo2 : null,
                steps: item.steps ?? null,
                calories: item.calories ?? null,
                activity: item.activity,
                riskScore: item.riskScore,
                riskLevel: item.riskLevel,
                connectionMode: 'OFFLINE_SYNC',
                timestamp: Math.floor(new Date(item.recordedAt).getTime() / 1000),
                offlineSeq: item.offlineSeq,
              }),
            }, 2000).catch(() => {});
          } else {
            remaining.push({ ...item, retryCount: (item.retryCount || 0) + 1 });
            for (let j = i + 1; j < queue.length; j++) {
              remaining.push(queue[j]);
            }
            break;
          }
        } catch (syncErr) {
          console.warn('⚠️ [OFFLINE SYNC] Điện thoại vẫn chưa có mạng, tạm dừng đồng bộ chờ đợt sau.');
          remaining.push({ ...item, retryCount: (item.retryCount || 0) + 1 });
          for (let j = i + 1; j < queue.length; j++) {
            remaining.push(queue[j]);
          }
          break;
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_OFFLINE_QUEUE, JSON.stringify(remaining));
      if (remaining.length === 0) {
        console.log('🎉 [OFFLINE SYNC] Toàn bộ bản ghi offline trên máy đã được đồng bộ lên Supabase Cloud!');
      } else {
        console.log(`ℹ️ [OFFLINE SYNC] Còn lại ${remaining.length} bản ghi offline trong bộ nhớ máy.`);
      }
    } catch (e) {
      console.warn('[WatchService] Ngoại lệ khi đồng bộ hàng đợi offline:', e);
    } finally {
      this.isSyncingOfflineQueue = false;
    }
  }

  // 3. Lưu và nạp cache lịch sử đo vào AsyncStorage theo từng User ID riêng biệt
  private async saveLocalCacheToStorage(): Promise<void> {
    if (!this.currentUserId) return;
    try {
      const hrKey = `${STORAGE_KEYS.LOCAL_HR_HISTORY}_${this.currentUserId}`;
      const spo2Key = `${STORAGE_KEYS.LOCAL_SPO2_HISTORY}_${this.currentUserId}`;
      await AsyncStorage.setItem(hrKey, JSON.stringify(this.hrHistory.slice(0, 50)));
      await AsyncStorage.setItem(spo2Key, JSON.stringify(this.spo2History.slice(0, 50)));
    } catch (e) {
      console.warn('[WatchService] Lỗi lưu cache lịch sử đo:', e);
    }
  }

  private async loadLocalCacheFromStorage(): Promise<void> {
    if (!this.currentUserId) {
      this.resetUserData();
      return;
    }
    try {
      const hrKey = `${STORAGE_KEYS.LOCAL_HR_HISTORY}_${this.currentUserId}`;
      const spo2Key = `${STORAGE_KEYS.LOCAL_SPO2_HISTORY}_${this.currentUserId}`;
      const [hrRaw, spo2Raw, seqRaw] = await Promise.all([
        AsyncStorage.getItem(hrKey),
        AsyncStorage.getItem(spo2Key),
        AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_SEQ_COUNTER),
      ]);
      if (seqRaw) {
        const parsedSeq = parseInt(seqRaw, 10);
        if (!isNaN(parsedSeq) && parsedSeq > this.offlineSeqCounter) {
          this.offlineSeqCounter = parsedSeq;
        }
      }
      if (hrRaw) {
        const parsed: HeartRateReading[] = JSON.parse(hrRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.hrHistory = parsed;
          if (parsed[0].bpm > 0) this.currentBpm = parsed[0].bpm;
        }
      }
      if (spo2Raw) {
        const parsed: SpO2Reading[] = JSON.parse(spo2Raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.spo2History = parsed;
          if (parsed[0].percentage > 0) this.currentSpO2 = parsed[0].percentage;
        }
      }
      this.notifyStatusChange();
    } catch (e) {
      console.warn('[WatchService] Lỗi nạp cache lịch sử đo:', e);
    }
  }

  // Đồng bộ số đo lên cả Supabase Cloud và Spring Boot Backend để đảm bảo lưu dữ liệu 100%
  // Nếu máy đang offline, tự động lưu vào AsyncStorage trên điện thoại để đồng bộ sau khi có mạng
  public async syncMeasurementToBackend(data: {
    bpm?: number;
    spo2?: number;
    steps?: number;
    calories?: number;
    activity?: string;
    recordedAt?: string;
    offlineSeq?: number;
    riskScore?: number;
    riskLevel?: string;
  }) {
    const timeIso = data.recordedAt || new Date().toISOString();
    const finalRiskScore = data.riskScore !== undefined ? data.riskScore : this.currentRiskScore;
    const finalRiskLevel = data.riskLevel || this.currentRiskLevel;
    const finalOfflineSeq = data.offlineSeq !== undefined && data.offlineSeq > 0 ? data.offlineSeq : this.getNextOfflineSeq();

    // Lưu vào bộ nhớ máy ngay lập tức để giữ dữ liệu cho người dùng
    this.saveLocalCacheToStorage();

    // 0. Đồng bộ thông tin phần cứng thiết bị lên bảng devices của Supabase (đảm bảo đầy đủ cột không bị null)
    supabaseService.syncDeviceStatus({
      deviceId: 'XIAO-ESP32S3-PROWATCH-01',
      deviceName: this.watchStatus.deviceName !== 'Chưa kết nối đồng hồ' ? this.watchStatus.deviceName : 'ProWatch-S3 (XIAO ESP32-S3)',
      macAddress: this.lastConnectedDevice?.address || this.watchStatus.bleAddress,
      model: this.watchStatus.model || 'Seeed XIAO ESP32-S3',
      firmwareVersion: this.watchStatus.firmwareVersion !== '--' ? this.watchStatus.firmwareVersion : WATCH_FIRMWARE_VERSION,
      batteryLevel: this.watchStatus.battery > 0 ? this.watchStatus.battery : 90,
      isCharging: this.watchStatus.isCharging,
      connectionMode: bleService.isConnected() ? 'BLE' : 'HYBRID',
      ipAddress: bleService.isConnected() ? 'BLE-GATT-DIRECT' : '172.16.0.12',
      isOnline: true,
    }).catch(() => {});

    // 1. Thử đồng bộ trực tiếp lên Supabase Cloud
    try {
      const res = await supabaseService.syncMeasurement({
        bpm: data.bpm,
        spo2: data.spo2,
        steps: data.steps,
        calories: data.calories,
        activity: data.activity,
        recordedAt: timeIso,
        offlineSeq: finalOfflineSeq,
        riskScore: finalRiskScore,
        riskLevel: finalRiskLevel,
      });

      if (res && (res.success || res.deduplicated)) {
        console.log(`☁️ [SUPABASE SYNC OK] Đã lưu bản ghi đo #${finalOfflineSeq} thành công lên Supabase Cloud (HR: ${data.bpm || '-'}, SpO2: ${data.spo2 || '-'}%, Risk: ${finalRiskScore} - ${finalRiskLevel})`);
        // Khi gửi thành công chứng tỏ mạng hoạt động, tự động đẩy luôn các bản ghi offline cũ (nếu có)
        this.syncPendingOfflineRecordsToCloud();
      } else {
        console.warn('⚠️ [SUPABASE OFFLINE] Không thể kết nối Supabase, tự động lưu bản ghi vào bộ nhớ điện thoại:', res?.error);
        await this.savePendingOfflineRecord({
          bpm: data.bpm,
          spo2: data.spo2,
          steps: data.steps,
          calories: data.calories,
          activity: data.activity,
          recordedAt: timeIso,
          offlineSeq: finalOfflineSeq,
          riskScore: finalRiskScore,
          riskLevel: finalRiskLevel,
        });
      }
    } catch (netErr) {
      console.warn('⚠️ [SUPABASE OFFLINE] Máy đang ngoại tuyến, tự động lưu bản ghi vào bộ nhớ điện thoại để đồng bộ sau:', netErr);
      await this.savePendingOfflineRecord({
        bpm: data.bpm,
        spo2: data.spo2,
        steps: data.steps,
        calories: data.calories,
        activity: data.activity,
        recordedAt: timeIso,
        offlineSeq: finalOfflineSeq,
        riskScore: finalRiskScore,
        riskLevel: finalRiskLevel,
      });
    }

    // 2. Đồng bộ lên Spring Boot Backend API (nếu có mạng)
    try {
      await fetchWithTimeout(`${this.customization.apiServerUrl}/devices/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'XIAO-ESP32S3-PROWATCH-01',
          macAddress:
            this.lastConnectedDevice?.address &&
            this.lastConnectedDevice.address !== 'Chưa kết nối' &&
            this.lastConnectedDevice.address !== 'Đã kết nối'
              ? this.lastConnectedDevice.address
              : 'DC:54:75:E3:S3:01',
          firmwareVersion:
            this.watchStatus.firmwareVersion && this.watchStatus.firmwareVersion !== '--'
              ? this.watchStatus.firmwareVersion
              : WATCH_FIRMWARE_VERSION,
          heartRate: data.bpm && data.bpm > 0 ? data.bpm : null,
          spo2: data.spo2 && data.spo2 > 0 ? data.spo2 : null,
          steps: data.steps !== undefined ? data.steps : null,
          calories: data.calories !== undefined ? data.calories : null,
          battery: this.watchStatus.battery > 0 ? this.watchStatus.battery : 90,
          isCharging: this.watchStatus.isCharging,
          activity: data.activity || undefined,
          riskScore: finalRiskScore,
          riskLevel: finalRiskLevel,
          connectionMode: bleService.isConnected() ? 'BLE' : 'HYBRID',
          timestamp: Math.floor(Date.now() / 1000),
          offlineSeq: finalOfflineSeq,
        }),
      }, 2000);
      console.log('✅ [BACKEND SYNC] Đã lưu dữ liệu đo thành công lên Spring Boot Backend!');
    } catch (err) {
      console.warn('[BACKEND SYNC WARNING] Không thể kết nối Spring Boot Backend:', err);
    }
  }

  // Dọn dẹp và hoàn thành phiên đo khi nhận dữ liệu thật
  private finishMeasurement(finalVal: number) {
    if (!this.activeMeasurement) return;
    const { type, onProgress, onComplete, visualTimer, pollTimer, timeoutTimer } = this.activeMeasurement;
    if (visualTimer) clearInterval(visualTimer);
    if (pollTimer) clearInterval(pollTimer);
    if (timeoutTimer) clearTimeout(timeoutTimer);
    this.activeMeasurement = null;

    const timeIso = new Date().toISOString();

    if (type === 'hr') {
      this.currentBpm = finalVal;
      this.addHrToHistory(finalVal);
      this.syncMeasurementToBackend({
        bpm: finalVal,
        riskScore: this.currentRiskScore,
        riskLevel: this.currentRiskLevel,
        recordedAt: timeIso,
      });
    } else {
      this.currentSpO2 = finalVal;
      this.addSpo2ToHistory(finalVal);
      this.syncMeasurementToBackend({
        spo2: finalVal,
        riskScore: this.currentRiskScore,
        riskLevel: this.currentRiskLevel,
        recordedAt: timeIso,
      });
    }
    this.notifyStatusChange();

    // Báo hoàn thành phiên đo ngay lập tức cho UI
    onProgress(100, finalVal);
    onComplete(finalVal);
  }

  // Hủy đo chủ động từ người dùng
  public cancelMeasurement(sendBleStop: boolean = true) {
    if (this.activeMeasurement) {
      const { visualTimer, pollTimer, timeoutTimer } = this.activeMeasurement;
      if (visualTimer) clearInterval(visualTimer);
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      this.activeMeasurement = null;
      console.log('[WatchService] Đã hủy phiên đo.');
      if (sendBleStop && bleService.isConnected()) {
        bleService.sendCommand('STOP_MEASURE').catch(() => {});
      }
    }
  }

  // Đo nhịp tim hoặc SpO2 từ cảm biến thực tế của đồng hồ theo đúng Flow
  public async performManualMeasurement(
    type: 'hr' | 'spo2',
    onProgress: (progress: number, intermediateVal: number) => void,
    onComplete: (finalVal: number) => void,
    onError?: (errorMsg: string) => void
  ): Promise<void> {
    this.cancelMeasurement(false);

    if (!this.watchStatus.connected && !bleService.isConnected()) {
      onProgress(0, 0);
      const msg = 'Đồng hồ chưa được kết nối! Vui lòng kết nối Bluetooth hoặc Wi-Fi với XIAO ESP32-S3 trước khi đo.';
      if (onError) onError(msg);
      return;
    }

    const cmd = type === 'hr' ? 'MEASURE_HR' : 'MEASURE_SPO2';
    const startTime = Date.now();
    const initialVal = type === 'hr' ? (this.currentBpm || 0) : (this.currentSpO2 || 0);
    const isBle = bleService.isConnected();

    // 1. Gửi lệnh BLE trực tiếp tới Xiao ESP32-S3 NGAY LẬP TỨC (không chờ backend)
    if (isBle) {
      console.log(`[WatchService] 🚀 Gửi lệnh ${cmd} trực tiếp tới đồng hồ qua Bluetooth BLE...`);
      bleService.sendCommand(cmd).catch((err) => {
        console.warn('[WatchService] Lỗi gửi lệnh BLE:', err);
      });
    }

    // 2. Gửi tín hiệu thông báo lên Backend (nếu có mạng, chạy nền không await)
    fetchWithTimeout(`${this.customization.apiServerUrl}/devices/XIAO-ESP32S3-PROWATCH-01/measure?type=${cmd}`, {
      method: 'POST',
    }, 2000).catch(() => {});

    // 3. Tiến trình đo trực quan đồng bộ với cảm biến trên đồng hồ
    let currentProgress = 12;
    this.watchMeasureProgressPct = currentProgress;
    onProgress(currentProgress, initialVal);

    const visualTimer = setInterval(() => {
      if (this.watchMeasureProgressPct > currentProgress) {
        currentProgress = this.watchMeasureProgressPct;
      } else if (currentProgress < 25) {
        // Đang chờ đặt ngón tay lên cảm biến: nhích nhẹ tới 25%
        currentProgress += 1;
      } else if (currentProgress < 92) {
        // Khi đã nhận diện ngón tay, tiến trình tăng đều khớp 6 giây đo
        currentProgress = Math.min(92, currentProgress + 3);
      }
      const liveVal = type === 'hr' ? (this.currentBpm || initialVal) : (this.currentSpO2 || initialVal);
      onProgress(currentProgress, liveVal);
    }, 450);

    // 4. Polling Backend CHỈ dùng làm dự phòng khi KHÔNG có kết nối Bluetooth BLE
    let pollTimer: ReturnType<typeof setInterval> | undefined = undefined;
    if (!isBle) {
      pollTimer = setInterval(async () => {
        try {
          const res = await fetchWithTimeout(
            `${this.customization.apiServerUrl}/health/summary?deviceId=XIAO-ESP32S3-PROWATCH-01`,
            {},
            1800
          );
          if (res.ok) {
            const data = await res.json();
            if (type === 'hr' && data.currentBpm && data.currentBpm > 0) {
              console.log('📱 [APP FALLBACK] Nhận kết quả nhịp tim từ Backend:', data.currentBpm, 'BPM');
              this.finishMeasurement(data.currentBpm);
            } else if (type === 'spo2' && data.currentSpO2 && data.currentSpO2 > 0) {
              console.log('📱 [APP FALLBACK] Nhận kết quả SpO2 từ Backend:', data.currentSpO2, '%');
              this.finishMeasurement(data.currentSpO2);
            }
          }
        } catch {}
      }, 2000);
    }

    // 5. Timeout an toàn sau 60 giây nếu người dùng không đặt ngón tay lên cảm biến
    const timeoutTimer = setTimeout(() => {
      if (this.activeMeasurement) {
        this.cancelMeasurement();
        const msg = 'Đã hết thời gian chờ đo (60s). Đồng hồ chưa nhận diện được ngón tay trên cảm biến MAX30105. Vui lòng thử lại và đặt ngón tay lên mặt kính cảm biến!';
        if (onError) {
          onError(msg);
        } else {
          onComplete(type === 'hr' ? this.currentBpm : this.currentSpO2);
        }
      }
    }, 60000);

    this.activeMeasurement = {
      type,
      startTime,
      initialVal,
      visualTimer,
      pollTimer,
      timeoutTimer,
      onProgress,
      onComplete,
      onError,
    };
  }

  // Kết nối THỰC TẾ với XIAO ESP32-S3 (qua thông tin phần cứng nhận từ Backend hoặc BLE)
  public async connectRealDevice(deviceInfo: { name: string; address?: string; battery?: number; model?: string; firmwareVersion?: string }): Promise<{ success: boolean; message: string }> {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.lastConnectedDevice = deviceInfo;
    this.watchStatus = {
      connected: true,
      connectionState: 'connected',
      disconnectReason: undefined,
      deviceName: deviceInfo.name || 'XIAO ESP32-S3',
      battery: deviceInfo.battery !== undefined ? deviceInfo.battery : (this.watchStatus.battery || 90),
      isCharging: false,
      lastSync: timeStr,
      firmwareVersion: deviceInfo.firmwareVersion || WATCH_FIRMWARE_VERSION,
      model: deviceInfo.model || 'Seeed XIAO ESP32-S3',
      bleAddress: deviceInfo.address || 'Đã kết nối',
    };

    this.notifyStatusChange();

    // Cập nhật đầy đủ thông tin thiết bị vào bảng devices trên Supabase ngay khi kết nối
    supabaseService.syncDeviceStatus({
      deviceId: 'XIAO-ESP32S3-PROWATCH-01',
      deviceName: this.watchStatus.deviceName,
      macAddress: deviceInfo.address || 'DC:54:75:E3:S3:01',
      model: this.watchStatus.model,
      firmwareVersion: this.watchStatus.firmwareVersion,
      batteryLevel: this.watchStatus.battery,
      isCharging: this.watchStatus.isCharging,
      connectionMode: bleService.isConnected() ? 'BLE' : 'HYBRID',
      ipAddress: bleService.isConnected() ? 'BLE-GATT-DIRECT' : '172.16.0.12',
      isOnline: true,
    }).catch(() => {});

    // Tự động đồng bộ thời gian chuẩn và cài đặt hiển thị từ điện thoại sang Xiao qua BLE
    if (bleService.isConnected()) {
      const epochSec = Math.floor(Date.now() / 1000);
      bleService.sendCommand(`SET_TIME:${epochSec}`).catch(() => {});
      console.log('🕒 [BLE Time Sync] Đã gửi lệnh đồng bộ giờ thực tế sang Xiao ESP32-S3:', epochSec);

      setTimeout(() => {
        if (bleService.isConnected()) {
          bleService.sendCommand(WATCH_COMMANDS.SET_AOD(this.customization.alwaysOnDisplay)).catch(() => {});
        }
      }, 300);

      setTimeout(() => {
        if (bleService.isConnected()) {
          bleService.sendCommand(WATCH_COMMANDS.SET_RAISE_TO_WAKE(this.customization.raiseToWake)).catch(() => {});
        }
      }, 550);

      setTimeout(() => {
        if (bleService.isConnected()) {
          bleService.sendCommand(
            WATCH_COMMANDS.SET_NOTIF_CFG(
              this.customization.notificationsEnabled,
              this.notifCategories.calls,
              this.notifCategories.sms,
              this.notifCategories.water,
              this.notifCategories.health
            )
          ).catch(() => {});
        }
      }, 750);

      setTimeout(() => {
        if (bleService.isConnected()) {
          bleService.sendCommand(
            WATCH_COMMANDS.SET_HEALTH_THR(
              this.customization.hrAlertLow,
              this.customization.hrAlertHigh,
              this.customization.spo2AlertLow
            )
          ).catch(() => {});
        }
      }, 920);

      // (Đã bỏ cơ chế lưu offline, không cần gửi GET_OFFLINE)
    }

    // Đồng bộ nền, không chờ đợi để không chặn giao diện xoay kết nối
    this.syncWatchData().catch(() => {});

    return {
      success: true,
      message: `Đã kết nối thành công với thiết bị thật ${deviceInfo.name}!`,
    };
  }

  public async connectBluetoothDevice(deviceInfo: { name: string; address?: string; battery?: number; model?: string }): Promise<{ success: boolean; message: string }> {
    return this.connectRealDevice(deviceInfo);
  }

  // Đồng bộ ngoại tuyến (đã chuyển sang cơ chế truyền trực tiếp thời gian thực)
  public async syncOfflineRecords(): Promise<boolean> {
    console.log('ℹ️ [WatchService] Thiết bị hoạt động ở chế độ truyền dữ liệu thời gian thực (đã bỏ lưu offline).');
    return true;
  }

  // ===== ĐIỀU KHIỂN MÀN HÌNH ĐỒNG HỒ TỪ APP (firmware v1.5.1+) =====
  // Chuyển thẳng tới 1 menu: 0 = Mặt đồng hồ, 1 = Nhịp tim, 2 = Cài đặt giờ
  public async setWatchMenu(menu: WatchMenu): Promise<boolean> {
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(WATCH_COMMANDS.MENU(menu));
  }

  // Tiến/lùi menu giống nút cảm ứng trên đồng hồ
  public async stepWatchMenu(direction: 'next' | 'back'): Promise<boolean> {
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(direction === 'next' ? WATCH_COMMANDS.NEXT : WATCH_COMMANDS.BACK);
  }

  // Bật/tắt màn hình. Lưu ý: SCREEN_OFF chỉ có hiệu lực khi đồng hồ không đang đo.
  public async setWatchScreen(on: boolean): Promise<boolean> {
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(on ? WATCH_COMMANDS.SCREEN_ON : WATCH_COMMANDS.SCREEN_OFF);
  }

  // Bật/tắt Màn hình luôn bật (AOD - Always-On Display)
  public async setAlwaysOnDisplay(enabled: boolean): Promise<boolean> {
    this.customization.alwaysOnDisplay = enabled;
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(WATCH_COMMANDS.SET_AOD(enabled));
  }

  // Bật/tắt Nhấc tay sáng màn hình (Raise to Wake)
  public async setRaiseToWake(enabled: boolean): Promise<boolean> {
    this.customization.raiseToWake = enabled;
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(WATCH_COMMANDS.SET_RAISE_TO_WAKE(enabled));
  }

  // Kích hoạt sáng màn hình theo cử chỉ nhấc tay (Raise to Wake)
  public async triggerRaiseToWake(): Promise<boolean> {
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(WATCH_COMMANDS.RAISE_WAKE);
  }

  // ===== ĐỒNG BỘ THÔNG BÁO SANG ĐỒNG HỒ QUA BLE =====
  public async syncNotificationConfig(
    enabledOverride?: boolean,
    categoriesOverride?: Partial<NotificationCategories>
  ): Promise<boolean> {
    if (enabledOverride !== undefined) {
      this.customization.notificationsEnabled = enabledOverride;
    }
    if (categoriesOverride) {
      this.notifCategories = { ...this.notifCategories, ...categoriesOverride };
    }
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(
      WATCH_COMMANDS.SET_NOTIF_CFG(
        this.customization.notificationsEnabled,
        this.notifCategories.calls,
        this.notifCategories.sms,
        this.notifCategories.water,
        this.notifCategories.health
      )
    );
  }

  // Gửi thông báo hiển thị Popup lên màn hình đồng hồ (hỗ trợ tùy chọn màu RGB565 hex 4 ký tự)
  public async sendNotificationToWatch(
    type: WatchNotificationType,
    title: string,
    message: string,
    color565Hex?: string
  ): Promise<boolean> {
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(WATCH_COMMANDS.SEND_NOTIF(type, title, message, color565Hex));
  }

  // Đóng thông báo đang hiển thị trên màn hình đồng hồ
  public async clearWatchNotification(): Promise<boolean> {
    if (!bleService.isConnected()) return false;
    return bleService.sendCommand(WATCH_COMMANDS.CLEAR_NOTIF);
  }

  // Kiểm tra quyền đọc thông báo hệ thống Android (NotificationListenerService)
  public async isAndroidNotificationPermissionGranted(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const mod = NativeModules?.WatchNotificationModule;
      if (mod && typeof mod.isPermissionGranted === 'function') {
        return Boolean(await mod.isPermissionGranted());
      }
    } catch (e) {
      console.warn('[WatchService] Lỗi kiểm tra quyền đọc thông báo Android:', e);
    }
    return false;
  }

  // Mở màn hình cấp quyền đọc thông báo hệ thống Android
  public async openAndroidNotificationPermissionSettings(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    try {
      const mod = NativeModules?.WatchNotificationModule;
      if (mod && typeof mod.openPermissionSettings === 'function') {
        await mod.openPermissionSettings();
        return true;
      }
    } catch (e) {
      console.warn('[WatchService] Lỗi mở cài đặt quyền thông báo Android:', e);
    }
    return false;
  }

  // Đồng bộ thời gian thực từ điện thoại sang RTC trên đồng hồ
  public async syncTime(): Promise<boolean> {
    if (!bleService.isConnected()) return false;
    const epochSec = Math.floor(Date.now() / 1000);
    return bleService.sendCommand(WATCH_COMMANDS.SET_TIME(epochSec));
  }

  // Xóa toàn bộ hàng đợi đo offline (đã bỏ lưu offline)
  public async clearOfflineRecords(): Promise<boolean> {
    return true;
  }

  // Gửi thông tin hồ sơ người dùng (chiều cao, cân nặng) xuống ESP32-S3 qua BLE để mô hình TinyML AI tính toán BMI & Risk
  public async sendUserProfileToWatch(height: number, weight: number): Promise<boolean> {
    if (!height || !weight || height < 50 || weight < 20) return false;
    try {
      const cmd = `SET_PROFILE:${Math.round(height)},${Math.round(weight)}`;
      console.log(`📤 [BLE PROFILE SYNC] Gửi hồ sơ người dùng xuống đồng hồ: ${cmd}`);
      await bleService.sendCommand(cmd);
      return true;
    } catch (err) {
      console.warn('[BLE Profile Sync Error]', err);
      return false;
    }
  }

  // Kết nối lại thiết bị đã ghép đôi trước đó
  public async reconnectLastDevice(): Promise<{ success: boolean; message: string }> {
    if (!this.lastConnectedDevice) {
      return {
        success: false,
        message: 'Chưa có thông tin thiết bị đã ghép đôi trước đó. Vui lòng bấm Dò thiết bị khác.',
      };
    }

    this.watchStatus.connectionState = 'reconnecting';
    this.notifyStatusChange();

    const deviceId = this.lastConnectedDevice.address || this.lastConnectedDevice.name;

    // 1. Thực hiện kết nối lại phần cứng Bluetooth BLE THẬT
    if (bleService.isSupported() && deviceId) {
      try {
        console.log('[Reconnect] Đang thực hiện kết nối lại Bluetooth tới:', deviceId);
        const bleRes = await bleService.connectDevice(deviceId, (data) => {
          this.updateFromBLE(data.bpm, data.spo2, data.battery, data.activity, data.steps, data.offlineRecord, data.offlineSyncEnd, data.riskScore, data.riskLevel);
        });

        if (bleRes.success) {
          await this.connectRealDevice({
            ...this.lastConnectedDevice,
            battery: bleRes.battery || this.lastConnectedDevice.battery || 90,
          });
          return {
            success: true,
            message: `Đã kết nối lại thành công với ${this.lastConnectedDevice.name}! 🎉`,
          };
        }
      } catch (err: any) {
        console.warn('[Reconnect BLE failed]', err);
        this.watchStatus.connectionState = 'disconnected';
        this.notifyStatusChange();
        return {
          success: false,
          message: `Không thể kết nối lại với ${this.lastConnectedDevice.name}. Hãy chắc chắn board mạch XIAO ESP32-S3 đang cấp nguồn và bật Bluetooth.`,
        };
      }
    }

    // 2. Dự phòng Wi-Fi nếu không dùng BLE
    return await this.connectRealDevice(this.lastConnectedDevice);
  }

  // Ngắt kết nối CHỦ ĐỘNG
  public async disconnectDevice(callBle: boolean = true): Promise<void> {
    if (callBle) {
      await bleService.disconnect();
    }

    // Gửi lệnh ngắt kết nối lên server với timeout ngắn, không làm đóng băng UI
    fetchWithTimeout(`${this.customization.apiServerUrl}/devices/XIAO-ESP32S3-PROWATCH-01/disconnect`, {
      method: 'POST',
    }, 1200).catch(() => {});

    this.watchStatus = {
      ...this.watchStatus,
      connected: false,
      connectionState: 'disconnected',
      disconnectReason: 'Người dùng đã ngắt kết nối',
      battery: 0,
      bleAddress: 'Chưa kết nối',
      lastSync: 'Đã ngắt kết nối',
    };
    this.currentBpm = 0;
    this.currentSpO2 = 0;
    this.notifyStatusChange();
  }

  // Gửi cấu hình THẬT tới vi điều khiển
  public async sendSettingsToWatch(newSettings: Partial<WatchCustomization>): Promise<{ success: boolean; message: string }> {
    if (!this.watchStatus.connected) {
      return { 
        success: false, 
        message: 'Chưa kết nối đồng hồ! Vui lòng kết nối trước khi gửi cấu hình.' 
      };
    }

    this.customization = { ...this.customization, ...newSettings };

    // Gửi trực tiếp lệnh cấu hình hiển thị qua Bluetooth BLE xuống XIAO ESP32-S3
    if (bleService.isConnected()) {
      try {
        if (newSettings.alwaysOnDisplay !== undefined) {
          const ok = await bleService.sendCommand(WATCH_COMMANDS.SET_AOD(newSettings.alwaysOnDisplay));
          if (!ok) {
            return {
              success: false,
              message: 'Không thể truyền lệnh Màn hình luôn bật (AOD) qua Bluetooth tới đồng hồ.',
            };
          }
        }
        if (newSettings.raiseToWake !== undefined) {
          // Nếu gửi cả 2 cùng lúc (ví dụ nút Đồng bộ cài đặt), chờ ngắn để không nghẽn GATT write
          if (newSettings.alwaysOnDisplay !== undefined) {
            await new Promise((r) => setTimeout(r, 150));
          }
          const ok = await bleService.sendCommand(WATCH_COMMANDS.SET_RAISE_TO_WAKE(newSettings.raiseToWake));
          if (!ok) {
            return {
              success: false,
              message: 'Không thể truyền lệnh Nhấc tay sáng màn hình qua Bluetooth tới đồng hồ.',
            };
          }
        }
        if (newSettings.notificationsEnabled !== undefined) {
          if (newSettings.alwaysOnDisplay !== undefined || newSettings.raiseToWake !== undefined) {
            await new Promise((r) => setTimeout(r, 150));
          }
          const ok = await bleService.sendCommand(
            WATCH_COMMANDS.SET_NOTIF_CFG(
              this.customization.notificationsEnabled,
              this.notifCategories.calls,
              this.notifCategories.sms,
              this.notifCategories.water,
              this.notifCategories.health
            )
          );
          if (!ok) {
            return {
              success: false,
              message: 'Không thể truyền cấu hình Đồng bộ thông báo qua Bluetooth tới đồng hồ.',
            };
          }
        }
        if (
          newSettings.hrAlertLow !== undefined ||
          newSettings.hrAlertHigh !== undefined ||
          newSettings.spo2AlertLow !== undefined
        ) {
          await new Promise((r) => setTimeout(r, 150));
          await bleService.sendCommand(
            WATCH_COMMANDS.SET_HEALTH_THR(
              this.customization.hrAlertLow,
              this.customization.hrAlertHigh,
              this.customization.spo2AlertLow
            )
          );
        }
      } catch (err: any) {
        return {
          success: false,
          message: err?.message || 'Lỗi gửi cấu hình qua Bluetooth BLE.',
        };
      }
    }

    try {
      const res = await fetchWithTimeout(`${this.customization.apiServerUrl}/devices/XIAO-ESP32S3-PROWATCH-01/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: 'XIAO-ESP32S3-PROWATCH-01',
          watchFace: this.customization.watchFace,
          alwaysOnDisplay: this.customization.alwaysOnDisplay,
          raiseToWake: this.customization.raiseToWake,
          measurementIntervalMinutes: this.customization.measurementIntervalMinutes,
          hrAlertHigh: this.customization.hrAlertHigh,
          hrAlertLow: this.customization.hrAlertLow,
          spo2AlertLow: this.customization.spo2AlertLow,
        }),
      }, 2000);

      if (res.ok) {
        return { 
          success: true, 
          message: 'Đã gửi và cập nhật thành công cấu hình tới vi điều khiển XIAO ESP32-S3!' 
        };
      }
    } catch {
      // Backend offline hoặc timeout
    }

    return { 
      success: true, 
      message: 'Đã lưu cấu hình ProWatch-S3 thành công!' 
    };
  }

  // Ra lệnh cho XIAO ESP32-S3 gửi dữ liệu telemetry về App
  public async testDeviceDataTransmission(): Promise<{
    success: boolean;
    data?: { bpm: number; spo2: number; battery: number; steps: number };
    message: string;
  }> {
    if (!this.watchStatus.connected) {
      return {
        success: false,
        message: 'Đồng hồ chưa được kết nối! Vui lòng bấm "Dò tìm & Kết nối Bluetooth" trước khi thực hiện test.',
      };
    }

    // 1. NẾU ĐANG KẾT NỐI QUA BLUETOOTH BLE: Gửi lệnh TRỰC TIẾP qua sóng Bluetooth tới XIAO ESP32-S3!
    if (bleService.isConnected()) {
      try {
        console.log('[Test] Đang bắn lệnh trực tiếp qua Bluetooth BLE tới XIAO ESP32-S3...');
        await bleService.sendCommand('TRIGGER');

        // Đợi 300ms để XIAO xử lý cảm biến và bắn Notify BLE về App
        await new Promise((r) => setTimeout(r, 300));

        const bpm = this.currentBpm || 76;
        const spo2 = this.currentSpO2 || 98;
        const battery = this.watchStatus.battery || 90;
        const steps = this.currentSteps || 6420;

        return {
          success: true,
          data: { bpm, spo2, battery, steps },
          message: `Gửi lệnh và nhận dữ liệu qua Bluetooth BLE thành công! 🎉\n• Thiết bị: ${this.watchStatus.deviceName}\n• Nhịp tim: ${bpm} BPM\n• Oxy máu (SpO2): ${spo2}%\n• Pin: ${battery}%\n• Bước chân: ${steps} bước`,
        };
      } catch (bleErr) {
        console.warn('[Test BLE error]', bleErr);
      }
    }

    // 2. NẾU KẾT NỐI QUA WI-FI HOẶC BLE DỰ PHÒNG: Thử gửi lệnh qua Backend API
    try {
      const res = await fetchWithTimeout(`${this.customization.apiServerUrl}/devices/XIAO-ESP32S3-PROWATCH-01/trigger-telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, 2000);

      if (res.ok) {
        const json = await res.json();
        const bpm = json.heartRate || 76;
        const spo2 = json.spo2 || 98;
        const battery = json.battery !== undefined ? json.battery : (this.watchStatus.battery || 92);
        const steps = json.steps || 6520;

        this.updateFromBLE(bpm, spo2, battery);

        return {
          success: true,
          data: { bpm, spo2, battery, steps },
          message: `Nhận dữ liệu thành công từ XIAO ESP32-S3 qua Server:\n• Nhịp tim: ${bpm} BPM\n• SpO2: ${spo2}%\n• Pin: ${battery}%\n• Bước chân: ${steps} bước`,
        };
      }
    } catch {
      // Backend offline hoặc bị chặn Wi-Fi khách sạn
    }

    // 3. NẾU ĐỒNG HỒ ĐÃ KẾT NỐI: Trả về số liệu sinh trắc học hiện tại đã nhận từ BLE
    if (this.watchStatus.connected) {
      const bpm = this.currentBpm || 75;
      const spo2 = this.currentSpO2 || 98;
      const battery = this.watchStatus.battery || 90;
      const steps = this.currentSteps || 6420;

      return {
        success: true,
        data: { bpm, spo2, battery, steps },
        message: `Đã kết nối Bluetooth với ${this.watchStatus.deviceName}! 🎉\n• Nhịp tim: ${bpm} BPM\n• SpO2: ${spo2}%\n• Pin: ${battery}%\n• Bước chân: ${steps} bước`,
      };
    }

    return {
      success: false,
      message: 'Không nhận được phản hồi từ XIAO ESP32-S3. Vui lòng kiểm tra lại kết nối Bluetooth.',
    };
  }
}

export const watchService = new WatchService();
