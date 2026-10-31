'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from '@/components/Navbar';
import { RealtimeTab } from '@/components/RealtimeTab';
import { HistoryTab } from '@/components/HistoryTab';
import { PipelineTab } from '@/components/PipelineTab';
import { ModelsTab } from '@/components/ModelsTab';
import { MobileTab } from '@/components/MobileTab';
import { DataTab } from '@/components/DataTab';
import {
  generateSensorTelemetry,
  SEED_MODELS,
  SEED_HISTORY,
  SEED_WORKFLOW_RUNS,
} from '@/services/mockData';
import { SensorTelemetry, MeasurementRecord } from '@/types/sensor';
import { AIModel, AIPrediction, N8nWorkflowExecution } from '@/types/ai';

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('REALTIME');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dữ liệu telemetry hiện tại từ XIAO ESP32-S3
  const [telemetry, setTelemetry] = useState<SensorTelemetry>(() =>
    generateSensorTelemetry('12:00:00')
  );

  // Lịch sử điểm đo realtime cho biểu đồ
  const [realtimeHistory, setRealtimeHistory] = useState(() => {
    const init = [];
    const now = Date.now();
    for (let i = 8; i >= 0; i--) {
      const t = new Date(now - i * 3000).toLocaleTimeString('vi-VN', {
        minute: '2-digit',
        second: '2-digit',
      });
      const sample = generateSensorTelemetry(t);
      init.push({
        time: t,
        heart_rate: sample.max30102.heart_rate,
        spo2: sample.max30102.spo2,
        accel_x: sample.mpu6050.accel_x,
        accel_y: sample.mpu6050.accel_y,
        accel_z: sample.mpu6050.accel_z,
        accel_magnitude: sample.mpu6050.accel_magnitude,
        gyro_x: sample.mpu6050.gyro_x,
        gyro_y: sample.mpu6050.gyro_y,
        gyro_z: sample.mpu6050.gyro_z,
      });
    }
    return init;
  });

  // Dự đoán AI thời gian thực
  const [prediction, setPrediction] = useState<AIPrediction>({
    id: 'pred-live',
    timestamp: new Date().toLocaleTimeString(),
    device_id: 'ESP32S3-PROWATCH',
    model_version: 'HAR 1D-CNN v2.1.0',
    predicted_activity: 'Đang ngồi (Sitting)',
    confidence: 97.5,
    latency_ms: 38,
    features: {
      accel_magnitude: 9.82,
      variance_gyro: 1.4,
      mean_bpm: 76,
      spo2_level: 99,
    },
  });

  // Quản lý state cho các danh mục
  const [models, setModels] = useState<AIModel[]>(SEED_MODELS);
  const [historyRecords] = useState<MeasurementRecord[]>(SEED_HISTORY);
  const [workflowRuns, setWorkflowRuns] = useState<N8nWorkflowExecution[]>(SEED_WORKFLOW_RUNS);

  // Vòng lặp cập nhật telemetry và suy luận AI mỗi 3 giây
  useEffect(() => {
    const timer = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString('vi-VN', {
        minute: '2-digit',
        second: '2-digit',
      });
      const newSample = generateSensorTelemetry(timeStr);
      setTelemetry(newSample);

      setRealtimeHistory((prev) => [
        ...prev.slice(-14),
        {
          time: timeStr,
          heart_rate: newSample.max30102.heart_rate,
          spo2: newSample.max30102.spo2,
          accel_x: newSample.mpu6050.accel_x,
          accel_y: newSample.mpu6050.accel_y,
          accel_z: newSample.mpu6050.accel_z,
          accel_magnitude: newSample.mpu6050.accel_magnitude,
          gyro_x: newSample.mpu6050.gyro_x,
          gyro_y: newSample.mpu6050.gyro_y,
          gyro_z: newSample.mpu6050.gyro_z,
        },
      ]);

      const mag = newSample.mpu6050.accel_magnitude;
      let act: AIPrediction['predicted_activity'] = 'Đang ngồi (Sitting)';
      let conf = 95 + Number((Math.random() * 4).toFixed(1));

      if (mag > 18) {
        act = 'Đang chạy bộ (Running)';
      } else if (mag > 12) {
        act = 'Đang đi bộ (Walking)';
      } else if (newSample.max30102.heart_rate < 68) {
        act = 'Đang nằm / Nghỉ (Resting)';
      }

      setPrediction({
        id: `pred-${Date.now()}`,
        timestamp: timeStr,
        device_id: 'ESP32S3-PROWATCH',
        model_version: 'HAR 1D-CNN v2.1.0',
        predicted_activity: act,
        confidence: conf,
        latency_ms: 35 + Math.floor(Math.random() * 12),
        features: {
          accel_magnitude: mag,
          variance_gyro: Number((Math.random() * 3).toFixed(2)),
          mean_bpm: newSample.max30102.heart_rate,
          spo2_level: newSample.max30102.spo2,
        },
      });
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Tự động tải chỉ số mô hình Health Risk AI thật từ backend (/api/metrics) khi tải trang
  useEffect(() => {
    fetch('/api/metrics')
      .then((res) => res.json())
      .then((data) => {
        if (data?.model) {
          setModels((prev) => {
            const filtered = prev.filter((m) => m.id !== 'model-health-risk-mlp');
            return [data.model, ...filtered.map((m) => ({ ...m, is_active: false }))];
          });
        }
      })
      .catch((err) => console.warn('Could not fetch initial model metrics:', err));
  }, []);

  const handleAddNewWorkflowRun = (newRun: N8nWorkflowExecution, realMetrics?: any) => {
    setWorkflowRuns((prev) => [newRun, ...prev]);

    // Đồng bộ ngay lập tức sang tab Đánh giá AI & Metrics:
    // Gọi API /api/metrics để đọc metrics thật vừa được n8n/Python ghi vào artifacts
    fetch('/api/metrics')
      .then((res) => res.json())
      .then((data) => {
        if (data?.model) {
          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const runTimestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          const runIdSuffix = newRun.id.replace('train-', '').replace('exec-', '');
          const newModel: AIModel = {
            ...data.model,
            id: `model-${Date.now()}`,
            version: `v1.0.${runIdSuffix}-TinyML`,
            trained_at: runTimestamp,
            is_active: true,
          };

          setModels((prev) => [
            newModel,
            ...prev.map((m) => ({ ...m, is_active: false }))
          ]);
        }
      })
      .catch((err) => {
        console.error('Error synchronizing model metrics with ModelsTab:', err);
      });
  };

  if (!isMounted) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0c0e14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        gap: '1rem'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '3px solid #ff6d5a',
          borderTopColor: 'transparent',
          animation: 'spin 1s linear infinite'
        }} />
        <span style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 600 }}>Khởi tạo ProWatch AI Studio...</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto', width: '100%', flex: 1 }}>
        {activeTab === 'REALTIME' && (
          <RealtimeTab
            telemetry={telemetry}
            history={realtimeHistory}
            prediction={prediction}
          />
        )}

        {activeTab === 'DATA' && (
          <DataTab />
        )}

        {activeTab === 'HISTORY' && (
          <HistoryTab records={historyRecords} />
        )}

        {activeTab === 'PIPELINE' && (
          <PipelineTab
            workflowRuns={workflowRuns}
            onNewRun={handleAddNewWorkflowRun}
            onNavigateToMetrics={() => setActiveTab('MODELS')}
          />
        )}

        {activeTab === 'MODELS' && (
          <ModelsTab models={models} />
        )}

        {activeTab === 'MOBILE' && (
          <MobileTab />
        )}
      </main>

      <footer style={{
        padding: '1.25rem 2rem',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        ProWatch Health IoT Platform • ESP32-S3 Firmware • MAX30102 + MPU6050 Sensors • n8n Workflow • Supabase Database • Python ML Service • Next.js
      </footer>
    </div>
  );
}
