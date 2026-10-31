import { AIModel, AIPrediction, N8nWorkflowExecution } from '../types/ai';
import { MeasurementRecord, SensorTelemetry } from '../types/sensor';

// Models đã huấn luyện
export const SEED_MODELS: AIModel[] = [
  {
    id: 'model-health-risk-mlp',
    version: 'v1.0.0-TinyML',
    name: 'ProWatch Health Risk MLP (TinyML)',
    algorithm: 'TinyML MLP',
    target_task: 'Đánh giá rủi ro tim mạch & chuyển hóa (Health Risk)',
    trained_at: '2026-10-29 20:50:30',
    training_samples: 32353,
    is_active: true,
    benchmarks: {
      preprocessing: 'StandardScaler (6 vital features)',
      normalization: 'Z-Score Standardization (Fit trên Train Set)',
      model_size: '3.03 KB (TFLite INT8 Micro)',
      ram_usage: '2.4 KB',
      inference_time: '1.2 ms / sample',
      accuracy: 1.0,
    },
    metrics: {
      accuracy: 1.0,
      precision: 1.0,
      recall: 1.0,
      f1_score: 1.0,
      loss: 0.00003,
      confusion_matrix: {
        labels: ['Low (Thấp)', 'Medium (Vừa)', 'High (Cao)'],
        matrix: [
          [4411, 0, 0],
          [0, 2060, 0],
          [0, 0, 0],
        ],
      },
    },
    model_path: 'model/riskscore/artifacts/health_risk_model_int8.tflite',
  },
  {
    id: 'model-001',
    version: 'v2.1.0',
    name: 'ProWatch HAR 1D-CNN (Max & MPU)',
    algorithm: '1D-CNN',
    target_task: 'Phân loại hoạt động (HAR)',
    trained_at: '2026-10-21 15:40:00',
    training_samples: 48500,
    is_active: true,
    benchmarks: {
      preprocessing: 'Sliding Window 128 (overlap 50%), Bandpass 0.5-4Hz',
      normalization: 'StandardScaler (Z-Score)',
      model_size: '1.42 MB (ONNX)',
      ram_usage: '48.2 MB',
      inference_time: '12.8 ms / sample',
      accuracy: 0.964,
    },
    metrics: {
      accuracy: 0.964,
      precision: 0.958,
      recall: 0.961,
      f1_score: 0.959,
      loss: 0.084,
      confusion_matrix: {
        labels: ['Ngồi', 'Đi bộ', 'Chạy', 'Nằm'],
        matrix: [
          [98, 2, 0, 0],
          [3, 94, 3, 0],
          [0, 4, 96, 0],
          [1, 0, 0, 99],
        ],
      },
    },
    model_path: 's3://prowatch-models/har_1dcnn_v2.1.0.onnx',
  },
  {
    id: 'model-002',
    version: 'v1.4.0',
    name: 'Fall Detection Guard (LSTM-Attention)',
    algorithm: 'LSTM-Attention',
    target_task: 'Phát hiện ngã (Fall Detection)',
    trained_at: '2026-10-18 09:12:00',
    training_samples: 12200,
    is_active: false,
    benchmarks: {
      preprocessing: 'Temporal Sliding Window 256, Low-pass FIR Filter',
      normalization: 'MinMaxScaler [-1, 1]',
      model_size: '3.85 MB (PyTorch)',
      ram_usage: '92.4 MB',
      inference_time: '24.6 ms / sample',
      accuracy: 0.982,
    },
    metrics: {
      accuracy: 0.982,
      precision: 0.975,
      recall: 0.988,
      f1_score: 0.981,
      loss: 0.042,
      confusion_matrix: {
        labels: ['Bình thường', 'Ngã bất ngờ'],
        matrix: [
          [992, 8],
          [2, 198],
        ],
      },
    },
    model_path: 's3://prowatch-models/fall_guard_lstm_v1.4.0.pt',
  },
  {
    id: 'model-003',
    version: 'v1.0.0',
    name: 'Baseline Activity Classifier (RandomForest)',
    algorithm: 'RandomForest',
    target_task: 'Phân loại hoạt động (HAR)',
    trained_at: '2026-10-10 11:00:00',
    training_samples: 25000,
    is_active: false,
    benchmarks: {
      preprocessing: 'Statistical Features (Mean, Std, Peak-to-Peak)',
      normalization: 'RobustScaler (IQR)',
      model_size: '820 KB (Joblib)',
      ram_usage: '18.6 MB',
      inference_time: '4.1 ms / sample',
      accuracy: 0.912,
    },
    metrics: {
      accuracy: 0.912,
      precision: 0.905,
      recall: 0.908,
      f1_score: 0.906,
      mae: 0.098,
      confusion_matrix: {
        labels: ['Ngồi', 'Đi bộ', 'Chạy', 'Nằm'],
        matrix: [
          [91, 7, 0, 2],
          [6, 89, 5, 0],
          [0, 8, 92, 0],
          [3, 1, 0, 96],
        ],
      },
    },
    model_path: 's3://prowatch-models/har_rf_v1.0.0.joblib',
  },
];

