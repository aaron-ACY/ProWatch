import * as THREE from 'three';

/**
 * Procedural High-Fidelity Photorealistic Component Textures
 * Generates genuine electronics PCB, metal backplate, battery, and sensor textures
 * so the 3D model looks like real physical components rather than abstract CAD blocks.
 */

// 1. Front of 1.3" SPI TFT Display Module
export function createDisplayFrontTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.round(size * 1.3);
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // Blue FR4 PCB Baseplate
  ctx.fillStyle = '#173f8a';
  ctx.fillRect(0, 0, w, h);

  // Subtle PCB copper ground mesh texture
  ctx.fillStyle = 'rgba(23, 75, 160, 0.35)';
  for (let x = 0; x < w; x += 16) {
    ctx.fillRect(x, 0, 8, h);
  }
  for (let y = 0; y < h; y += 16) {
    ctx.fillRect(0, y, w, 8);
  }

  // Top Pin Header Area (Black soldermask strip)
  ctx.fillStyle = '#102a5c';
  ctx.fillRect(0, 0, w, 110);

  // 8 Gold Through-Hole Solder Pads with Silk-Screen Labels
  const pinLabels = ['GND', 'VCC', 'SCL', 'SDA', 'RES', 'DC', 'CS', 'BLK'];
  const startX = 130;
  const stepX = (w - startX * 2) / 7;

  ctx.font = 'bold 26px "Consolas", monospace';
  ctx.textAlign = 'center';

  for (let i = 0; i < 8; i++) {
    const px = startX + i * stepX;
    const py = 68;

    // Gold annular solder ring
    ctx.beginPath();
    ctx.arc(px, py, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#d4af37';
    ctx.fill();

    // Inner drill hole (silver/black)
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();

    // Solder tin meniscus
    ctx.beginPath();
    ctx.arc(px, py, 18, 0, Math.PI * 2);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // White silk-screen pin label above
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pinLabels[i], px, 34);
  }

  // Corner Mounting Standoff Holes (Top-Left & Top-Right)
  const drawStandoff = (cx: number, cy: number) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 38, 0, Math.PI * 2);
    ctx.fillStyle = '#d4af37';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#090a0f';
    ctx.fill();
  };
  drawStandoff(60, 68);
  drawStandoff(w - 60, 68);

  // Central Black LCD Glass Perimeter Bezel
  ctx.fillStyle = '#05070a';
  ctx.fillRect(45, 120, w - 90, h - 250);

  // LCD Active Area Border Guide
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.strokeRect(55, 130, w - 110, h - 270);

  // Bottom Kapton Flex Cable Area
  ctx.fillStyle = '#b45309'; // Amber Kapton tape
  ctx.fillRect(100, h - 120, w - 200, 110);

  // Copper traces inside Kapton
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 3;
  for (let i = 0; i < 18; i++) {
    const tx = 140 + i * 40;
    ctx.beginPath();
    ctx.moveTo(tx, h - 120);
    ctx.lineTo(tx, h - 10);
    ctx.stroke();
  }

  // 5 Bottom Gold Circular Solder Fingers
  for (let i = 0; i < 5; i++) {
    const fx = 230 + i * 140;
    ctx.beginPath();
    ctx.arc(fx, h - 55, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#d4af37';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx, h - 55, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#090a0f';
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 2. Rear Stainless Steel Backplate of the LCD Display Module
export function createDisplayBackTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = Math.round(size * 1.3);
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // Stamped Brushed Stainless Steel Base
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, w, h);

  // Brushed metal anisotropic texture lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Metal Stamped Indentations & Holding Clips
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, w - 60, h - 60);

  // Stamped clips at edges
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(20, 200, 15, 60);
  ctx.fillRect(20, 600, 15, 60);
  ctx.fillRect(w - 35, 200, 15, 60);
  ctx.fillRect(w - 35, 600, 15, 60);

  // Manufacturer Barcode Label Sticker in center
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w / 2 - 240, h / 2 - 120, 480, 240);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(w / 2 - 240, h / 2 - 120, 480, 240);

  // Model & Specs Text
  ctx.font = 'bold 32px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.fillText('1.3" IPS TFT LCD DISPLAY', w / 2, h / 2 - 60);

  ctx.font = '22px monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText('MODEL: ST7789V-SPI 240x240 RGB', w / 2, h / 2 - 25);
  ctx.fillText('INPUT: 3.3V DC • IPS FULL VIEW', w / 2, h / 2 + 5);

  // Barcode
  const barStart = w / 2 - 200;
  for (let x = 0; x < 400; x += 6) {
    if (Math.sin(x * 123.45) > -0.2) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(barStart + x, h / 2 + 30, (x % 12 === 0 ? 5 : 3), 45);
    }
  }

  // Green QC Pass Round Stamp
  ctx.save();
  ctx.translate(w / 2 + 260, h / 2 + 180);
  ctx.rotate(-0.25);
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 75, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#15803d';
  ctx.fillText('QC PASS', 0, -10);
  ctx.font = 'bold 20px monospace';
  ctx.fillText('2026.OK', 0, 25);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 3. Seeed Studio XIAO ESP32-S3 Genuine PCB Texture
