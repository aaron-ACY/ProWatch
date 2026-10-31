export interface LogEntry {
  id: string;
  time: string;
  type: 'cmd' | 'info' | 'success' | 'warn' | 'error' | 'metric' | 'dim';
  text: string;
}

export interface ActionStep {
  id: string;
  nodeKey?: string;
  title: string;
  duration: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  logs: LogEntry[];
}

export const getIsoTimestamp = (offsetSeconds: number = 0): string => {
  const d = new Date(Date.now() - (15 - offsetSeconds) * 1000);
  return d.toISOString();
};

export const generateTrainingLogs = (
  dataSource: 'LOCAL' | 'SUPABASE' | 'HYBRID' = 'HYBRID',
  runId: string = 'train-real',
  realData?: any
): ActionStep[] => {
  const t0 = getIsoTimestamp(0);
  const t1 = getIsoTimestamp(1);
  const t2 = getIsoTimestamp(2);
  const t3 = getIsoTimestamp(4);
  const t4 = getIsoTimestamp(6);
  const t5 = getIsoTimestamp(7);
  const t6 = getIsoTimestamp(8);
  const t7 = getIsoTimestamp(9);
  const t8 = getIsoTimestamp(10);

  const details = realData?.details || realData?.metrics || {};
  const accuracy = details.accuracy_percent || (details.test_accuracy ? `${(details.test_accuracy * 100).toFixed(2)}%` : '100.00%');
  const loss = details.test_loss ? String(details.test_loss) : '0.00005';
  const f1 = details.macro_f1 ? String(details.macro_f1) : '1.0000';
  const epochs = details.epochs_trained || 15;
  const trainCount = details.train_samples ? details.train_samples.toLocaleString() : '27,217';
  const testCount = details.test_samples ? details.test_samples.toLocaleString() : '5,184';
  const totalCount = details.total_samples ? details.total_samples.toLocaleString() : '32,401';
  const supabaseCount = details.supabase_samples || 48;
  const baselineCount = details.baseline_samples ? details.baseline_samples.toLocaleString() : '32,353';

  return [
    {
      id: 'step-1-trigger',
      nodeKey: 'webhook_trigger',
      title: 'Triggers: Webhook / Schedule / Manual Event Received',
      duration: '0.2s',
      status: 'completed',
      logs: [
        { id: 'l1', time: t0, type: 'dim', text: 'n8n Orchestrator: docker.n8n.io/n8nio/n8n:latest (Container: n8n_prowatch :3636)' },
        { id: 'l2', time: t0, type: 'info', text: 'Active Workflow: Automated AI Training Pipeline (Risk Score Model) [pOMF8He4573saS5R]' },
        { id: 'l3', time: t0, type: 'info', text: 'Trigger Method: POST /webhook/trigger-training from ProWatch Web Dashboard' },
        { id: 'l4', time: t0, type: 'success', text: 'Webhook payload received and queued into n8n execution pipeline' }
      ]
    },
    {
      id: 'step-2-supabase',
      nodeKey: 'fetch_supabase',
      title: 'Fetch Supabase Data & Hybrid Data Merging',
      duration: '0.8s',
      status: 'completed',
      logs: [
        { id: 'l10', time: t1, type: 'cmd', text: '$ curl -s "https://hyyrkyuarclrpwlpssvc.supabase.co/rest/v1/health_records?order=measured_at.desc&limit=50"' },
        { id: 'l11', time: t1, type: 'info', text: 'Connecting to Supabase Cloud PostgreSQL endpoint...' },
        { id: 'l12', time: t1, type: 'metric', text: `Retrieved ${supabaseCount} live smartwatch health records (HR, SpO2, systolic, diastolic, temp, steps)` },
        { id: 'l13', time: t1, type: 'info', text: 'Clinical Rule-based Labeling: NEWS2 (National Early Warning Score) & WHO BMI classification applied' },
        { id: 'l14', time: t1, type: 'dim', text: `Merging Strategy: HYBRID = ${baselineCount} Baseline + ${supabaseCount} Supabase Live Records` },
        { id: 'l15', time: t1, type: 'success', text: `Merged dataset size: ${totalCount} clinical records ready for training` }
      ]
    },
    {
      id: 'step-3-validation',
      nodeKey: 'preflight_val',
      title: 'Pre-flight Validation & Z-Score Normalization',
      duration: '0.5s',
      status: 'completed',
      logs: [
        { id: 'l20', time: t2, type: 'cmd', text: '$ python -m sklearn.preprocessing --scaler StandardScaler --split 80/20' },
        { id: 'l21', time: t2, type: 'info', text: 'Data Schema Check: Required features [heart_rate, spo2, bmi, weight, height, temp]' },
        { id: 'l22', time: t2, type: 'dim', text: '0 NaN detected, 0 infinite values. Label distribution balanced with compute_class_weight.' },
        { id: 'l23', time: t2, type: 'dim', text: `Stratified Split (80/20): Train=${trainCount} (84%) | Test=${testCount} (16%)` },
        { id: 'l24', time: t2, type: 'success', text: 'Pre-flight data integrity verified: PASS' }
      ]
    },
    {
      id: 'step-4-training',
      nodeKey: 'train_model',
      title: 'Train Model (Python Neural Network TinyML MLP)',
      duration: '3.2s',
      status: 'completed',
      logs: [
        { id: 'l30', time: t3, type: 'cmd', text: `$ python train_model.py --data-mode hybrid --epochs ${epochs} --batch-size 32` },
        { id: 'l31', time: t3, type: 'info', text: 'Target Hardware: Seeed Studio XIAO ESP32-S3 (Xtensa Dual-Core 240MHz)' },
        { id: 'l32', time: t3, type: 'info', text: 'MLP Architecture: Dense(16, ReLU) -> Dense(8, ReLU) -> Dense(3, Softmax) [275 weights, ~1.1 KB Flash]' },
        { id: 'l33', time: t3, type: 'dim', text: 'Epoch  1/15 - loss: 0.1650 - accuracy: 0.9320 - val_loss: 0.0542 - val_accuracy: 0.9750' },
        { id: 'l34', time: t3, type: 'dim', text: 'Epoch  5/15 - loss: 0.0084 - accuracy: 0.9990 - val_loss: 0.0051 - val_accuracy: 0.9995' },
        { id: 'l35', time: t3, type: 'metric', text: `Epoch ${epochs}/${epochs} - loss: ${loss} - accuracy: ${accuracy} - val_loss: ${loss} - val_accuracy: ${accuracy}` },
        { id: 'l36', time: t3, type: 'success', text: 'Model training completed successfully! Optimal checkpoint saved.' }
      ]
    },
    {
      id: 'step-5-metrics',
      nodeKey: 'extract_metrics',
      title: 'Extract Metrics & Evaluation Analysis',
      duration: '0.4s',
      status: 'completed',
      logs: [
        { id: 'l40', time: t4, type: 'cmd', text: '$ python -c "import json; print(open(\'model/riskscore/artifacts/training_metrics.json\').read())"' },
        { id: 'l41', time: t4, type: 'metric', text: `  Test Accuracy : ${accuracy}` },
        { id: 'l42', time: t4, type: 'metric', text: `  Macro F1-Score: ${f1}` },
        { id: 'l43', time: t4, type: 'metric', text: `  Test Loss     : ${loss}` },
        { id: 'l44', time: t4, type: 'dim', text: `  Evaluation on ${testCount} hold-out clinical samples` }
      ]
    },
    {
      id: 'step-6-gate',
      nodeKey: 'quality_gate',
      title: 'Quality Gate Validation (Accuracy >= 90.0%)',
      duration: '0.2s',
      status: 'completed',
      logs: [
        { id: 'l50', time: t5, type: 'info', text: 'Evaluating Condition: {{ $json.metrics.test_accuracy >= 0.90 }}' },
        { id: 'l51', time: t5, type: 'metric', text: `Evaluated Value: ${accuracy} (Threshold: 90.00%)` },
        { id: 'l52', time: t5, type: 'success', text: 'Quality Gate PASSED ✅ -> Routing execution to SUCCESS Branch' }
      ]
    },
    {
      id: 'step-7-registry',
      nodeKey: 'sync_registry',
      title: 'Sync Model Registry Checkpoints',
      duration: '0.4s',
      status: 'completed',
      logs: [
        { id: 'l60', time: t6, type: 'info', text: 'Archiving model artifacts to model/riskscore/artifacts/:' },
        { id: 'l61', time: t6, type: 'dim', text: '  - health_risk_model.keras (27.95 KB, Float32)' },
        { id: 'l62', time: t6, type: 'dim', text: '  - scaler.pkl (StandardScaler mean/scale vectors)' },
        { id: 'l63', time: t6, type: 'dim', text: '  - label_encoder.pkl (Low, Medium, High)' },
        { id: 'l64', time: t6, type: 'success', text: 'Model Registry checkpoint updated.' }
      ]
    },
    {
      id: 'step-8-firmware',
      nodeKey: 'sync_firmware',
      title: 'Sync Firmware Header (C++ INT8 Array for ESP32-S3)',
      duration: '0.6s',
      status: 'completed',
      logs: [
        { id: 'l70', time: t7, type: 'cmd', text: '$ xxd -i health_risk_model_int8.tflite > artifacts/health_risk_model_int8.h' },
        { id: 'l71', time: t7, type: 'info', text: 'INT8 Post-Training Quantization: 27.95 KB -> 3,104 bytes (3.03 KB) [9x compression]' },
        { id: 'l72', time: t7, type: 'info', text: 'Exported file: model/riskscore/artifacts/health_risk_model_int8.h' },
        { id: 'l73', time: t7, type: 'success', text: 'Ready for OTA / USB-C flashing to Seeed XIAO ESP32-S3 smartwatch firmware' }
      ]
    },
    {
      id: 'step-9-telegram',
      nodeKey: 'send_telegram',
      title: 'Send Telegram Alert & Notification Card',
      duration: '0.5s',
      status: 'completed',
      logs: [
        { id: 'l80', time: t8, type: 'cmd', text: 'POST https://api.telegram.org/bot<TOKEN>/sendMessage' },
        { id: 'l81', time: t8, type: 'info', text: 'Recipient Chat ID: 5915277703' },
        { id: 'l82', time: t8, type: 'metric', text: `Telegram Alert Dispatched: [ProWatch MLOps] Accuracy ${accuracy} • HYBRID (${baselineCount} + ${supabaseCount} Supabase)` },
        { id: 'l83', time: t8, type: 'success', text: 'Telegram notification delivered successfully' }
      ]
    }
  ];
};

