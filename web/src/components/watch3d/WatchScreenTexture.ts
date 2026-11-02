import * as THREE from 'three';
import { SensorTelemetry } from '../../types/sensor';
import { AIPrediction } from '../../types/ai';
import { WatchFaceTheme } from './types';

export type WatchMenu = 'START' | 'HEART' | 'DATA';

export class WatchScreenTexture {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  public powerOn: boolean = false;
  public language: 'vi' | 'en' = 'vi';
  public currentMenu: WatchMenu = 'START';
  public isMeasuring: boolean = false;
  public measuringProgress: number = 0;

  private lastBpmTick = 0;
  private heartScale = 1.0;
  private walkPhase = 0;
  private vaultBoyImg: HTMLImageElement | null = null;
  private isImgLoaded = false;
  private walkSheetImg: HTMLImageElement | null = null;
  private isSheetLoaded = false;

  // Real Firmware Bitmap Assets extracted from Watch source code
  private bgStartImg: HTMLImageElement | null = null;
  private bgHeartImg: HTMLImageElement | null = null;
  private bgDataImg: HTMLImageElement | null = null;
  private tim0Img: HTMLImageElement | null = null;
  private tim1Img: HTMLImageElement | null = null;
  private strongSheetImg: HTMLImageElement | null = null;
  private cursorStImg: HTMLImageElement | null = null;

  private wasPowerOn = false;
  private powerOffTime = 0;

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