export function createXiaoEsp32Texture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 850;
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // Matte Black Soldermask
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, w, h);

  // Copper Ground Traces & Vias
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 3;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(120 + i * 40, 40);
    ctx.lineTo(160 + i * 40, h - 40);
    ctx.stroke();
  }

  // Gold Castellated Half-Hole Edge Pads (7 on left, 7 on right)
  const padW = 75;
  const padH = 48;
  const startY = 110;
  const stepY = (h - 220) / 6;

  for (let i = 0; i < 7; i++) {
    const py = startY + i * stepY;

    // Left Pad
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(0, py, padW, padH);
    ctx.beginPath();
    ctx.arc(padW - 10, py + padH / 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();

    // Right Pad
    ctx.fillStyle = '#d4af37';
    ctx.fillRect(w - padW, py, padW, padH);
    ctx.beginPath();
    ctx.arc(w - padW + 10, py + padH / 2, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#111827';
    ctx.fill();
  }

  // White Silk-Screen Pin Labels
  ctx.font = 'bold 28px "Consolas", monospace';
  const labelsL = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
  const labelsR = ['5V', 'GND', '3V3', 'D10', 'D9', 'D8', 'D7'];

  for (let i = 0; i < 7; i++) {
    const py = startY + i * stepY + 34;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(labelsL[i], 100, py);

    ctx.textAlign = 'right';
    ctx.fillText(labelsR[i], w - 100, py);
  }

  // Central Laser-Etched RF Metal Shielding Can
  const shieldX = 230;
  const shieldY = 180;
  const shieldW = 560;
  const shieldH = 480;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(shieldX, shieldY, shieldW, shieldH);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 6;
  ctx.strokeRect(shieldX, shieldY, shieldW, shieldH);

  // Laser Etch Markings on RF Shield
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('Seeed Studio', w / 2, shieldY + 90);

  ctx.font = 'bold 52px "Helvetica Neue", sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('XIAO ESP32S3', w / 2, shieldY + 175);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('FCC ID: Z4T-XIAOESP32S3', w / 2, shieldY + 260);
  ctx.fillText('2.4GHz Wi-Fi / BLE 5.0 Mesh', w / 2, shieldY + 310);
  ctx.fillText('MODEL: ESP32-S3FH4R2 (8MB FLASH)', w / 2, shieldY + 360);
  ctx.fillText('RoHS Compliant • 240MHz Dual-Core', w / 2, shieldY + 410);

  // Micro SMD 0402 Components (Capacitors & Resistors around board)
  const drawSmd = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 22, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(x, y, 5, 14);
    ctx.fillRect(x + 17, y, 5, 14);
  };

  drawSmd(250, 110, '#b45309'); // Ceramic tan cap
  drawSmd(280, 110, '#b45309');
  drawSmd(310, 110, '#1e293b'); // Black resistor
  drawSmd(710, 110, '#1e293b');
  drawSmd(740, 110, '#b45309');

  // Power LED (Green) & Charge LED (Orange)
  ctx.beginPath();
  ctx.arc(380, 110, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#10b981';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(420, 110, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 4. Lithium Polymer Battery Pack wrapped in Black Electrical Tape
export function createBatteryTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // Deep Charcoal Black Vinyl Tape
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, w, h);

  // Overlapping Vinyl Tape Diagonal & Horizontal Seam Lines
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
  ctx.lineWidth = 4;
  for (let y = 60; y < h; y += 90) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + 10);
    ctx.stroke();
  }

  // Subtle tape wrinkles / sheen
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(40, 0, 80, h);
  ctx.fillRect(280, 0, 100, h);

  // Printed White Battery Specifications Label
  ctx.font = 'bold 26px "Consolas", monospace';
  ctx.fillStyle = '#f8fafc';
  ctx.textAlign = 'center';
  ctx.fillText('+ [ 3.7V 500mAh 1.85Wh ] -', w / 2, 170);

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('RECHARGEABLE Li-Po BATTERY', w / 2, 215);
  ctx.fillText('MODEL: 502535 • SEEED PROWATCH', w / 2, 255);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('⚠ CAUTION: DO NOT PUNCTURE OR HEAT', w / 2, 310);
  ctx.fillText('USE SPECIFIED CHARGING SYSTEM ONLY', w / 2, 340);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 5. GY-MAX30102 + MPU-6050 Breakout PCB Texture