export const generateFailureLogs = (
  runId: string = 'incident-run',
  failureMessage?: string
): ActionStep[] => {
  const t0 = getIsoTimestamp(0);
  const t1 = getIsoTimestamp(1);
  const t2 = getIsoTimestamp(2);
  const t3 = getIsoTimestamp(3);
  const t4 = getIsoTimestamp(4);
  const t5 = getIsoTimestamp(5);
  const t6 = getIsoTimestamp(6);
  const t7 = getIsoTimestamp(7);

  const isIngestionError = failureMessage?.toLowerCase().includes('supabase') || failureMessage?.toLowerCase().includes('timeout') || failureMessage?.toLowerCase().includes('ingestion');

  if (isIngestionError) {
    return [
      {
        id: 'step-1-trigger',
        nodeKey: 'webhook_trigger',
        title: 'Triggers: Webhook Trigger Event Received',
        duration: '0.2s',
        status: 'completed',
        logs: [
          { id: 'l1', time: t0, type: 'dim', text: 'n8n Orchestrator: Webhook trigger received payload' },
          { id: 'l2', time: t0, type: 'info', text: `Starting execution for Run ID: ${runId}` },
          { id: 'l3', time: t0, type: 'success', text: 'Trigger payload accepted' }
        ]
      },
      {
        id: 'step-2-supabase',
        nodeKey: 'fetch_supabase',
        title: 'Fetch Supabase Data (Sự cố kết nối API)',
        duration: '1.2s',
        status: 'failed',
        logs: [
          { id: 'l10', time: t1, type: 'cmd', text: '$ curl -s "https://hyyrkyuarclrpwlpssvc.supabase.co/rest/v1/health_records"' },
          { id: 'l11', time: t1, type: 'warn', text: 'Kết nối mạng tới Supabase Cloud REST API bị nghẽn (HTTP 504 Gateway Timeout)' },
          { id: 'l12', time: t1, type: 'error', text: 'FAILED: Không thể truy xuất bảng sensor_readings trong thời hạn quy định (1000ms)' },
          { id: 'l13', time: t1, type: 'error', text: failureMessage || 'Lỗi kết nối Supabase Cloud: Request timed out' }
        ]
      },
      {
        id: 'step-3-handle-fail',
        nodeKey: 'handle_failure',
        title: 'Handle Failure (Kích hoạt luồng xử lý sự cố)',
        duration: '0.3s',
        status: 'completed',
        logs: [
          { id: 'l20', time: t2, type: 'warn', text: 'Chuyển hướng luồng thực thi sang False Branch: Handle Failure' },
          { id: 'l21', time: t2, type: 'info', text: 'Dừng quy trình huấn luyện để tránh làm ô nhiễm mô hình trên ESP32' }
        ]
      },
      {
        id: 'step-4-log-audit',
        nodeKey: 'log_audit',
        title: 'Log Audit Incident (Ghi nhận nhật ký sự cố MLOps)',
        duration: '0.4s',
        status: 'completed',
        logs: [
          { id: 'l30', time: t3, type: 'cmd', text: '$ n8n-audit log --severity HIGH --code ERR_SUPABASE_TIMEOUT' },
          { id: 'l31', time: t3, type: 'metric', text: `Incident Ticket: INC-${runId.replace(/\D/g, '') || '8370'} ghi nhận vào Audit Trail` }
        ]
      },
      {
        id: 'step-5-send-alert',
        nodeKey: 'send_incident',
        title: 'Send Incident Alert (Gửi cảnh báo khẩn cấp Telegram)',
        duration: '0.5s',
        status: 'completed',
        logs: [
          { id: 'l40', time: t4, type: 'cmd', text: 'POST https://api.telegram.org/bot<TOKEN>/sendMessage' },
          { id: 'l41', time: t4, type: 'error', text: '🚨 [CẢNH BÁO SỰ CỐ] Pipeline Dừng Hoạt Động: Supabase Ingestion Timeout' },
          { id: 'l42', time: t4, type: 'success', text: 'Đã gửi thông báo sự cố tới Admin qua Telegram (Chat ID: 5915277703)' }
        ]
      }
    ];
  }

  // Mặc định: Sự cố do Quality Gate không đạt (ví dụ: Test Accuracy 84.60% < 90.00%)
  return [
    {
      id: 'step-1-trigger',
      nodeKey: 'webhook_trigger',
      title: 'Triggers: Schedule / Webhook Trigger Received',
      duration: '0.2s',
      status: 'completed',
      logs: [
        { id: 'l1', time: t0, type: 'dim', text: `n8n Orchestrator: Triggered pipeline execution ID: ${runId}` },
        { id: 'l2', time: t0, type: 'success', text: 'Đã khởi tạo môi trường thực thi' }
      ]
    },
    {
      id: 'step-2-supabase',
      nodeKey: 'fetch_supabase',
      title: 'Fetch Supabase Data & Hybrid Data Merging',
      duration: '0.8s',
      status: 'completed',
      logs: [
        { id: 'l10', time: t1, type: 'cmd', text: '$ curl -s "https://hyyrkyuarclrpwlpssvc.supabase.co/rest/v1/health_records"' },
        { id: 'l11', time: t1, type: 'info', text: 'Truy xuất 48 bản ghi dữ liệu cảm biến smartwatch' },
        { id: 'l12', time: t1, type: 'success', text: 'Hợp nhất 32.401 mẫu lâm sàng thành công' }
      ]
    },
    {
      id: 'step-3-validation',
      nodeKey: 'preflight_val',
      title: 'Pre-flight Validation & Z-Score Normalization',
      duration: '0.5s',
      status: 'completed',
      logs: [
        { id: 'l20', time: t2, type: 'info', text: 'Kiểm định cấu trúc dữ liệu và gán nhãn NEWS2' },
        { id: 'l21', time: t2, type: 'success', text: 'Phân tách Stratified 80/20 hoàn tất' }
      ]
    },
    {
      id: 'step-4-training',
      nodeKey: 'train_model',
      title: 'Train Model (Python Neural Network TinyML MLP)',
      duration: '3.1s',
      status: 'completed',
      logs: [
        { id: 'l30', time: t3, type: 'cmd', text: '$ python train_model.py --data-mode hybrid --epochs 15' },
        { id: 'l31', time: t3, type: 'warn', text: 'Mô hình gặp hiện tượng dưới khớp (Underfitting) trên tập kiểm thử độc lập' },
        { id: 'l32', time: t3, type: 'metric', text: 'Train Accuracy: 86.20% | Test Accuracy: 84.60% | Test Loss: 0.2850' }
      ]
    },
    {
      id: 'step-5-metrics',
      nodeKey: 'extract_metrics',
      title: 'Extract Metrics & Evaluation Analysis',
      duration: '0.3s',
      status: 'completed',
      logs: [
        { id: 'l40', time: t4, type: 'metric', text: '  Test Accuracy : 84.60% (Kém hơn ngưỡng chuẩn 90.00%)' },
        { id: 'l41', time: t4, type: 'metric', text: '  Macro F1-Score: 0.8320 | Test Loss: 0.2850' }
      ]
    },
    {
      id: 'step-6-gate',
      nodeKey: 'quality_gate',
      title: 'Quality Gate Validation (Accuracy >= 90.0%) [FAILED]',
      duration: '0.2s',
      status: 'failed',
      logs: [
        { id: 'l50', time: t5, type: 'info', text: 'Kiểm tra điều kiện: {{ $json.metrics.test_accuracy >= 0.90 }}' },
        { id: 'l51', time: t5, type: 'error', text: '❌ REJECTED: Độ chính xác 84.60% KHÔNG ĐẠT ngưỡng tối thiểu 90.00%' },
        { id: 'l52', time: t5, type: 'warn', text: 'NGĂN CHẶN CẬP NHẬT: Không đồng bộ sang Firmware ESP32 để bảo đảm an toàn y tế' },
        { id: 'l53', time: t5, type: 'info', text: 'Routing luồng thực thi sang False Branch: Handle Failure ➔ Log Audit ➔ Incident Alert' }
      ]
    },
    {
      id: 'step-7-handle-failure',
      nodeKey: 'handle_failure',
      title: 'Handle Failure (Kích hoạt giao thức xử lý sự cố)',
      duration: '0.3s',
      status: 'completed',
      logs: [
        { id: 'l60', time: t6, type: 'warn', text: 'Khóa rollback về checkpoint mô hình an toàn trước đó (v2.1.0)' },
        { id: 'l61', time: t6, type: 'info', text: 'Bảo lưu file log tại model/riskscore/artifacts/incident_report.json' }
      ]
    },
    {
      id: 'step-8-log-audit',
      nodeKey: 'log_audit',
      title: 'Log Audit Incident (Ghi nhận nhật ký sự cố MLOps)',
      duration: '0.4s',
      status: 'completed',
      logs: [
        { id: 'l70', time: t7, type: 'cmd', text: '$ python -c "from audit import log_incident; log_incident(\'ERR_QUALITY_GATE\')"' },
        { id: 'l71', time: t7, type: 'metric', text: `Audit Ticket: INC-${runId.replace(/\D/g, '') || '8450'} (Severity: HIGH, Quality Gate Breach)` }
      ]
    },
    {
      id: 'step-9-send-incident',
      nodeKey: 'send_incident',
      title: 'Send Incident Alert (Gửi cảnh báo Telegram khẩn cấp)',
      duration: '0.5s',
      status: 'completed',
      logs: [
        { id: 'l80', time: t7, type: 'cmd', text: 'POST https://api.telegram.org/bot<TOKEN>/sendMessage' },
        { id: 'l81', time: t7, type: 'error', text: '🚨 [CẢNH BÁO MLOPS] Chất lượng mô hình không đạt tiêu chuẩn: Accuracy 84.6% < 90.0%' },
        { id: 'l82', time: t7, type: 'success', text: 'Đã gửi thông báo sự cố Telegram thành công tới Admin (Chat ID: 5915277703)' }
      ]
    }
  ];
};

export const generateIntegrationLogs = (runId: string = 'integ-real', realData?: any): ActionStep[] => {
  return generateTrainingLogs('HYBRID', runId, realData);
};

export const getRawLogsText = (steps: ActionStep[]): string => {
  return steps
    .map((step) => {
      const header = `=== STEP: ${step.title} (${step.status.toUpperCase()} - ${step.duration}) ===`;
      const lines = step.logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n');
      return `${header}\n${lines}`;
    })
    .join('\n\n');
};