    // Load authentic firmware bitmaps
    if (typeof window !== 'undefined') {
      const sheet = new Image();
      sheet.src = '/vault_boy_walk_sheet.png';
      sheet.onload = () => {
        this.walkSheetImg = sheet;
        this.isSheetLoaded = true;
        this.texture.needsUpdate = true;
      };

      const img = new Image();
      img.src = '/vault_boy_pipboy.png';
      img.onload = () => {
        this.vaultBoyImg = img;
        this.isImgLoaded = true;
        this.texture.needsUpdate = true;
      };

      const bgS = new Image();
      bgS.src = '/screens/bg_start.png';
      bgS.onload = () => {
        this.bgStartImg = bgS;
        this.texture.needsUpdate = true;
      };

      const bgH = new Image();
      bgH.src = '/screens/bg_heart.png';
      bgH.onload = () => {
        this.bgHeartImg = bgH;
        this.texture.needsUpdate = true;
      };

      const bgD = new Image();
      bgD.src = '/screens/bg_data.png';
      bgD.onload = () => {
        this.bgDataImg = bgD;
        this.texture.needsUpdate = true;
      };

      const t0 = new Image();
      t0.src = '/screens/tim_0.png';
      t0.onload = () => {
        this.tim0Img = t0;
        this.texture.needsUpdate = true;
      };

      const t1 = new Image();
      t1.src = '/screens/tim_1.png';
      t1.onload = () => {
        this.tim1Img = t1;
        this.texture.needsUpdate = true;
      };

      const strSheet = new Image();
      strSheet.src = '/screens/strong_sheet.png';
      strSheet.onload = () => {
        this.strongSheetImg = strSheet;
        this.texture.needsUpdate = true;
      };

      const cSt = new Image();
      cSt.src = '/screens/cursor_st.png';
      cSt.onload = () => {
        this.cursorStImg = cSt;
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

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // 1. Physical Power OFF State Handling
    if (!this.powerOn) {
      if (this.wasPowerOn) {
        this.wasPowerOn = false;
        this.powerOffTime = now;
      }
      this.renderPowerOff(ctx, w, h, now - this.powerOffTime);
      this.texture.needsUpdate = true;
      return;
    }
    this.wasPowerOn = true;

    // 2. Active Power-ON Calculations
    const walkSpeed = 5.2; // rad/s
    this.walkPhase = (now / 1000) * walkSpeed;

    // Heartbeat pulse calculation
    const beatInterval = 60000 / Math.max(40, bpm);
    const elapsed = now - this.lastBpmTick;
    if (elapsed > beatInterval) {
      this.lastBpmTick = now;
      this.heartScale = 1.25;
    } else {
      this.heartScale = Math.max(1.0, this.heartScale - 0.035);
    }

    if (this.isMeasuring) {
      this.measuringProgress = Math.min(100, this.measuringProgress + 1.2);
      if (this.measuringProgress >= 100) {
        this.isMeasuring = false;
        this.measuringProgress = 0;
      }
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

    // 3. Render Active Menu (START, HEART, DATA)
    switch (this.currentMenu) {
      case 'START':
        this.renderExactPipBoy(ctx, w, h, hoursStr, minutesStr, dateFormatted, bpm, spo2);
        break;
      case 'HEART':
        this.renderHeartMenu(ctx, w, h, bpm, spo2);
        break;
      case 'DATA':
        this.renderDataMenu(ctx, w, h);
        break;
    }

    this.texture.needsUpdate = true;
  }

  /**
   * Universal HUD Tab Header (Fallback)
   */
  private renderHeader(ctx: CanvasRenderingContext2D, w: number, activeMenu: WatchMenu): void {
    const tabs: { id: WatchMenu; label: string; x: number; w: number }[] = [
      { id: 'START', label: 'START', x: 76, w: 90 },
      { id: 'HEART', label: 'HEART', x: 232, w: 90 },
      { id: 'DATA', label: 'DATA', x: 380, w: 80 },
    ];

    const activeTab = tabs.find((t) => t.id === activeMenu) || tabs[0];
    const phosphor = '#34d399';
    const brightPhosphor = '#4ade80';
    const dimPhosphor = '#14532d';

    ctx.save();
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = phosphor;

    const tabL = activeTab.x - 10;
    const tabR = activeTab.x + activeTab.w - 10;

    // Left stepped bracket
    ctx.beginPath();
    ctx.moveTo(18, 52);
    ctx.lineTo(tabL - 8, 52);
    ctx.lineTo(tabL - 8, 26);
    ctx.lineTo(tabL, 26);
    ctx.stroke();

    // Right stepped bracket
    ctx.beginPath();
    ctx.moveTo(tabR, 26);
    ctx.lineTo(tabR + 8, 26);
    ctx.lineTo(tabR + 8, 52);
    ctx.lineTo(w - 18, 52);
    ctx.stroke();

    // Render Tab Labels with glow on active
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    tabs.forEach((t) => {
      const isActive = t.id === activeMenu;
      ctx.fillStyle = isActive ? brightPhosphor : dimPhosphor;
      if (isActive) {
        ctx.shadowColor = 'rgba(74, 222, 128, 0.7)';
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fillText(t.label, t.x - 4, 45);
    });

    ctx.restore();
  }

  /**
   * MENU 1: START (Exact 100% Replication of menu_start.h & Firmware Bitmaps)
   * Elements:
   *  - Static Background: epd_bitmap_start (240x240, header [ START ] HEART DATA, time brackets, date box, HP box)
   *  - Hours (HH): in left top box (8, 42, 90, 60), center (53, 72)
   *  - Minutes (MM): in left mid box (8, 124, 90, 60), center (53, 154)
   *  - Date: in bottom-left box (8, 208, 104, 20), center (60, 218)
   *  - SpO2 Bar: frame at (130, 45, 95, 12), fill at (131, 46, barW, 10), text "SPO2: XX%" at (130, 68)
   *  - Walking Vault-Boy: at (145, 78, 80, 120) with 7 frames alternating step (gifwalk.h)
   *  - HP: "HP 100" fixed constant in box (137, 207, 86, 20), center (180, 217)
   */
  private renderExactPipBoy(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    hours: string,
    minutes: string,
    dateStr: string,
    _bpm: number,
    spo2: number
  ): void {
    const now = Date.now();
    ctx.save();

    // 1. CRT Dark Phosphor Base
    ctx.fillStyle = '#021307';
    ctx.fillRect(0, 0, w, h);

    // 2. Scale 240x240 Native Firmware Coordinates to 512x512 Canvas
    const scale = w / 240;
    ctx.scale(scale, scale);

    const brightPhosphor = '#4ade80';

    // 3. Static HUD Background: epd_bitmap_start
    if (this.bgStartImg) {
      ctx.drawImage(this.bgStartImg, 0, 0, 240, 240);
    }

    // 4. Time Stacked: Hours & Minutes in left column brackets
    ctx.font = 'bold 50px "Courier New", monospace';
    ctx.fillStyle = brightPhosphor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hours, 53, 72);
    ctx.fillText(minutes, 53, 154);

    // 5. Date in bottom-left box: "DD.MM.YYYY"
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText(dateStr, 60, 218);

    // 6. SpO2 Progress Bar and Label (from start_draw_SPO2 in menu_start.h)
    ctx.strokeStyle = brightPhosphor;
    ctx.lineWidth = 1;
    ctx.strokeRect(130.5, 45.5, 94, 11);

    const safeSpo2 = Math.min(100, Math.max(0, spo2));
    const barW = Math.round((92 * safeSpo2) / 100);
    ctx.fillStyle = brightPhosphor;
    ctx.fillRect(131, 46, barW, 10);

    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SPO2: ${String(safeSpo2).padStart(2, '0')}%`, 130, 68);

    // 7. Walking Vault-Boy: (145, 78, 80, 120), 7-frame alternating step (gifwalk.h)
    const frameCount = 7;
    const frameDurationMs = 125;
    const currentFrame = Math.floor((now / frameDurationMs) % frameCount);

    if (this.isSheetLoaded && this.walkSheetImg) {
      const srcW = 80;
      const srcH = 120;
      const srcX = currentFrame * srcW;
      ctx.drawImage(
        this.walkSheetImg,
        srcX, 0, srcW, srcH,
        145, 78, 80, 120
      );
    } else if (this.isImgLoaded && this.vaultBoyImg) {
      ctx.drawImage(this.vaultBoyImg, 145, 78, 80, 120);
    }

    // 8. HP Status: Cố định hằng số "HP 100" theo thiết kế (start_draw_HP in menu_start.h)
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HP 100', 180, 217);

    ctx.restore();
    this.renderScanlines(ctx, w, h);
  }

  /**
   * MENU 2: HEART (Exact 100% Replication of menu_heart.h & Prototype Photo)
   * Elements:
   *  - Static Background: epd_bitmap_HEART (START [HEART] DATA, brackets, HEART RATE)
   *  - Left Top: Beating Heart with ECG line (giftim.h, 60x60px at x=23, y=48)
   *  - Left Mid: BPM Value (Orbitron 16 at x=21, y=130: e.g. "078/m" or "---/m")
   *  - Left Bot: 6 Bar Histogram above "HEART RATE" (x=14+i*13, y=210-h, w=8)
   *  - Right Top: Full Time HH:MM:SS (Orbitron 16 at x=140, y=55)
   *  - Right Mid: Muscular Flexing Pip-Boy (gifstrong.h, 80x120px at x=135, y=78)
   *  - Right Bot: Oxygen O2 Level (Orbitron 16 at x=140, y=222: e.g. "O2 98%" or "O2 --%")
   */
  private renderHeartMenu(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    bpm: number,
    spo2: number
  ): void {
    const now = Date.now();
    ctx.save();

    // 1. CRT Dark Phosphor Base
    ctx.fillStyle = '#021307';
    ctx.fillRect(0, 0, w, h);

    // 2. Scale 240x240 Native Firmware Coordinates to 512x512 Canvas
    const scale = w / 240;
    ctx.scale(scale, scale);

    const brightPhosphor = '#4ade80';

    // 3. Static HUD Background: epd_bitmap_HEART
    if (this.bgHeartImg) {
      ctx.drawImage(this.bgHeartImg, 0, 0, 240, 240);
    }

    // 4. Beating Heart with ECG Pulse: (23, 48), 60x60px (giftim.h)
    const isTim1 = Math.floor(now / 400) % 2 === 1;
    const timImg = isTim1 ? (this.tim1Img || this.tim0Img) : this.tim0Img;
    if (timImg) {
      ctx.drawImage(timImg, 23, 48, 60, 60);
    }

    // 5. BPM text: (21, 130) in box (20, 115, 75, 21)
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillStyle = brightPhosphor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bpmStr = bpm > 0 ? `${String(bpm).padStart(3, '0')}/m` : '---/m';
    ctx.fillText(bpmStr, 58, 126);

    // 6. Time text: HH:MM:SS at (140, 55) in box (138, 41, 86, 20)
    const d = new Date();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.fillText(`${hh}:${mm}:${ss}`, 181, 51);

    // 7. Muscular Flexing Pip-Boy: (135, 78), 80x120px (gifstrong.h)
    const strongFrame = Math.floor(now / 350) % 4;
    if (this.strongSheetImg) {
      ctx.drawImage(
        this.strongSheetImg,
        strongFrame * 80, 0, 80, 120,
        135, 78, 80, 120
      );
    }

    // 8. Oxygen SpO2 text: "O2 98%" or "O2 --%" at (140, 222) in box (138, 206, 85, 20)
    const o2Str = spo2 > 0 ? `O2 ${spo2}%` : 'O2 --%';
    ctx.fillText(o2Str, 181, 216);

    // 9. 6 Vertical Graph Bars above HEART RATE: (12, 160, 110, 50)
    const baseVal = bpm > 0 ? bpm : 76;
    const offsets = [-8, 6, -4, 12, -2, 4];
    ctx.fillStyle = brightPhosphor;
    for (let i = 0; i < 6; i++) {
      const v = Math.max(40, Math.min(140, baseVal + offsets[i] + Math.sin(now / 450 + i) * 6));
      const barH = Math.max(5, Math.min(45, ((v - 40) / 100) * 45));
      ctx.fillRect(14 + i * 13, 210 - barH, 8, barH);
    }

    ctx.restore();
    this.renderScanlines(ctx, w, h);
  }

  /**
   * MENU 3: DATA (Exact 100% Replication of menu_data.h & Prototype Photo)
   * Elements:
   *  - Static Background: epd_bitmap_DATA (START HEART [DATA], Settings Gear, Checkmark)
   *  - Left Column (Time):
   *      HH  at (43, 85)
   *      MIN at (43, 126)
   *      SEC at (43, 168)
   *  - Right Column (Date):
   *      DAY  at (155, 85)
   *      MON  at (155, 126)
   *      YEAR at (155, 168)
   *  - Bottom Left: Selection cursor bracket (epd_bitmap_ST, 64x44px at x=12, y=188) framing Settings Gear [ ⚙ ]
   *  - Bottom Right: Checkmark ✔
   */
  private renderDataMenu(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();

    // 1. CRT Dark Phosphor Base
    ctx.fillStyle = '#021307';
    ctx.fillRect(0, 0, w, h);

    // 2. Scale 240x240 Native Firmware Coordinates to 512x512 Canvas
    const scale = w / 240;
    ctx.scale(scale, scale);

    const brightPhosphor = '#4ade80';

    // 3. Static HUD Background: epd_bitmap_DATA
    if (this.bgDataImg) {
      ctx.drawImage(this.bgDataImg, 0, 0, 240, 240);
    }

    const d = new Date();
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    const ss = d.getSeconds().toString().padStart(2, '0');

    const day = d.getDate().toString().padStart(2, '0');
    const mon = (d.getMonth() + 1).toString().padStart(2, '0');
    const yr = (d.getFullYear() % 100).toString().padStart(2, '0');

    // 4. Two Value Columns (Open_Sans_Hebrew_Bold_30 from menu_data.h)
    ctx.font = 'bold 30px "Courier New", monospace';
    ctx.fillStyle = brightPhosphor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Left Column: Time (HH, MIN, SEC)
    ctx.fillText(hh, 43, 85);
    ctx.fillText(mm, 43, 126);
    ctx.fillText(ss, 43, 168);

    // Right Column: Date (DAY, MON, YEAR)
    ctx.fillText(day, 155, 85);
    ctx.fillText(mon, 155, 126);
    ctx.fillText(yr, 155, 168);

    // 5. Selection Bracket around Settings Gear at bottom-left: (12, 188), 64x44px (epd_bitmap_ST)
    if (this.cursorStImg) {
      ctx.drawImage(this.cursorStImg, 12, 188, 64, 44);
    }

    ctx.restore();
    this.renderScanlines(ctx, w, h);
  }

  /**
   * PHYSICAL POWER-OFF STATE (CRT Shutdown Collapse & Deep Black Sleep)
   */
  private renderPowerOff(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    elapsedMs: number
  ): void {
    if (this.powerOffTime > 0 && elapsedMs < 350) {
      ctx.fillStyle = '#020503';
      ctx.fillRect(0, 0, w, h);

      const progress = elapsedMs / 350;
      const beamWidth = Math.max(2, (1 - progress) * w);
      const beamHeight = Math.max(1.5, (1 - progress * 1.5) * 6);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#4ade80';
      ctx.shadowBlur = 16;
      ctx.fillRect((w - beamWidth) / 2, (h - beamHeight) / 2, beamWidth, beamHeight);
      ctx.restore();
      return;
    }

    ctx.fillStyle = '#010202';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(74, 222, 128, 0.22)';
    ctx.textAlign = 'center';
    const msg = this.language === 'en'
      ? 'STANDBY • TAP SCREEN OR SWITCH TO POWER ON'
      : 'STANDBY • CHẠM MÀN HÌNH HOẶC GẠT CÔNG TẮC ĐỂ BẬT';
    ctx.fillText(msg, w / 2, h / 2);
  }

  private renderScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }
  }

  private drawVaultBoyVector(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    phase: number
  ): void {
    ctx.save();
    ctx.translate(cx, cy);

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
    const legSwing = Math.sin(phase) * 16;
    ctx.beginPath();
    ctx.moveTo(-12, 20);
    ctx.lineTo(-12 - legSwing, 60);
    ctx.moveTo(12, 20);
    ctx.lineTo(12 + legSwing, 60);
    ctx.stroke();

    // Walking Arms
    const armSwing = Math.cos(phase) * 14;
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(-32 + armSwing, 8);
    ctx.moveTo(18, -10);
    ctx.lineTo(32 - armSwing, 8);
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