// Lịch sử đo (Measurement History)
export const SEED_HISTORY: MeasurementRecord[] = [
  {
    id: 'rec-101',
    device_id: 'ESP32S3-PROWATCH',
    recorded_at: '11:20:00',
    heart_rate: 76,
    spo2: 99,
    accel_magnitude: 9.82,
    dominant_activity: 'Đang ngồi',
    is_anomaly: false,
  },
  {
    id: 'rec-102',
    device_id: 'ESP32S3-PROWATCH',
    recorded_at: '11:15:00',
    heart_rate: 84,
    spo2: 98,
    accel_magnitude: 12.45,
    dominant_activity: 'Đang đi bộ',
    is_anomaly: false,
  },
  {
    id: 'rec-103',
    device_id: 'ESP32S3-PROWATCH',
    recorded_at: '11:10:00',
    heart_rate: 132,
    spo2: 97,
    accel_magnitude: 21.60,
    dominant_activity: 'Đang chạy bộ',
    is_anomaly: false,
    notes: 'Vận động cường độ cao',
  },
  {
    id: 'rec-104',
    device_id: 'ESP32S3-PROWATCH',
    recorded_at: '11:05:00',
    heart_rate: 110,
    spo2: 98,
    accel_magnitude: 14.20,
    dominant_activity: 'Đang đi bộ',
    is_anomaly: false,
  },
  {
    id: 'rec-105',
    device_id: 'ESP32S3-PROWATCH',
    recorded_at: '11:00:00',
    heart_rate: 72,
    spo2: 99,
    accel_magnitude: 9.79,
    dominant_activity: 'Đang ngồi',
    is_anomaly: false,
  },
  {
    id: 'rec-106',
    device_id: 'ESP32S3-PROWATCH',
    recorded_at: '10:55:00',
    heart_rate: 68,
    spo2: 99,
    accel_magnitude: 9.81,
    dominant_activity: 'Đang nằm nghỉ',
    is_anomaly: false,
  },
];

