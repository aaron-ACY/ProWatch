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
  private cursorBlink = 0;

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
    _theme: WatchFaceTheme = 'PIPBOY',
    timeStr?: string
  ): void {
    const { max30102, mpu6050, battery } = telemetry;
    const now = Date.now();
    const bpm = max30102.heart_rate || 75;
    const spo2 = max30102.spo2 || 98;
    const currentActivity = prediction?.predicted_activity || 'Đang nghỉ ngơi';
    const riskLevel =
      max30102.heart_rate > 120 || max30102.spo2 < 93
        ? 'High'
        : max30102.heart_rate > 100 || max30102.spo2 < 95
        ? 'Medium'
        : 'Low';

    // Heartbeat pulse animation
    const beatInterval = 60000 / Math.max(40, bpm);
    const elapsed = now - this.lastBpmTick;
    if (elapsed > beatInterval) {
      this.lastBpmTick = now;
      this.heartScale = 1.35;
    } else {
      this.heartScale = Math.max(1.0, this.heartScale - 0.05);
    }

    this.cursorBlink = Math.floor(now / 500) % 2;

    const clockTime =
      timeStr ||
      new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Watch Face locked strictly to Pip-Boy 3000
    this.renderPipBoy(
      ctx,
      w,
      h,
      clockTime,
      bpm,
      spo2,
      mpu6050,
      battery,
      currentActivity,
      riskLevel
    );

    this.texture.needsUpdate = true;
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
    // 1. Phosphor Deep Terminal Background
    ctx.fillStyle = '#021307';
    ctx.fillRect(0, 0, w, h);

    // Subtle CRT green radial glow from center
    const radial = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, 260);
    radial.addColorStop(0, 'rgba(34, 197, 94, 0.08)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);

    // 2. Pip-Boy Terminal Border Frame with Corner Brackets
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 22, 22, w - 44, h - 44, 14);
    ctx.stroke();

    // Corner L-brackets
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 3;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(18, 38);
    ctx.lineTo(18, 18);
    ctx.lineTo(38, 18);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(w - 38, 18);
    ctx.lineTo(w - 18, 18);
    ctx.lineTo(w - 18, 38);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(18, h - 38);
    ctx.lineTo(18, h - 18);
    ctx.lineTo(38, h - 18);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(w - 38, h - 18);
    ctx.lineTo(w - 18, h - 18);
    ctx.lineTo(w - 18, h - 38);
    ctx.stroke();

    // 3. Pip-Boy Header Bar: STAT | INV | DATA | MAP
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(32, 34, 85, 26);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(32, 34, 85, 26);

    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#86efac';
    ctx.textAlign = 'center';
    ctx.fillText('● STAT', 74, 52);

    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#16a34a';
    ctx.fillText('INV', 165, 52);
    ctx.fillText('DATA', 245, 52);
    ctx.fillText('MAP', 325, 52);

    // Battery / AP on top right
    const battNum = typeof battery === 'number' ? battery : (battery as any)?.level ?? 88;
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'right';
    ctx.fillText(`⚡ ${battNum}% AP`, w - 34, 52);

    // Horizontal Separator Line with notch
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(28, 68);
    ctx.lineTo(w - 28, 68);
    ctx.stroke();

    // 4. Large Glowing Monospace Clock
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px "Courier New", monospace';
    ctx.fillStyle = '#4ade80';
    ctx.shadowColor = 'rgba(74, 222, 128, 0.65)';
    ctx.shadowBlur = 12;
    ctx.fillText(time, w / 2, 128);
    ctx.restore();

    // Vault-Tec Subtitle
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = '#16a34a';
    ctx.textAlign = 'center';
    ctx.fillText('VAULT-TEC PIP-BOY 3000 • BIOMETRICS', w / 2, 148);

    // 5. Center Section: Vault Boy Avatar (Left) & Realtime Stats (Right)
    // Draw Vault Boy at (115, 245)
    this.drawVaultBoy(ctx, 115, 245, this.heartScale);

    // Vault Boy Condition Badge
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = risk === 'High' ? '#ef4444' : '#4ade80';
    ctx.fillText(`CND: ${risk === 'High' ? 'CRITICAL' : 'OPTIMAL'}`, 115, 320);

    // Right Column: Telemetry Gauges
    const rightX = 210;
    const barW = 250;

    // Row 1: Heart Rate
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = '#86efac';
    ctx.fillText('HP RATE', rightX, 185);
    ctx.textAlign = 'right';
    ctx.fillStyle = bpm > 110 ? '#f87171' : '#4ade80';
    ctx.fillText(`${bpm} BPM`, rightX + barW, 185);
    // Gauge Bar (0 - 150 BPM)
    const hrFilled = Math.min(10, Math.max(1, Math.round(((bpm - 40) / 100) * 10)));
    this.drawSegmentedBar(ctx, rightX, 192, barW, 10, 10, hrFilled, bpm > 110 ? '#ef4444' : '#22c55e');

    // Row 2: SpO2
    ctx.textAlign = 'left';
    ctx.fillStyle = '#86efac';
    ctx.fillText('O2 SAT', rightX, 225);
    ctx.textAlign = 'right';
    ctx.fillStyle = spo2 < 95 ? '#fbbf24' : '#4ade80';
    ctx.fillText(`${spo2}%`, rightX + barW, 225);
    const spo2Filled = Math.min(10, Math.max(1, Math.round((spo2 / 100) * 10)));
    this.drawSegmentedBar(ctx, rightX, 232, barW, 10, 10, spo2Filled, spo2 < 95 ? '#f59e0b' : '#22c55e');

    // Row 3: Accelerometer
    ctx.textAlign = 'left';
    ctx.fillStyle = '#86efac';
    ctx.fillText('ACCEL G', rightX, 265);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4ade80';
    const accelVal = mpu?.accel_magnitude ? mpu.accel_magnitude.toFixed(2) : '9.81';
    ctx.fillText(`${accelVal} m/s²`, rightX + barW, 265);
    const accelFilled = Math.min(10, Math.max(1, Math.round((parseFloat(accelVal) / 20) * 10)));
    this.drawSegmentedBar(ctx, rightX, 272, barW, 10, 10, accelFilled, '#22c55e');

    // Row 4: Radiation (RADS) & Activity
    ctx.textAlign = 'left';
    ctx.fillStyle = '#86efac';
    ctx.fillText('RADS', rightX, 305);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('0.00 RAD/S', rightX + barW, 305);
    this.drawSegmentedBar(ctx, rightX, 312, barW, 10, 10, 1, '#22c55e');

    // 6. Action Box (Activity Recognition & Clinical Risk)
    ctx.fillStyle = 'rgba(6, 78, 59, 0.4)';
    ctx.strokeStyle = risk === 'High' ? '#ef4444' : '#15803d';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 35, 345, w - 70, 72, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = '#a7f3d0';
    ctx.fillText(`► HOẠT ĐỘNG: ${activity.toUpperCase()}`, 50, 372);

    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillStyle = risk === 'High' ? '#f87171' : '#34d399';
    ctx.fillText(`► TRẠNG THÁI: ${risk === 'High' ? 'CẢNH BÁO RỦI RO CAO' : 'CHỈ SỐ BÌNH THƯỜNG (AN TOÀN)'}`, 50, 398);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#86efac';
    ctx.fillText('ESP32-S3 INT8', w - 50, 398);

    // 7. Bottom Diagnostics Status Line
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(35, 435);
    ctx.lineTo(w - 35, 435);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = '#10b981';
    const cursor = this.cursorBlink ? '_' : ' ';
    ctx.fillText(`VAULT-TEC OS v3.8.2 // SENSORS OK // RUNNING${cursor}`, 38, 458);

    ctx.textAlign = 'right';
    ctx.fillText('60 FPS', w - 38, 458);

    // 8. CRT Scanlines Effect (Emulate retro phosphor monitor raster)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }
  }

  private drawVaultBoy(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    pulse: number
  ): void {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.strokeStyle = '#4ade80';
    ctx.fillStyle = '#4ade80';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Hair swirl
    ctx.beginPath();
    ctx.moveTo(-18, -32);
    ctx.quadraticCurveTo(-26, -46, -10, -48);
    ctx.quadraticCurveTo(8, -52, 14, -38);
    ctx.quadraticCurveTo(22, -42, 24, -30);
    ctx.stroke();

    // Head outline
    ctx.beginPath();
    ctx.arc(0, -22, 19, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes: left eye dot, right eye winking
    ctx.beginPath();
    ctx.arc(-7, -23, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Winking right eye
    ctx.beginPath();
    ctx.arc(8, -23, 4, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Smile
    ctx.beginPath();
    ctx.arc(0, -16, 9, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // Body / Jumpsuit Torso
    ctx.beginPath();
    ctx.moveTo(-14, -2);
    ctx.lineTo(-18, 28);
    ctx.lineTo(18, 28);
    ctx.lineTo(14, -2);
    ctx.closePath();
    ctx.stroke();

    // Jumpsuit V-collar & Zipper
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(0, 8);
    ctx.lineTo(6, -2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, 28);
    ctx.stroke();

    // Left Arm: Thumbs up!
    ctx.beginPath();
    ctx.moveTo(-14, 4);
    ctx.lineTo(-30, 10);
    ctx.lineTo(-32, -4);
    ctx.stroke();
    // Fist
    ctx.beginPath();
    ctx.arc(-32, -8, 5, 0, Math.PI * 2);
    ctx.stroke();
    // Thumb
    ctx.beginPath();
    ctx.moveTo(-32, -13);
    ctx.lineTo(-32, -22);
    ctx.stroke();

    // Right Arm resting on hip
    ctx.beginPath();
    ctx.moveTo(14, 4);
    ctx.lineTo(26, 14);
    ctx.lineTo(18, 24);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(-10, 28);
    ctx.lineTo(-12, 50);
    ctx.moveTo(10, 28);
    ctx.lineTo(12, 50);
    ctx.stroke();

    // Feet
    ctx.beginPath();
    ctx.moveTo(-12, 50);
    ctx.lineTo(-20, 50);
    ctx.moveTo(12, 50);
    ctx.lineTo(20, 50);
    ctx.stroke();

    // Pulsing heartbeat ring around chest
    if (pulse > 1.05) {
      ctx.beginPath();
      ctx.arc(0, 8, 14 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSegmentedBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    totalSegments: number,
    filledSegments: number,
    activeColor = '#4ade80',
    inactiveColor = '#064e3b'
  ): void {
    const gap = 3;
    const segW = (w - (totalSegments - 1) * gap) / totalSegments;
    for (let i = 0; i < totalSegments; i++) {
      const segX = x + i * (segW + gap);
      ctx.fillStyle = i < filledSegments ? activeColor : inactiveColor;
      ctx.fillRect(segX, y, segW, h);
      if (i < filledSegments) {
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(segX, y, segW, h);
      }
    }
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
