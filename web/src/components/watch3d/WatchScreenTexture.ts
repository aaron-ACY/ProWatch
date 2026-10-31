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
  private vaultBoyImg: HTMLImageElement | null = null;
  private isImgLoaded = false;

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

    // Load authentic Vault Boy sprite extracted directly from physical prototype
    if (typeof window !== 'undefined') {
      const img = new Image();
      img.src = '/vault_boy_pipboy.png';
      img.onload = () => {
        this.vaultBoyImg = img;
        this.isImgLoaded = true;
        this.texture.needsUpdate = true;
      };
    }
  }

  public update(
    telemetry: SensorTelemetry,
    _prediction?: AIPrediction,
    _theme: WatchFaceTheme = 'PIPBOY',
    timeStr?: string
  ): void {
    const { max30102 } = telemetry;
    const now = Date.now();
    const bpm = max30102?.heart_rate || 76;
    const spo2 = max30102?.spo2 || 98;

    // Heartbeat pulse animation
    const beatInterval = 60000 / Math.max(40, bpm);
    const elapsed = now - this.lastBpmTick;
    if (elapsed > beatInterval) {
      this.lastBpmTick = now;
      this.heartScale = 1.18;
    } else {
      this.heartScale = Math.max(1.0, this.heartScale - 0.03);
    }

    const d = new Date();
    let hoursStr = d.getHours().toString().padStart(2, '0');
    let minutesStr = d.getMinutes().toString().padStart(2, '0');
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      hoursStr = parts[0].padStart(2, '0');
      minutesStr = parts[1].padStart(2, '0');
    }

    const dayStr = d.getDate().toString().padStart(2, '0');
    const monthStr = (d.getMonth() + 1).toString().padStart(2, '0');
    const yearStr = d.getFullYear().toString();
    const dateFormatted = `${dayStr}.${monthStr}.${yearStr}`;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    this.renderExactPipBoy(ctx, w, h, hoursStr, minutesStr, dateFormatted, bpm, spo2);

    this.texture.needsUpdate = true;
  }

  private renderExactPipBoy(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    hours: string,
    minutes: string,
    dateStr: string,
    bpm: number,
    spo2: number
  ): void {
    // 1. Deep Phosphor CRT Dark Background
    ctx.fillStyle = '#021307';
    ctx.fillRect(0, 0, w, h);

    // Subtle radial phosphorescence
    const radial = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, 260);
    radial.addColorStop(0, 'rgba(34, 197, 94, 0.09)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);

    const phosphor = '#34d399';
    const brightPhosphor = '#4ade80';

    ctx.strokeStyle = phosphor;
    ctx.fillStyle = phosphor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    // 2. Header Row: ____| START |_________________ HEART   DATA
    // Left step
    ctx.beginPath();
    ctx.moveTo(24, 52);
    ctx.lineTo(58, 52);
    ctx.lineTo(58, 28);
    ctx.lineTo(68, 28);
    ctx.stroke();

    // START Tab Text
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('START', 76, 46);

    // Right of START tab
    ctx.beginPath();
    ctx.moveTo(166, 28);
    ctx.lineTo(178, 28);
    ctx.lineTo(178, 52);
    ctx.lineTo(490, 52);
    ctx.stroke();

    // HEART & DATA tabs
    ctx.fillText('HEART', 228, 44);
    ctx.fillText('DATA', 376, 44);

    // 3. Left Column: Stacked Time (Hours above Minutes)
    // Top bracket above hours
    ctx.beginPath();
    ctx.moveTo(38, 96);
    ctx.lineTo(38, 78);
    ctx.lineTo(232, 78);
    ctx.lineTo(232, 96);
    ctx.stroke();

    // Hours (e.g. "16")
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 114px "Courier New", monospace';
    ctx.fillStyle = brightPhosphor;
    ctx.shadowColor = 'rgba(74, 222, 128, 0.6)';
    ctx.shadowBlur = 10;
    ctx.fillText(hours, 135, 185);

    // Two dash pills between Hours and Minutes
    ctx.fillStyle = phosphor;
    ctx.shadowBlur = 0;
    this.roundRect(ctx, 72, 212, 34, 7, 3);
    ctx.fill();
    this.roundRect(ctx, 164, 212, 34, 7, 3);
    ctx.fill();

    // Minutes (e.g. "30")
    ctx.fillStyle = brightPhosphor;
    ctx.shadowBlur = 10;
    ctx.fillText(minutes, 135, 328);
    ctx.restore();

    // Bottom bracket below minutes
    ctx.beginPath();
    ctx.moveTo(38, 346);
    ctx.lineTo(38, 364);
    ctx.lineTo(232, 364);
    ctx.lineTo(232, 346);
    ctx.stroke();

    // 4. Date Box: ┌ 25.04.2026 ┐ with bottom underline
    ctx.beginPath();
    ctx.moveTo(34, 418);
    ctx.lineTo(34, 398);
    ctx.lineTo(228, 398);
    ctx.lineTo(228, 418);
    ctx.stroke();

    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = brightPhosphor;
    ctx.fillText(dateStr, 40, 426);

    // Bottom underline of date
    ctx.beginPath();
    ctx.moveTo(34, 452);
    ctx.lineTo(178, 452);
    ctx.moveTo(228, 432);
    ctx.lineTo(228, 452);
    ctx.lineTo(196, 452);
    ctx.stroke();

    // 5. Right Column: SpO2 Progress Bar
    // Outer rectangular border
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = phosphor;
    ctx.strokeRect(272, 78, 216, 26);

    // Inner Progress Bar Fill (proportional to spo2 %)
    const safeSpo2 = Math.min(100, Math.max(0, spo2));
    const fillWidth = Math.round((216 - 6) * (safeSpo2 / 100));
    ctx.fillStyle = brightPhosphor;
    ctx.fillRect(275, 81, fillWidth, 20);

    // Text: SPO2: XX%
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = phosphor;
    ctx.fillText(`SPO2: ${safeSpo2}%`, 272, 132);

    // 6. Right Column: Walking Vault Boy Graphic
    const vbW = 180;
    const vbH = 246;
    const vbX = 286;
    const vbY = 144;

    ctx.save();
    if (this.isImgLoaded && this.vaultBoyImg) {
      // Subtle heartbeat bounce/pulse
      const scale = this.heartScale;
      const offsetX = (vbW * (scale - 1)) / 2;
      const offsetY = (vbH * (scale - 1)) / 2;
      ctx.drawImage(this.vaultBoyImg, vbX - offsetX, vbY - offsetY, vbW * scale, vbH * scale);
    } else {
      // Vector procedural fallback while image loads
      this.drawVaultBoyVector(ctx, vbX + vbW / 2, vbY + vbH / 2, this.heartScale);
    }
    ctx.restore();

    // 7. Right Column: Boxed HP Gauge
    const hpX = 268;
    const hpY = 398;
    const hpW = 220;
    const hpH = 56;
    const tick = 18;

    ctx.lineWidth = 3;
    ctx.strokeStyle = phosphor;
    // Top-Left corner
    ctx.beginPath();
    ctx.moveTo(hpX, hpY + tick);
    ctx.lineTo(hpX, hpY);
    ctx.lineTo(hpX + tick, hpY);
    ctx.stroke();
    // Top-Right corner
    ctx.beginPath();
    ctx.moveTo(hpX + hpW - tick, hpY);
    ctx.lineTo(hpX + hpW, hpY);
    ctx.lineTo(hpX + hpW, hpY + tick);
    ctx.stroke();
    // Bottom-Left corner
    ctx.beginPath();
    ctx.moveTo(hpX, hpY + hpH - tick);
    ctx.lineTo(hpX, hpY + hpH);
    ctx.lineTo(hpX + tick, hpY + hpH);
    ctx.stroke();
    // Bottom-Right corner
    ctx.beginPath();
    ctx.moveTo(hpX + hpW - tick, hpY + hpH);
    ctx.lineTo(hpX + hpW, hpY + hpH);
    ctx.lineTo(hpX + hpW, hpY + hpH - tick);
    ctx.stroke();

    // Center HP Text
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = brightPhosphor;
    ctx.fillText(`HP ${bpm}`, hpX + hpW / 2, hpY + 39);

    // 8. CRT Scanlines Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }
  }

  private drawVaultBoyVector(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    pulse: number
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);

    ctx.strokeStyle = '#4ade80';
    ctx.fillStyle = '#4ade80';
    ctx.lineWidth = 2.5;

    // Head
    ctx.beginPath();
    ctx.arc(0, -50, 24, 0, Math.PI * 2);
    ctx.stroke();

    // Body
    ctx.beginPath();
    ctx.moveTo(-18, -26);
    ctx.lineTo(-22, 20);
    ctx.lineTo(22, 20);
    ctx.lineTo(18, -26);
    ctx.closePath();
    ctx.stroke();

    // Walking Legs
    ctx.beginPath();
    ctx.moveTo(-12, 20);
    ctx.lineTo(-24, 60);
    ctx.moveTo(12, 20);
    ctx.lineTo(24, 60);
    ctx.stroke();

    ctx.restore();
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
