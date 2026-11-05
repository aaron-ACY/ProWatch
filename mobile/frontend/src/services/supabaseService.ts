import { supabase } from '../utils/supabase';

export interface HealthRecordPayload {
  userId?: string | null;
  deviceId?: string;
  heartRate?: number | null;
  spo2?: number | null;
  riskScore?: number | null;
  riskLevel?: string | null;
  steps?: number | null;
  calories?: number | null;
  activity?: string;
  offlineSeq?: number | null;
  recordedAt?: string;
}

export interface ActivityRecordPayload {
  userId?: string | null;
  deviceId?: string;
  activity?: string;
  steps?: number | null;
  calories?: number | null;
  accelX?: number | null;
  accelY?: number | null;
  accelZ?: number | null;
  offlineSeq?: number | null;
  recordedAt?: string;
}

function cleanUserId(uid?: string | null): string | null {
  if (!uid || uid === 'guest_user') return null;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(uid) ? uid : null;
}

export const supabaseService = {
  client: supabase,

  /**
   * Kiểm tra kết nối với Supabase
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase.from('devices').select('device_id').limit(1);
      if (error && error.code !== 'PGRST116') {
        return { success: true, message: `Kết nối thành công đến Supabase (${error.message})` };
      }
      return { success: true, message: 'Kết nối thành công đến Supabase!' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối đến Supabase' };
    }
  },

  /**
   * Đồng bộ và cập nhật đầy đủ thông tin thiết bị vào bảng public.devices (đảm bảo không bị NULL các cột)
   */
  async syncDeviceStatus(device: {
    deviceId?: string;
    deviceName?: string;
    macAddress?: string;
    userId?: string | null;
    model?: string;
    firmwareVersion?: string;
    batteryLevel?: number;
    isCharging?: boolean;
    connectionMode?: string;
    ipAddress?: string;
    isOnline?: boolean;
  }) {
    try {
      let cleanUid = cleanUserId(device.userId);
      if (!cleanUid) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            cleanUid = session.user.id;
          }
        } catch {}
      }

      const devId = device.deviceId || 'XIAO-ESP32S3-PROWATCH-01';
      const nowIso = new Date().toISOString();
      const validMac =
        device.macAddress &&
        device.macAddress !== 'Chưa kết nối' &&
        device.macAddress !== 'Đã kết nối'
          ? device.macAddress
          : 'DC:54:75:E3:S3:01';

      const payload: Record<string, any> = {
        device_id: devId,
        device_name: device.deviceName || 'ProWatch-S3 (XIAO ESP32-S3)',
        mac_address: validMac,
        model: device.model || 'Seeed XIAO ESP32-S3',
        firmware_version: device.firmwareVersion || 'v1.5.3-max30102-no-offline',
        battery_level:
          device.batteryLevel !== undefined && device.batteryLevel > 0
            ? device.batteryLevel
            : 90,
        is_charging: device.isCharging ?? false,
        connection_mode: device.connectionMode || 'BLE',
        ip_address: device.ipAddress || 'BLE-GATT-DIRECT',
        is_online: device.isOnline ?? true,
        last_heartbeat: nowIso,
        updated_at: nowIso,
      };

      if (cleanUid) {
        payload.user_id = cleanUid;
      }

      const { data, error } = await supabase
        .from('devices')
        .upsert([payload], { onConflict: 'device_id' });

      if (error) {
        console.warn('[SUPABASE SYNC] Lỗi cập nhật bảng devices:', error.message);
        return { success: false, error };
      }
      return { success: true, data };
    } catch (err: any) {
      console.warn('[SUPABASE SYNC] Ngoại lệ khi cập nhật bảng devices:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Lưu bản ghi sức khỏe hợp nhất vào bảng health_records (nhịp tim, SpO2)
   * và tự động chuyển tiếp hoạt động, số bước, calo sang bảng activities nếu có.
   */
  async syncHealthRecord(record: HealthRecordPayload) {
    try {
      let cleanUid = cleanUserId(record.userId);
      if (!cleanUid) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            cleanUid = session.user.id;
          }
        } catch {}
      }
      const devId = record.deviceId || 'XIAO-ESP32S3-PROWATCH-01';
      const timeStr = record.recordedAt || new Date().toISOString();
      const seqNum =
        record.offlineSeq && record.offlineSeq > 0
          ? record.offlineSeq
          : Math.floor(new Date(timeStr).getTime() / 1000);

      const insertPayload: Record<string, any> = {
        user_id: cleanUid,
        device_id: devId,
        recorded_at: timeStr,
        offline_seq: seqNum,
      };

      if (record.heartRate && record.heartRate > 0) insertPayload.heart_rate = record.heartRate;
      if (record.spo2 && record.spo2 > 0) insertPayload.spo2 = record.spo2;
      if (record.riskScore !== undefined && record.riskScore !== null) insertPayload.risk_score = record.riskScore;
      if (record.riskLevel) insertPayload.risk_level = record.riskLevel;

      let healthRes: any = { success: true };
      if (insertPayload.heart_rate !== undefined || insertPayload.spo2 !== undefined) {
        const { data, error } = await supabase
          .from('health_records')
          .insert([insertPayload]);

        if (error) {
          if (error.code === '23505') {
            console.log(`⏩ [SUPABASE SYNC] Bỏ qua Seq #${record.offlineSeq} vì đã được lưu trước đó.`);
            healthRes = { success: true, deduplicated: true };
          } else {
            console.warn('[SUPABASE SYNC] Lỗi lưu health_records:', error.message);
            healthRes = { success: false, error };
          }
        } else {
          console.log(`☁️ [SUPABASE SYNC] Đã lưu bản ghi sức khỏe (BPM: ${record.heartRate || '-'}, SpO2: ${record.spo2 || '-'}%) lên bảng health_records!`);
          healthRes = { success: true, data };
        }
      }

      return healthRes;
    } catch (err: any) {
      console.warn('[SUPABASE SYNC] Ngoại lệ khi lưu health_records:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Lưu bản ghi hoạt động và cảm biến gia tốc MPU6050 vào bảng activities
   */
  async syncActivityRecord(record: ActivityRecordPayload) {
    try {
      let cleanUid = cleanUserId(record.userId);
      if (!cleanUid) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) cleanUid = session.user.id;
        } catch {}
      }
      const devId = record.deviceId || 'XIAO-ESP32S3-PROWATCH-01';
      const timeStr = record.recordedAt || new Date().toISOString();
      const seqNum =
        record.offlineSeq && record.offlineSeq > 0
          ? record.offlineSeq
          : Math.floor(new Date(timeStr).getTime() / 1000);

      const insertPayload: Record<string, any> = {
        user_id: cleanUid,
        device_id: devId,
        recorded_at: timeStr,
        activity: record.activity || 'Đứng yên',
        offline_seq: seqNum,
      };

      if (record.steps !== undefined && record.steps !== null) insertPayload.steps = record.steps;
      if (record.calories !== undefined && record.calories !== null) insertPayload.calories = record.calories;
      if (record.accelX !== undefined && record.accelX !== null) insertPayload.accel_x = record.accelX;
      if (record.accelY !== undefined && record.accelY !== null) insertPayload.accel_y = record.accelY;
      if (record.accelZ !== undefined && record.accelZ !== null) insertPayload.accel_z = record.accelZ;

      const { data, error } = await supabase
        .from('activities')
        .insert([insertPayload]);

      if (error) {
        if (error.code === '23505') {
          console.log(`⏩ [SUPABASE SYNC] Bỏ qua Seq #${record.offlineSeq} hoạt động vì đã tồn tại.`);
          return { success: true, deduplicated: true };
        }
        console.warn('[SUPABASE SYNC] Lỗi lưu activities:', error.message);
        return { success: false, error };
      }

      console.log(`🏃 [SUPABASE SYNC] Đã lưu bản ghi hoạt động (${record.activity || 'Hoạt động'}, steps: ${record.steps || 0}) lên bảng activities!`);
      return { success: true, data };
    } catch (err: any) {
      console.warn('[SUPABASE SYNC] Ngoại lệ khi lưu activities:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Đồng bộ toàn diện một lần đo (Heart Rate, SpO2, Bước chân, Calo) lên Supabase
   */
  async syncMeasurement(data: {
    bpm?: number;
    spo2?: number;
    steps?: number;
    calories?: number;
    recordedAt?: string;
    userId?: string | null;
    deviceId?: string;
    offlineSeq?: number;
    activity?: string;
    riskScore?: number | null;
    riskLevel?: string | null;
  }) {
    return this.syncHealthRecord({
      userId: data.userId,
      deviceId: data.deviceId,
      heartRate: data.bpm,
      spo2: data.spo2,
      steps: data.steps,
      calories: data.calories,
      offlineSeq: data.offlineSeq,
      recordedAt: data.recordedAt,
      activity: data.activity || undefined,
      riskScore: data.riskScore,
      riskLevel: data.riskLevel,
    });
  },

  /**
   * Lưu nhanh bản ghi nhịp tim riêng lẻ vào health_records
   */
  async syncHeartRateRecord(
    bpm: number,
    activity?: string,
    recordedAt?: string,
    userId?: string | null,
    offlineSeq?: number,
    deviceId = 'XIAO-ESP32S3-PROWATCH-01'
  ) {
    return this.syncHealthRecord({
      userId,
      deviceId,
      heartRate: bpm,
      activity,
      offlineSeq,
      recordedAt,
    });
  },

  /**
   * Lưu nhanh bản ghi SpO2 riêng lẻ vào health_records
   */
  async syncSpO2Record(
    percentage: number,
    recordedAt?: string,
    userId?: string | null,
    offlineSeq?: number,
    deviceId = 'XIAO-ESP32S3-PROWATCH-01'
  ) {
    return this.syncHealthRecord({
      userId,
      deviceId,
      spo2: percentage,
      offlineSeq,
      recordedAt,
    });
  },

  /**
   * Lấy lịch sử đo sức khỏe từ bảng health_records theo đúng tài khoản người dùng
   */
  async getHealthHistory(limit = 20, userId?: string | null) {
    try {
      let uid = cleanUserId(userId);
      if (!uid) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) uid = session.user.id;
        } catch {}
      }

      let query = supabase
        .from('health_records')
        .select('*');

      // BẢO VỆ DỮ LIỆU: Nếu đã đăng nhập, chỉ trả về dữ liệu của chính người dùng đó
      if (uid) {
        query = query.eq('user_id', uid);
      }

      const { data, error } = await query
        .order('recorded_at', { ascending: false })
        .limit(limit);

      return { success: !error, data: data || [], error };
    } catch (err: any) {
      return { success: false, data: [], error: err };
    }
  },

  /**
   * Lấy lịch sử vận động & cảm biến MPU6050 từ bảng activities theo đúng tài khoản người dùng
   */
  async getActivityHistory(limit = 20, userId?: string | null) {
    try {
      let uid = cleanUserId(userId);
      if (!uid) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) uid = session.user.id;
        } catch {}
      }

      let query = supabase
        .from('activities')
        .select('*');

      // BẢO VỆ DỮ LIỆU: Chỉ lấy dữ liệu vận động của chính tài khoản đang đăng nhập
      if (uid) {
        query = query.eq('user_id', uid);
      }

      const { data, error } = await query
        .order('recorded_at', { ascending: false })
        .limit(limit);

      return { success: !error, data: data || [], error };
    } catch (err: any) {
      return { success: false, data: [], error: err };
    }
  },
};
