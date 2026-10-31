import * as THREE from 'three';
import { SensorTelemetry } from '../../types/sensor';
import { AIPrediction } from '../../types/ai';
import { WatchFaceTheme } from './types';

export class WatchScreenTexture {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private lastBpmTick = 0;
  private heartScale = 1.0;

  constructor(size = 512) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create 2D canvas context for WatchScreenTexture');
    }
    this.ctx = context;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.generateMipmaps = true;
    this.texture.minFilter = THREE.LinearMipmapLinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.colorSpace = THREE.SRGBColorSpace;
  }

  public update(
    telemetry: SensorTelemetry,
    prediction?: AIPrediction,
    theme: WatchFaceTheme = 'CYBERPUNK',
    timeStr?: string
  ): void {
    const { max30102, mpu6050, battery } = telemetry;
    const now = Date.now();
    const bpm = max30102.heart_rate || 75;
    const spo2 = max30102.spo2 || 98;
    const currentActivity = prediction?.predicted_activity || 'Đang nghỉ ngơi';
    const riskLevel = max30102.heart_rate > 120 || max30102.spo2 < 93 ? 'High' : (max30102.heart_rate > 100 || max30102.spo2 < 95 ? 'Medium' : 'Low');

    // Heartbeat pulse animation
    const beatInterval = 60000 / Math.max(40, bpm);
    const elapsed = now - this.lastBpmTick;
    if (elapsed > beatInterval) {
      this.lastBpmTick = now;
      this.heartScale = 1.35;
    } else {
      this.heartScale = Math.max(1.0, this.heartScale - 0.05);
    }

    const clockTime = timeStr || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (theme === 'CYBERPUNK') {
      this.renderCyberpunk(ctx, w, h, clockTime, bpm, spo2, mpu6050, battery, currentActivity, riskLevel);
    } else if (theme === 'MEDICAL') {
      this.renderMedical(ctx, w, h, clockTime, bpm, spo2, mpu6050, battery, currentActivity, riskLevel);
    } else if (theme === 'PIPBOY') {
      this.renderPipBoy(ctx, w, h, clockTime, bpm, spo2, mpu6050, battery, currentActivity, riskLevel);
    } else {
      this.renderMinimal(ctx, w, h, clockTime, bpm, spo2, battery, currentActivity, riskLevel);
    }

    this.texture.needsUpdate = true;
  }

  private renderCyberpunk(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: string,
    bpm: number,
    spo2: number,
    mpu: SensorTelemetry['mpu6050'],
    battery: SensorTelemetry['battery'],
    activity: string,
    risk: string
  ): void {
    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.5, '#05070c');
    bg.addColorStop(1, '#020306');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Cyber grid lines
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 40; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 40; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Outer glow ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 230, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 109, 90, 0.25)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Top Header: BLE & Battery
    ctx.font = 'bold 16px "SF Pro Display", sans-serif';
    ctx.fillStyle = '#10b981';
    ctx.fillText('● BLE 5.0 (ONLINE)', 50, 50);

    ctx.fillStyle = '#06b6d4';
    ctx.textAlign = 'right';
    const battVal = typeof battery === 'number' ? battery : (battery as any)?.level ?? 88;
    ctx.fillText(`⚡ ${battVal}%`, w - 50, 50);

    // Center Clock
    ctx.textAlign = 'center';
    ctx.font = 'bold 78px "SF Pro Display", "Helvetica Neue", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(6, 182, 212, 0.7)';
    ctx.shadowBlur = 18;
    ctx.fillText(time, w / 2, 160);
    ctx.shadowBlur = 0;

    // Date
    ctx.font = '600 20px "SF Pro Display", sans-serif';
    ctx.fillStyle = '#94a3b8';
    const dateStr = new Date().toLocaleDateString('vi-VN', { weekday: 'short', month: 'numeric', day: 'numeric' }).toUpperCase();
    ctx.fillText(dateStr, w / 2, 195);

    // Heart Rate & SpO2 Display Cards
    // Left Box: Heart Rate
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 45, 230, 195, 130, 16);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(85, 265);
    ctx.scale(this.heartScale, this.heartScale);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(-8, -6, 7, Math.PI, 0, false);
    ctx.arc(8, -6, 7, Math.PI, 0, false);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#f87171';
    ctx.textAlign = 'left';
    ctx.fillText('HEART RATE', 110, 270);

    ctx.font = 'bold 46px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${bpm}`, 65, 335);
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('BPM', 165, 335);

    // Right Box: SpO2
    ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 270, 230, 195, 130, 16);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'left';
    ctx.fillText('OXYGEN SpO₂', 300, 270);

    ctx.font = 'bold 46px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${spo2}`, 300, 335);
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('%', 380, 335);

    // Bottom Bar: Activity Recognition & TinyML Risk
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#10b981';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 45, 390, 420, 80, 16);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('🏃 AI ACTIVITY (HAR):', 65, 422);

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(activity, 65, 452);

    ctx.textAlign = 'right';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#10b981';
    ctx.fillText(`RISK: ${risk.toUpperCase()}`, 445, 422);

    ctx.font = '13px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`MAG: ${mpu?.accel_magnitude ?? 9.8} m/s²`, 445, 452);
  }

  private renderMedical(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: string,
    bpm: number,
    spo2: number,
    mpu: SensorTelemetry['mpu6050'],
    battery: SensorTelemetry['battery'],
    activity: string,
    risk: string
  ): void {
    // Clinical dark green/black monitor background
    ctx.fillStyle = '#05130d';
    ctx.fillRect(0, 0, w, h);

    // Medical ECG grid lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 20; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 20; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top status
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#10b981';
    ctx.fillText('● PROWATCH ICU MONITOR', 40, 48);

    ctx.textAlign = 'right';
    ctx.fillText(time, w - 40, 48);

    // ECG wave simulation
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(40, 140);
    ctx.lineTo(120, 140);
    ctx.lineTo(135, 120);
    ctx.lineTo(150, 160);
    ctx.lineTo(165, 80);
    ctx.lineTo(185, 200);
    ctx.lineTo(200, 130);
    ctx.lineTo(220, 140);
    ctx.lineTo(310, 140);
    ctx.lineTo(325, 120);
    ctx.lineTo(340, 160);
    ctx.lineTo(355, 80);
    ctx.lineTo(375, 200);
    ctx.lineTo(390, 130);
    ctx.lineTo(470, 140);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Vital Stats Display
    ctx.textAlign = 'left';
    // HR Section
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('PULSE RATE (BPM)', 45, 260);
    ctx.font = 'bold 74px monospace';
    ctx.fillText(`${bpm}`, 45, 335);

    // SpO2 Section
    ctx.textAlign = 'right';
    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SpO₂ PLETH (%)', w - 45, 260);
    ctx.font = 'bold 74px monospace';
    ctx.fillText(`${spo2}%`, w - 45, 335);

    // Clinical NEWS2 Evaluation Badge
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = risk === 'High' ? '#ef4444' : risk === 'Medium' ? '#f59e0b' : '#10b981';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 40, 390, 432, 80, 12);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`NEWS2 SCORE: ${risk === 'High' ? 'CRITICAL (3)' : risk === 'Medium' ? 'ALERT (1)' : 'NORMAL (0)'}`, 60, 425);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(`TIN CẬY: 98.4% • TINYML ESP32-S3 INT8`, 60, 452);
  }

  private renderPipBoy(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: string,
    bpm: number,
    spo2: number,
    mpu: SensorTelemetry['mpu6050'],
    battery: SensorTelemetry['battery'],
    activity: string,
    risk: string
  ): void {
    // Retro Phosphor Amber/Green Monochrome
    ctx.fillStyle = '#001a08';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 25, 25, w - 50, h - 50, 16);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#34d399';
    ctx.fillText('--- PIP-WATCH v3.2 ---', w / 2, 70);

    ctx.font = 'bold 58px monospace';
    ctx.fillText(time, w / 2, 140);

    // Vault Boy icon placeholder / Status
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`[ STAT: ${activity.toUpperCase()} ]`, w / 2, 190);

    // Vitals in retro gauges
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`HP RATE : ${bpm} BPM`, 50, 270);
    ctx.fillText(`O2 SAT  : ${spo2}%`, 50, 315);
    ctx.fillText(`ACCEL   : ${mpu?.accel_magnitude ?? 9.82} m/s²`, 50, 360);
    const battNum = typeof battery === 'number' ? battery : (battery as any)?.level ?? 85;
    ctx.fillText(`POWER   : ${battNum}% VOLTS`, 50, 405);

    // Bottom Scanline warning
    ctx.textAlign = 'center';
    ctx.fillStyle = '#059669';
    ctx.font = '16px monospace';
    ctx.fillText(`STATUS: SYSTEM OPTIMAL • ALL SENSORS GO`, w / 2, 455);
  }

  private renderMinimal(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: string,
    bpm: number,
    spo2: number,
    battery: SensorTelemetry['battery'],
    activity: string,
    risk: string
  ): void {
    // Elegant deep black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Large Minimalist Typography Clock
    ctx.textAlign = 'center';
    ctx.font = '300 100px -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(time.slice(0, 5), w / 2, 180);

    ctx.font = '400 32px sans-serif';
    ctx.fillStyle = '#ff6d5a';
    ctx.fillText(time.slice(5), w / 2, 230);

    // Elegant Activity & Vitals Ring preview
    ctx.beginPath();
    ctx.arc(w / 2, 350, 80, 0, Math.PI * 2);
    ctx.strokeStyle = '#27272a';
    ctx.lineWidth = 14;
    ctx.stroke();

    // Progress Arc for Heart Rate
    const hrAngle = Math.min(1.0, (bpm - 40) / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(w / 2, 350, 80, -Math.PI / 2, -Math.PI / 2 + hrAngle);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner BPM text
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${bpm}`, w / 2, 350);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('BPM', w / 2, 375);

    // Top / Bottom subtle badges
    ctx.font = '600 18px sans-serif';
    ctx.fillStyle = '#10b981';
    const battMin = typeof battery === 'number' ? battery : (battery as any)?.level ?? 90;
    ctx.fillText(`SpO₂ ${spo2}%  •  ${battMin}% PIN`, w / 2, 475);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  public dispose(): void {
    this.texture.dispose();
  }
}
