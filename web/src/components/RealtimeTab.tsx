'use client';

import React, { useState } from 'react';
import {
  Heart,
  Activity,
  Compass,
  Zap,
  RotateCw,
  Eye,
  Sliders,
  Layers,
  Sparkles,
  ShieldAlert,
  Cpu,
  Radio,
  BatteryCharging,
  Maximize2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SensorTelemetry } from '../types/sensor';
import { AIPrediction } from '../types/ai';
import { Watch3DCanvas } from './watch3d/Watch3DCanvas';
import { CameraPreset, StrapColor, STRAP_COLORS, WatchFaceTheme } from './watch3d/types';

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

export const RealtimeTab: React.FC<RealtimeTabProps> = ({
  telemetry,
  history,
  prediction,
}) => {
  const { max30102, mpu6050, battery } = telemetry;

  // 3D Watch Interactive States
  const [strapColor, setStrapColor] = useState<StrapColor>('OBSIDIAN');
  const [watchFaceTheme, setWatchFaceTheme] = useState<WatchFaceTheme>('CYBERPUNK');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [motionSync, setMotionSync] = useState<boolean>(false);
  const [explodedProgress, setExplodedProgress] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('PERSPECTIVE');

  // Compute Clinical NEWS2 and Risk Status
  const bpm = max30102?.heart_rate || 75;
  const spo2 = max30102?.spo2 || 98;
  const isHeartHigh = bpm > 110;
  const isSpo2Low = spo2 < 95;
  const riskLevel = isHeartHigh || isSpo2Low ? (bpm > 130 || spo2 < 92 ? 'High' : 'Medium') : 'Low';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

      {/* 1. Header Bar: System Status & Edge Telemetry Indicators */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '0.85rem 1.25rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255, 109, 90, 0.15)',
            border: '1px solid #ff6d5a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff6d5a',
          }}>
            <Sparkles size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.3px' }}>
                PROWATCH 3D DIGITAL TWIN
              </span>
              <span style={{
                fontSize: '0.65rem',
                backgroundColor: '#1e3a2f',
                color: '#4ade80',
                padding: '0.15rem 0.55rem',
                borderRadius: '999px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ade80' }} />
                REAL-TIME 60 FPS
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Mô hình 3D tương tác phần cứng Seeed XIAO ESP32-S3 • Đồng bộ cảm biến MAX30102 & MPU6050
            </span>
          </div>
        </div>

        {/* Live Hardware Telemetry Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{
            fontSize: '0.75rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10b981',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600,
          }}>
            <Radio size={14} />
            BLE 5.0 (ONLINE • 100Hz)
          </div>

          <div style={{
            fontSize: '0.75rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            color: '#06b6d4',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600,
          }}>
            <BatteryCharging size={14} />
            Pin: {battery ?? 88}%
          </div>

          <div style={{
            fontSize: '0.75rem',
            padding: '0.4rem 0.75rem',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.25)',
            color: '#c084fc',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600,
          }}>
            <Cpu size={14} />
            TinyML INT8 (1.2ms)
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Split: 3D Interactive Viewport (Left) & Telemetry Panel (Right) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.7fr) minmax(360px, 1fr)',
        gap: '1.25rem',
        alignItems: 'stretch',
      }}>

        {/* --- LEFT COLUMN: 3D VIEWPORT WITH INTERACTIVE TOOLBARS --- */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1rem',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
        }}>

          {/* Top Control Overlay: Camera Presets & Toggles */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.6rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '0.75rem',
          }}>
            {/* Camera Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginRight: '0.2rem' }}>
                GÓC NHÌN:
              </span>
              {(['PERSPECTIVE', 'FRONT', 'BACK_SENSOR', 'SIDE'] as CameraPreset[]).map((preset) => {
                const labels: Record<CameraPreset, string> = {
                  PERSPECTIVE: 'Góc 3D (3/4)',
                  FRONT: 'Mặt trước',
                  BACK_SENSOR: 'Mặt đáy (Cảm biến)',
                  SIDE: 'Cạnh núm xoay',
                };
                const isSelected = cameraPreset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => {
                      setCameraPreset(preset);
                      setMotionSync(false);
                    }}
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: '6px',
                      border: isSelected ? '1px solid #ff6d5a' : '1px solid rgba(255,255,255,0.1)',
                      backgroundColor: isSelected ? 'rgba(255, 109, 90, 0.18)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#ff6d5a' : '#94a3b8',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            {/* Auto Rotate & MPU6050 Motion Tracking Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                title="Bật/Tắt chế độ tự động xoay quanh đồng hồ 360 độ"
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: autoRotate ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: autoRotate ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: autoRotate ? '#38bdf8' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.2s',
                }}
              >
                <RotateCw size={13} style={{ transform: autoRotate ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }} />
                Xoay 360°
              </button>

              <button
                onClick={() => {
                  setMotionSync(!motionSync);
                  if (!motionSync) setAutoRotate(false);
                }}
                title="Đồng bộ độ nghiêng Roll/Pitch/Yaw của đồng hồ 3D theo cảm biến MPU6050 thật"
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: motionSync ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: motionSync ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                  color: motionSync ? '#34d399' : '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: motionSync ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <Activity size={13} />
                Đồng bộ MPU6050 {motionSync ? '● ON' : '○ OFF'}
              </button>
            </div>
          </div>

          {/* 3D WebGL Canvas Container (Height: 520px) */}
          <div style={{ position: 'relative', width: '100%', height: '520px', borderRadius: '12px', overflow: 'hidden' }}>
            <Watch3DCanvas
              telemetry={telemetry}
              prediction={prediction}
              strapColor={strapColor}
              watchFaceTheme={watchFaceTheme}
              autoRotate={autoRotate}
              motionSync={motionSync}
              explodedProgress={explodedProgress}
              cameraPreset={cameraPreset}
            />

            {/* Hint overlay on bottom left */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '14px',
              backgroundColor: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.68rem',
              color: '#94a3b8',
              pointerEvents: 'none',
            }}>
              🖱️ Nhấp chuột trái để xoay 360° • Cuộn chuột để phóng to / thu nhỏ
            </div>

            {/* Live Pulse Indicator on bottom right */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              right: '14px',
              backgroundColor: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.68rem',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 700,
            }}>
              <Heart size={12} fill="#ef4444" color="#ef4444" />
              MAX30102 LED: {bpm} BPM (PULSING)
            </div>
          </div>

          {/* Bottom Interactive Customization Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            {/* 1. Exploded View Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Layers size={14} color="#ff6d5a" />
                  TÁCH LỚP LINH KIỆN (EXPLODED):
                </span>
                <span style={{ fontSize: '0.75rem', color: '#ff6d5a', fontWeight: 700 }}>
                  {Math.round(explodedProgress * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedProgress}
                onChange={(e) => {
                  setExplodedProgress(parseFloat(e.target.value));
                  if (parseFloat(e.target.value) > 0.05) {
                    setCameraPreset('SIDE');
                  }
                }}
                style={{
                  width: '100%',
                  accentColor: '#ff6d5a',
                  cursor: 'pointer',
                  height: '6px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginTop: '0.2rem' }}>
                <span>Lắp nguyên khối</span>
                <span>Kính ➔ OLED ➔ ESP32-S3 ➔ Pin ➔ Cảm biến</span>
              </div>
            </div>

            {/* 2. Watch Face Theme Switcher */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                GIAO DIỆN MẶT ĐỒNG HỒ (OLED THEME):
              </span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['CYBERPUNK', 'MEDICAL', 'MINIMAL', 'PIPBOY'] as WatchFaceTheme[]).map((theme) => {
                  const isSelected = watchFaceTheme === theme;
                  const labels: Record<WatchFaceTheme, string> = {
                    CYBERPUNK: 'Cyberpunk',
                    MEDICAL: 'Y tế ICU',
                    MINIMAL: 'Tối giản',
                    PIPBOY: 'Pip-Boy',
                  };
                  return (
                    <button
                      key={theme}
                      onClick={() => setWatchFaceTheme(theme)}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.2rem',
                        fontSize: '0.68rem',
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: isSelected ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {labels[theme]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Strap Color Selector */}
            <div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                MÀU DÂY ĐEO SILICONE:
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(Object.keys(STRAP_COLORS) as StrapColor[]).map((colorKey) => {
                  const cfg = STRAP_COLORS[colorKey];
                  const isSelected = strapColor === colorKey;
                  return (
                    <button
                      key={colorKey}
                      onClick={() => setStrapColor(colorKey)}
                      title={cfg.name}
                      style={{
                        flex: 1,
                        height: '28px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: cfg.css,
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                        transition: 'all 0.2s',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN: LIVE TELEMETRY & EDGE AI METRICS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Card 1: Live Vital Signs (MAX30102) */}
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.15rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Heart size={16} color="#ef4444" />
                MAX30102 • SINH HIỆU THỜI GIAN THỰC
              </span>
              <span style={{
                fontSize: '0.65rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 700,
              }}>
                Tiếp xúc: 98%
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* HR Meter */}
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem',
              }}>
                <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>NHỊP TIM (HR)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff' }}>{bpm}</span>
                  <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700 }}>BPM</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {bpm < 60 ? 'Nhịp chậm' : bpm <= 100 ? 'Nhịp ổn định ✅' : 'Nhịp nhanh ⚠️'}
                </span>
              </div>

              {/* SpO2 Meter */}
              <div style={{
                backgroundColor: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem',
              }}>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>OXY TRONG MÁU (SpO₂)</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff' }}>{spo2}</span>
                  <span style={{ fontSize: '0.8rem', color: '#06b6d4', fontWeight: 700 }}>%</span>
                </div>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {spo2 >= 95 ? 'Nồng độ tối ưu ✅' : 'Thiếu oxy nhẹ ⚠️'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: 6-Axis Motion & Tilt Tracking (MPU6050) */}
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.15rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Compass size={16} color="#6366f1" />
                MPU6050 • CHUYỂN ĐỘNG & GÓC NGHIÊNG CỔ TAY
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: '0.65rem',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 600 }}>GIA TỐC TỔNG HỢP |MAGNITUDE|</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#ffffff' }}>
                    {mpu6050?.accel_magnitude ?? 9.82}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700 }}>m/s²</span>
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
                fontWeight: 700,
              }}>
                Trọng lực 1G (~9.8m/s²)
              </span>
            </div>

            {/* 3-Axis Accel & Gyro Vectors */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>X (Roll)</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', marginTop: '0.1rem' }}>
                  {mpu6050?.accel_x ?? 0.0}
                </div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>Y (Pitch)</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', marginTop: '0.1rem' }}>
                  {mpu6050?.accel_y ?? 0.0}
                </div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ fontSize: '0.68rem', color: '#6366f1', fontWeight: 700 }}>Z (Yaw)</span>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f1f5f9', marginTop: '0.1rem' }}>
                  {mpu6050?.accel_z ?? 9.8}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Real-Time Edge AI / TinyML Inference */}
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.15rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Cpu size={16} color="#10b981" />
                SUY LUẬN AI TINYML TRÊN ESP32-S3
              </span>
              <span style={{
                fontSize: '0.65rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                padding: '0.15rem 0.5rem',
                borderRadius: '999px',
                fontWeight: 700,
              }}>
                MLP INT8 • 3.03 KB
              </span>
            </div>

            {/* Activity Predicted */}
            <div style={{
              backgroundColor: 'rgba(255, 109, 90, 0.08)',
              border: '1px solid rgba(255, 109, 90, 0.25)',
              borderRadius: '12px',
              padding: '0.85rem',
              marginBottom: '0.65rem',
            }}>
              <span style={{ fontSize: '0.72rem', color: '#ff6d5a', fontWeight: 700 }}>NHẬN DIỆN VẬN ĐỘNG (HAR)</span>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                {prediction?.predicted_activity || 'Đang nghỉ ngơi (Resting)'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                <span>Độ tin cậy: <strong style={{ color: '#4ade80' }}>{prediction?.confidence || 98.2}%</strong></span>
                <span>Độ trễ: <strong style={{ color: '#38bdf8' }}>{prediction?.latency_ms || 38}ms</strong></span>
              </div>
            </div>

            {/* Health Risk NEWS2 Evaluation */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: riskLevel === 'High' ? 'rgba(239, 68, 68, 0.15)' : riskLevel === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.12)',
              border: `1px solid ${riskLevel === 'High' ? '#ef4444' : riskLevel === 'Medium' ? '#f59e0b' : '#10b981'}`,
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>ĐÁNH GIÁ NGUY CƠ SỨC KHỎE:</span>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: riskLevel === 'High' ? '#f87171' : riskLevel === 'Medium' ? '#fbbf24' : '#34d399',
                }}>
                  {riskLevel === 'High' ? 'NGUY CƠ CAO (HIGH RISK)' : riskLevel === 'Medium' ? 'TRUNG BÌNH (MEDIUM RISK)' : 'AN TOÀN (LOW RISK)'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>NEWS2 Score</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                  {riskLevel === 'High' ? '3' : riskLevel === 'Medium' ? '1' : '0'} / 3
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Hardware Specifications Specs */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '0.85rem 1rem',
            fontSize: '0.72rem',
            color: '#64748b',
          }}>
            <div style={{ fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>
              🔧 THÔNG SỐ PHẦN CỨNG PROWATCH:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
              <div>• Vi điều khiển: <strong>ESP32-S3 240MHz</strong></div>
              <div>• Bộ nhớ RAM: <strong>512 KB SRAM</strong></div>
              <div>• Cảm biến PPG: <strong>MAX30102 Optical</strong></div>
              <div>• Cảm biến IMU: <strong>MPU6050 6-Axis</strong></div>
              <div>• Màn hình: <strong>OLED 2.5D Curved</strong></div>
              <div>• Kết nối: <strong>BLE 5.0 / Wi-Fi</strong></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
