// Định nghĩa dữ liệu cảm biến MAX30102 và MPU6050
export interface MPU6050Data {
  accel_x: number; // m/s^2 hoặc g
  accel_y: number;
  accel_z: number;
  gyro_x: number;  // deg/s
  gyro_y: number;
  gyro_z: number;
  accel_magnitude: number; // sqrt(x^2 + y^2 + z^2)
}

export interface MAX30102Data {
  heart_rate: number; // BPM
  spo2: number;       // %
  confidence: number; // Độ tin cậy tín hiệu quang học (%)
}

export interface SensorTelemetry {
  id: string;
  device_id: string;
  timestamp: string;
  max30102: MAX30102Data;
  mpu6050: MPU6050Data;
  battery: number;
  is_charging: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'SYNCING';
}

export interface MeasurementRecord {
  id: string;
  device_id: string;
  recorded_at: string;
  heart_rate: number;
  spo2: number;
  accel_magnitude: number;
  dominant_activity?: string;
  is_anomaly: boolean;
  notes?: string;
  status?: string;
  risk_level?: string;
}
