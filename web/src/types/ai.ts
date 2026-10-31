// Định nghĩa cho n8n Automation & Python ML Service
export type WorkflowStage =
  | 'IDLE'
  | 'EXTRACTING_DATA'
  | 'CLEANING_NORMALIZING'
  | 'TRAINING_PYTHON_ML'
  | 'EVALUATING_MODEL'
  | 'SAVING_SUPABASE'
  | 'COMPLETED'
  | 'FAILED';

export interface N8nWorkflowExecution {
  id: string;
  triggered_at: string;
  completed_at?: string;
  trigger_type: 'MANUAL' | 'SCHEDULED' | 'THRESHOLD_EVENT' | 'WEBHOOK';
  status: 'RUNNING' | 'SUCCESS' | 'ERROR' | 'QUEUED' | 'FAILED';
  current_stage: WorkflowStage;
  records_processed: number;
  data_cleaning_stats: {
    missing_values_dropped: number;
    outliers_filtered: number;
    normalized_windows: number;
  };
  duration_seconds: number;
  message?: string;
}

export interface ModelBenchmarks {
  preprocessing: string;    // Phương pháp tiền xử lý
  normalization: string;    // Phương pháp chuẩn hóa
  model_size: string;       // Dung lượng model (MB / KB)
  ram_usage: string;        // Dung lượng RAM tiêu thụ khi phục vụ (MB)
  inference_time: string;   // Thời gian suy luận trung bình (ms / sample)
  accuracy: number;         // Độ chính xác (0.0 - 1.0)
}

export interface ModelMetrics {
  accuracy: number;     // 0.0 - 1.0
  precision: number;
  recall: number;
  f1_score: number;
  mae?: number;
  loss?: number;
  confusion_matrix: {
    labels: string[];
    matrix: number[][];
  };
}

export interface AIModel {
  id: string;
  version: string;
  name: string;
  algorithm: '1D-CNN' | 'LSTM-Attention' | 'RandomForest' | 'XGBoost' | 'TinyML MLP (Dense 16 ➔ Dense 8 ➔ Dense 3)' | string;
  target_task: 'Phân loại hoạt động (HAR)' | 'Phát hiện ngã (Fall Detection)' | 'Bất thường nhịp tim' | 'Đánh giá rủi ro tim mạch & chuyển hóa (Health Risk)' | string;
  trained_at: string;
  training_samples: number;
  is_active: boolean;
  benchmarks: ModelBenchmarks;
  metrics: ModelMetrics;
  model_path: string;
}

export interface AIPrediction {
  id: string;
  timestamp: string;
  device_id: string;
  model_version: string;
  predicted_activity: 'Đang ngồi (Sitting)' | 'Đang đi bộ (Walking)' | 'Đang chạy bộ (Running)' | 'Đang nằm / Nghỉ (Resting)' | 'Cảnh báo ngã (Fall Alert)';
  confidence: number; // 0 - 100%
  latency_ms: number;
  features: {
    accel_magnitude: number;
    variance_gyro: number;
    mean_bpm: number;
    spo2_level: number;
  };
}
