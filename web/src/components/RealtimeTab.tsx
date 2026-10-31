'use client';

import React from 'react';
import { Heart, Activity, Compass, Zap, Move3d, ShieldCheck } from 'lucide-react';
import { SensorTelemetry } from '../types/sensor';
import { AIPrediction } from '../types/ai';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RealtimeTabProps {
  telemetry: SensorTelemetry;
  history: Array<{
    time: string;
    heart_rate: number;
    spo2: number;
    accel_x: number;
    accel_y: number;
    accel_z: number;
    accel_magnitude: number;
    gyro_x: number;
    gyro_y: number;
    gyro_z: number;
  }>;
  prediction?: AIPrediction;
}

export const RealtimeTab: React.FC<RealtimeTabProps> = ({ telemetry, history }) => {
  const { max30102, mpu6050 } = telemetry;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* 4 Cards: HR, SpO2, MPU6050 Magnitude, Battery */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1rem'
      }}>
        {/* Card 1: Heart Rate */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MAX30102 • Nhịp tim</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <Heart size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.75rem 0 0.25rem 0' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>{max30102.heart_rate}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>BPM</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Tín hiệu quang học ổn định ({max30102.confidence}%)</span>
        </div>

        {/* Card 2: SpO2 */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MAX30102 • SpO₂</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <Activity size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.75rem 0 0.25rem 0' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>{max30102.spo2}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>%</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#06b6d4' }}>Độ bão hòa oxy máu tối ưu (≥ 95%)</span>
        </div>

        {/* Card 3: MPU6050 Motion Magnitude */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MPU6050 • Gia tốc tổng hợp</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
              <Move3d size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.75rem 0 0.25rem 0' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>{mpu6050.accel_magnitude}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>m/s²</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Vector: X={mpu6050.accel_x} | Y={mpu6050.accel_y} | Z={mpu6050.accel_z}
          </span>
        </div>

        {/* Card 4: Gyroscope Status */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>MPU6050 • Vận tốc góc</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Compass size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.75rem 0 0.25rem 0' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>
              {Math.abs(mpu6050.gyro_x + mpu6050.gyro_y + mpu6050.gyro_z).toFixed(1)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>deg/s</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
            Roll: {mpu6050.gyro_x}° | Pitch: {mpu6050.gyro_y}° | Yaw: {mpu6050.gyro_z}°
          </span>
        </div>
      </div>

      {/* Row: Biểu đồ Sinh lý (MAX30102) & Biểu đồ Chuyển động 3 trục (MPU6050) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Biểu đồ Sinh lý: HR & SpO2 */}
        <div className="glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                Tín hiệu Sinh lý (MAX30102)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Nhịp tim (BPM) & Nồng độ Oxy SpO₂ (%)
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{ color: '#ef4444' }}>● HR (BPM)</span>
              <span style={{ color: '#06b6d4' }}>● SpO₂ (%)</span>
            </div>
          </div>

          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="liveHrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={[50, 140]} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="heart_rate" stroke="#ef4444" strokeWidth={2} fill="url(#liveHrGrad)" name="HR (BPM)" />
                <Area type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2} fillOpacity={0} name="SpO2 (%)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Gia tốc 3 trục MPU6050 (Accel X, Y, Z) */}
        <div className="glass-card" style={{ height: '350px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>
                Gia tốc 3 Trục (MPU6050)
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Tín hiệu thô phục vụ trích xuất đặc trưng cho mô hình AI
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem' }}>
              <span style={{ color: '#ef4444' }}>● X</span>
              <span style={{ color: '#10b981' }}>● Y</span>
              <span style={{ color: '#6366f1' }}>● Z</span>
              <span style={{ color: '#f59e0b' }}>● |Magnitude|</span>
            </div>
          </div>

          <div style={{ flex: 1, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} domain={[-5, 25]} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#131b2e', borderColor: 'var(--border-color)', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="accel_x" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Accel X" />
                <Line type="monotone" dataKey="accel_y" stroke="#10b981" strokeWidth={1.5} dot={false} name="Accel Y" />
                <Line type="monotone" dataKey="accel_z" stroke="#6366f1" strokeWidth={1.5} dot={false} name="Accel Z" />
                <Line type="monotone" dataKey="accel_magnitude" stroke="#f59e0b" strokeWidth={2} dot={false} name="|Accel|" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