// Lịch sử workflow n8n gần đây (Bao gồm cả thành công và sự cố kiểm định Quality Gate / Timeout)
export const SEED_WORKFLOW_RUNS: N8nWorkflowExecution[] = [
  {
    id: 'exec-8492',
    triggered_at: '2026-10-22 09:30:15',
    completed_at: '2026-10-22 09:30:35',
    trigger_type: 'SCHEDULED',
    status: 'SUCCESS',
    current_stage: 'COMPLETED',
    records_processed: 32353,
    data_cleaning_stats: {
      missing_values_dropped: 0,
      outliers_filtered: 0,
      normalized_windows: 20705,
    },
    duration_seconds: 20.5,
    message: 'Huấn luyện định kỳ thành công mô hình TinyML MLP với Accuracy 100.0%, F1: 1.0000. Đã đồng bộ sang firmware ESP32-S3.',
  },
  {
    id: 'exec-8450',
    triggered_at: '2026-10-21 18:15:00',
    completed_at: '2026-10-21 18:15:35',
    trigger_type: 'SCHEDULED',
    status: 'ERROR',
    current_stage: 'FAILED',
    records_processed: 12000,
    data_cleaning_stats: {
      missing_values_dropped: 12,
      outliers_filtered: 45,
      normalized_windows: 1800,
    },
    duration_seconds: 35.0,
    message: 'Quality Gate REJECTED: Test Accuracy 84.60% < 90.00% ngưỡng an toàn. Đã kích hoạt nhánh Handle Failure & gửi cảnh báo Telegram.',
  },
  {
    id: 'exec-8411',
    triggered_at: '2026-10-21 14:00:00',
    completed_at: '2026-10-21 14:00:19',
    trigger_type: 'MANUAL',
    status: 'SUCCESS',
    current_stage: 'COMPLETED',
    records_processed: 32401,
    data_cleaning_stats: {
      missing_values_dropped: 0,
      outliers_filtered: 0,
      normalized_windows: 27217,
    },
    duration_seconds: 19.0,
    message: 'Kiểm thử thủ công Hybrid Data (32.353 Baseline + 48 Supabase Cloud) hoàn tất. Quality Gate >= 90% PASSED.',
  },
  {
    id: 'exec-8370',
    triggered_at: '2026-10-20 22:40:10',
    completed_at: '2026-10-20 22:40:42',
    trigger_type: 'WEBHOOK',
    status: 'ERROR',
    current_stage: 'FAILED',
    records_processed: 0,
    data_cleaning_stats: {
      missing_values_dropped: 0,
      outliers_filtered: 0,
      normalized_windows: 0,
    },
    duration_seconds: 32.0,
    message: 'Supabase Data Ingestion Timeout: Băng thông mạng chập chờn khi kéo 50 sensor_readings records. Đã ghi nhận mã lỗi INC-8370.',
  },
  {
    id: 'exec-8320',
    triggered_at: '2026-10-20 08:00:00',
    completed_at: '2026-10-20 08:00:24',
    trigger_type: 'WEBHOOK',
    status: 'SUCCESS',
    current_stage: 'COMPLETED',
    records_processed: 32353,
    data_cleaning_stats: {
      missing_values_dropped: 0,
      outliers_filtered: 0,
      normalized_windows: 20705,
    },
    duration_seconds: 24.0,
    message: 'Kích hoạt từ xa qua Webhook n8n thành công. Xuất file C++ health_risk_model_int8.h cho Seeed Studio XIAO ESP32-S3.',
  },
];

// Helper sinh mẫu telemetry realtime với cảm biến kép
export function generateSensorTelemetry(timeStr: string): SensorTelemetry {
  const ax = Number(((Math.random() - 0.5) * 1.5).toFixed(2));
  const ay = Number(((Math.random() - 0.5) * 1.5).toFixed(2));
  const az = Number((9.8 + (Math.random() - 0.5) * 1.2).toFixed(2));
  const gx = Number(((Math.random() - 0.5) * 15).toFixed(1));
  const gy = Number(((Math.random() - 0.5) * 15).toFixed(1));
  const gz = Number(((Math.random() - 0.5) * 15).toFixed(1));

  const magnitude = Number(Math.sqrt(ax * ax + ay * ay + az * az).toFixed(2));

  return {
    id: `tel-${Date.now()}`,
    device_id: 'ESP32S3-PROWATCH',
    timestamp: timeStr,
    max30102: {
      heart_rate: 74 + Math.floor(Math.sin(Date.now() / 5000) * 8 + (Math.random() - 0.5) * 4),
      spo2: 98 + (Math.random() > 0.7 ? 1 : 0),
      confidence: 96,
    },
    mpu6050: {
      accel_x: ax,
      accel_y: ay,
      accel_z: az,
      gyro_x: gx,
      gyro_y: gy,
      gyro_z: gz,
      accel_magnitude: magnitude,
    },
    battery: 88,
    is_charging: false,
    status: 'ONLINE',
  };
}