export function createSensorBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 800;
  const ctx = canvas.getContext('2d')!;

  const w = canvas.width;
  const h = canvas.height;

  // Authentic Breakout Board Purple Soldermask
  ctx.fillStyle = '#3b0764';
  ctx.fillRect(0, 0, w, h);

  // Copper Ground Fill Traces
  ctx.strokeStyle = '#581c87';
  ctx.lineWidth = 4;
  for (let i = 0; i < w; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }

  // Silk-Screen Title Text
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('GY-MAX30102 & MPU-6050', w / 2, 70);
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('HEART RATE • PULSE OXIMETRY • 6-AXIS IMU', w / 2, 115);

  // Top Pin Header Holes (7 pins)
  const pinNames = ['VIN', 'GND', 'SCL', 'SDA', 'INT', 'IRD', 'RD'];
  const startX = 140;
  const stepX = (w - startX * 2) / 6;

  for (let i = 0; i < 7; i++) {
    const px = startX + i * stepX;
    const py = 180;

    // Solder pad ring
    ctx.beginPath();
    ctx.arc(px, py, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#d4af37';
    ctx.fill();

    // Solder hole
    ctx.beginPath();
    ctx.arc(px, py, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#090a0f';
    ctx.fill();

    // White pin name
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(pinNames[i], px, py + 55);
  }

  // MAX30102 Sensor Package Footprint (Left Center)
  const max30X = 260;
  const max30Y = 460;
  ctx.fillStyle = '#090a0f'; // Black matte ceramic package
  ctx.fillRect(max30X - 120, max30Y - 100, 240, 200);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(max30X - 120, max30Y - 100, 240, 200);

  // Twin Optical Lenses (RED & IR)
  ctx.beginPath();
  ctx.arc(max30X - 50, max30Y, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#ef4444'; // Red lens
  ctx.fill();

  ctx.beginPath();
  ctx.arc(max30X + 50, max30Y, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#450a0a'; // Dark IR lens
  ctx.fill();

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#f87171';
  ctx.fillText('MAX30102 OPTICAL', max30X, max30Y + 80);

  // MPU-6050 QFN Package (Right Center)
  const mpuX = 720;
  const mpuY = 460;
  ctx.fillStyle = '#090a0f';
  ctx.fillRect(mpuX - 100, mpuY - 100, 200, 200);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 3;
  ctx.strokeRect(mpuX - 100, mpuY - 100, 200, 200);

  // Pin 1 Dot
  ctx.beginPath();
  ctx.arc(mpuX - 75, mpuY - 75, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('MPU-6050', mpuX, mpuY - 10);
  ctx.font = '18px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('INVENSENSE', mpuX, mpuY + 25);
  ctx.fillText('GYRO+ACCEL', mpuX, mpuY + 55);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
