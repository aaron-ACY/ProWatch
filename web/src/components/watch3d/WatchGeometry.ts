import * as THREE from 'three';
import { StrapColor, STRAP_COLORS } from './types';

export interface Watch3DModel {
  rootGroup: THREE.Group;
  screenMesh: THREE.Mesh;
  glassMesh: THREE.Mesh;
  caseMesh: THREE.Mesh;
  strapsGroup: THREE.Group;
  sensorPodGroup: THREE.Group;
  internalsGroup: THREE.Group;
  sensorLedLight: THREE.PointLight;
  materials: {
    caseMaterial: THREE.MeshStandardMaterial;
    strapMaterial: THREE.MeshStandardMaterial;
    glassMaterial: THREE.MeshPhysicalMaterial;
    screenMaterial: THREE.MeshBasicMaterial;
    ledMaterial: THREE.MeshBasicMaterial;
    goldPadMaterial: THREE.MeshStandardMaterial;
    brassMaterial: THREE.MeshStandardMaterial;
  };
  setStrapColor: (color: StrapColor) => void;
  setExplodedProgress: (progress: number) => void;
  setPulseGlow: (intensity: number) => void;
}

/**
 * Creates the exact 3D Digital Twin of the physical ProWatch prototype:
 * - Blue SPI Display module with top solder pin headers and bottom Kapton flex cable.
 * - Dual bent brass tubular roll-bars (strap loops / guard cage).
 * - Middle sandwich layer: Seeed XIAO ESP32-S3 with USB-C port, black tape LiPo battery, slide switch.
 * - Rear sensor module: GY-MAX30102 + MPU6050 with pulsing red optical LED PointLight.
 */
export function createWatch3DModel(
  screenTexture: THREE.CanvasTexture,
  initialStrapColor: StrapColor = 'OBSIDIAN'
): Watch3DModel {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ProWatch_Physical_Digital_Twin';

  // --- 1. Materials ---
  const strapConfig = STRAP_COLORS[initialStrapColor];

  // Authentic Polished Brass for tubular roll-bars & standoffs
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.92,
    roughness: 0.22,
    envMapIntensity: 1.5,
  });

  // Dark Blue FR4 for display breakout PCB
  const displayPcbMaterial = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    metalness: 0.2,
    roughness: 0.35,
  });

  // Amber Kapton Tape for ribbon cable
  const kaptonMaterial = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.1,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9,
  });

  // Gold plated pads and pins
  const goldPadMaterial = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.95,
    roughness: 0.2,
  });

  // Silicone Strap Material
  const strapMaterial = new THREE.MeshStandardMaterial({
    color: strapConfig.hex,
    metalness: 0.05,
    roughness: 0.85,
  });

  // Screen Texture with Phosphor Green Emissive Glow
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
  });

  // Protective 2.5D Clear Glass
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.05,
    roughness: 0.04,
    transmission: 0.94,
    thickness: 0.2,
    transparent: true,
    opacity: 0.65,
    reflectivity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  // Red Pulsing Optical Sensor LED (MAX30102)
  const ledMaterial = new THREE.MeshBasicMaterial({
    color: 0xff1122,
  });

  // Chassis / Hardware Metal
  const caseMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.3,
  });

  // --- 2. Display Module Group (Front) ---
  const displayModuleGroup = new THREE.Group();
  displayModuleGroup.name = 'DisplayModule';

  const pcbW = 3.6;
  const pcbH = 4.7;
  const pcbDepth = 0.12;

  // Blue PCB baseplate
  const pcbGeo = new THREE.BoxGeometry(pcbW, pcbH, pcbDepth);
  const pcbMesh = new THREE.Mesh(pcbGeo, displayPcbMaterial);
  pcbMesh.castShadow = true;
  pcbMesh.receiveShadow = true;
  displayModuleGroup.add(pcbMesh);

  // Top Pin Header (8 gold pins labeled GND VCC SCL SDA RST DC CS BL)
  for (let i = 0; i < 8; i++) {
    const pinGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12);
    pinGeo.rotateX(Math.PI / 2);
    const pin = new THREE.Mesh(pinGeo, goldPadMaterial);
    pin.position.set(-1.05 + i * 0.3, pcbH / 2 - 0.22, pcbDepth / 2 + 0.06);
    displayModuleGroup.add(pin);
  }

  // 2 Brass Standoff Screws at Top Corners
  const standoffGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 16);
  standoffGeo.rotateX(Math.PI / 2);
  const topStandoffL = new THREE.Mesh(standoffGeo, brassMaterial);
  topStandoffL.position.set(-pcbW / 2 + 0.32, pcbH / 2 - 0.25, pcbDepth / 2 + 0.08);
  displayModuleGroup.add(topStandoffL);

  const topStandoffR = new THREE.Mesh(standoffGeo, brassMaterial);
  topStandoffR.position.set(pcbW / 2 - 0.32, pcbH / 2 - 0.25, pcbDepth / 2 + 0.08);
  displayModuleGroup.add(topStandoffR);

  // Bottom Kapton Flex Ribbon Cable & 5 Gold Ring Pads
  const kaptonGeo = new THREE.BoxGeometry(2.5, 0.55, 0.04);
  const kaptonMesh = new THREE.Mesh(kaptonGeo, kaptonMaterial);
  kaptonMesh.position.set(0, -pcbH / 2 + 0.24, pcbDepth / 2 + 0.03);
  displayModuleGroup.add(kaptonMesh);

  for (let i = 0; i < 5; i++) {
    const padGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
    padGeo.rotateX(Math.PI / 2);
    const pad = new THREE.Mesh(padGeo, goldPadMaterial);
    pad.position.set(-0.8 + i * 0.4, -pcbH / 2 + 0.24, pcbDepth / 2 + 0.06);
    displayModuleGroup.add(pad);
  }

  // Green Plastic Pull-Tab sticking out on the right edge
  const tabGeo = new THREE.BoxGeometry(0.4, 0.75, 0.02);
  const tabMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.85,
    roughness: 0.3,
  });
  const pullTabMesh = new THREE.Mesh(tabGeo, tabMat);
  pullTabMesh.position.set(pcbW / 2 + 0.18, 0.6, pcbDepth / 2 + 0.08);
  displayModuleGroup.add(pullTabMesh);

  // Active Screen Panel (Pip-Boy OLED Texture)
  const screenW = 3.1;
  const screenH = 3.8;
  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, -0.06, pcbDepth / 2 + 0.02);
  displayModuleGroup.add(screenMesh);

  // Protective 2.5D Clear Curved Glass
  const glassGeo = new THREE.BoxGeometry(screenW + 0.05, screenH + 0.05, 0.08);
  const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
  glassMesh.position.set(0, -0.06, pcbDepth / 2 + 0.08);
  displayModuleGroup.add(glassMesh);

  rootGroup.add(displayModuleGroup);

  // Alias for compatibility
  const caseMesh = pcbMesh;

  // --- 3. Dual Brass Tubular Roll-Bars / Guard Rails (Lugs) ---
  const brassFrameGroup = new THREE.Group();
  brassFrameGroup.name = 'BrassTubularRollBars';

  // Helper to create a curved U-shaped brass tube
  const createBrassUTube = (isTop: boolean) => {
    const dir = isTop ? 1 : -1;
    const yFront = dir * (pcbH / 2 - 0.25);
    const yBack = dir * (pcbH / 2 - 0.25);

    const points = [
      new THREE.Vector3(-pcbW / 2 + 0.32, yFront, pcbDepth / 2 + 0.12),
      new THREE.Vector3(-pcbW / 2 + 0.32, yFront, -1.35),
      new THREE.Vector3(0, yBack + dir * 0.1, -1.48),
      new THREE.Vector3(pcbW / 2 - 0.32, yFront, -1.35),
      new THREE.Vector3(pcbW / 2 - 0.32, yFront, pcbDepth / 2 + 0.12),
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.12, 16, false);
    const mesh = new THREE.Mesh(tubeGeo, brassMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const topBrassBar = createBrassUTube(true);
  const bottomBrassBar = createBrassUTube(false);
  brassFrameGroup.add(topBrassBar);
  brassFrameGroup.add(bottomBrassBar);

  rootGroup.add(brassFrameGroup);

  // --- 4. Middle Sandwich Layer (Internals: Seeed XIAO ESP32-S3 + LiPo Battery + Switch) ---
  const internalsGroup = new THREE.Group();
  internalsGroup.name = 'Internals_Xiao_ESP32S3_Stack';

  // Seeed Studio XIAO ESP32-S3 PCB (Matte Black)
  const xiaoW = 2.1;
  const xiaoH = 1.75;
  const xiaoDepth = 0.08;
  const xiaoPcbGeo = new THREE.BoxGeometry(xiaoW, xiaoH, xiaoDepth);
  const xiaoPcbMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.4,
    metalness: 0.3,
  });
  const xiaoMesh = new THREE.Mesh(xiaoPcbGeo, xiaoPcbMat);
  xiaoMesh.position.set(0, 0.35, -0.45);
  internalsGroup.add(xiaoMesh);

  // SoC RF Shield Can (Silver Metal)
  const rfCanGeo = new THREE.BoxGeometry(1.05, 1.05, 0.12);
  const rfCanMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.95,
    roughness: 0.2,
  });
  const rfCanMesh = new THREE.Mesh(rfCanGeo, rfCanMat);
  rfCanMesh.position.set(0.15, 0.35, -0.38);
  internalsGroup.add(rfCanMesh);

  // USB Type-C Port (mounted on the side edge as seen in photos)
  const usbGeo = new THREE.BoxGeometry(0.55, 0.4, 0.26);
  const usbMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.2,
  });
  const usbMesh = new THREE.Mesh(usbGeo, usbMat);
  usbMesh.position.set(-xiaoW / 2 - 0.22, 0.35, -0.45);
  internalsGroup.add(usbMesh);

  // Black USB slot cavity
  const slotGeo = new THREE.BoxGeometry(0.04, 0.28, 0.14);
  const slotMat = new THREE.MeshBasicMaterial({ color: 0x090a0f });
  const slotMesh = new THREE.Mesh(slotGeo, slotMat);
  slotMesh.position.set(-xiaoW / 2 - 0.5, 0.35, -0.45);
  internalsGroup.add(slotMesh);

  // LiPo Battery Pack wrapped in Black Electrical Tape
  const battGeo = new THREE.BoxGeometry(2.5, 2.7, 0.65);
  const battMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
    metalness: 0.15,
  });
  const batteryMesh = new THREE.Mesh(battGeo, battMat);
  batteryMesh.position.set(0, -0.2, -0.75);
  internalsGroup.add(batteryMesh);

  // Slide Power Switch on bottom edge
  const switchBaseGeo = new THREE.BoxGeometry(0.55, 0.28, 0.22);
  const switchMesh = new THREE.Mesh(switchBaseGeo, usbMat);
  switchMesh.position.set(0.7, -pcbH / 2 + 0.6, -0.9);
  internalsGroup.add(switchMesh);

  const knobGeo = new THREE.BoxGeometry(0.12, 0.16, 0.14);
  const knobMesh = new THREE.Mesh(knobGeo, slotMat);
  knobMesh.position.set(0.85, -pcbH / 2 + 0.6, -0.9);
  internalsGroup.add(knobMesh);

  // Curved Jumper Wires (Red, Yellow, Black)
  const createWire = (start: THREE.Vector3, end: THREE.Vector3, colorHex: number) => {
    const mid = new THREE.Vector3(
      (start.x + end.x) / 2 + 0.25,
      (start.y + end.y) / 2,
      (start.z + end.z) / 2 + 0.2
    );
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const wireGeo = new THREE.TubeGeometry(curve, 16, 0.035, 8, false);
    const wireMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
    return new THREE.Mesh(wireGeo, wireMat);
  };

  const wire1 = createWire(new THREE.Vector3(0.6, 0.8, -0.4), new THREE.Vector3(0.5, 0.2, -1.3), 0xef4444);
  const wire2 = createWire(new THREE.Vector3(0.4, 0.8, -0.4), new THREE.Vector3(0.3, 0.2, -1.3), 0xeab308);
  const wire3 = createWire(new THREE.Vector3(0.2, 0.8, -0.4), new THREE.Vector3(0.1, 0.2, -1.3), 0x18181b);
  internalsGroup.add(wire1);
  internalsGroup.add(wire2);
  internalsGroup.add(wire3);

  rootGroup.add(internalsGroup);

  // --- 5. Rear Sensor Board (GY-MAX30102 + MPU6050 with Red Optical LED) ---
  const sensorPodGroup = new THREE.Group();
  sensorPodGroup.name = 'SensorBoard_MAX30102';

  // Purple/Blue Sensor Breakout PCB
  const sensorPcbW = 2.3;
  const sensorPcbH = 1.8;
  const sensorPcbGeo = new THREE.BoxGeometry(sensorPcbW, sensorPcbH, 0.12);
  const sensorPcbMat = new THREE.MeshStandardMaterial({
    color: 0x4338ca, // Indigo/purple breakout board
    roughness: 0.35,
    metalness: 0.25,
  });
  const sensorPcbMesh = new THREE.Mesh(sensorPcbGeo, sensorPcbMat);
  sensorPcbMesh.position.set(0, 0.2, -1.45);
  sensorPodGroup.add(sensorPcbMesh);

  // MAX30102 Optical Sensor Window
  const maxGeo = new THREE.BoxGeometry(0.6, 0.45, 0.1);
  const maxMat = new THREE.MeshStandardMaterial({
    color: 0x090a0f,
    roughness: 0.2,
    metalness: 0.8,
  });
  const maxMesh = new THREE.Mesh(maxGeo, maxMat);
  maxMesh.position.set(0.35, 0.2, -1.52);
  sensorPodGroup.add(maxMesh);

  // Red Optical Emitter Window
  const ledLensGeo = new THREE.BoxGeometry(0.22, 0.16, 0.06);
  const ledLensMesh = new THREE.Mesh(ledLensGeo, ledMaterial);
  ledLensMesh.position.set(0.35, 0.2, -1.58);
  sensorPodGroup.add(ledLensMesh);

  // MPU6050 QFN Sensor IC
  const mpuGeo = new THREE.BoxGeometry(0.4, 0.4, 0.08);
  const mpuMesh = new THREE.Mesh(mpuGeo, maxMat);
  mpuMesh.position.set(-0.45, 0.2, -1.52);
  sensorPodGroup.add(mpuMesh);

  // Real Three.js Pulsing Red Optical Light (matches physical watch photo)
  const sensorLedLight = new THREE.PointLight(0xff1122, 2.0, 5.0);
  sensorLedLight.position.set(0.35, 0.2, -1.68);
  sensorPodGroup.add(sensorLedLight);

  rootGroup.add(sensorPodGroup);

  // --- 6. Silicone Straps (Pass through the brass tubular loops) ---
  const strapsGroup = new THREE.Group();
  strapsGroup.name = 'Straps';

  const strapWidth = 2.2;
  const strapThickness = 0.22;
  const strapLength = 4.6;

  const createCurvedStrap = (isTop: boolean) => {
    const curvePoints = [];
    const dir = isTop ? 1 : -1;
    const startY = dir * (pcbH / 2 - 0.2);

    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const py = startY + dir * t * strapLength;
      const pz = -1.4 - Math.pow(t, 1.5) * 1.6;
      curvePoints.push(new THREE.Vector3(0, py, pz));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const extrudeShape = new THREE.Shape();
    extrudeShape.moveTo(-strapWidth / 2, -strapThickness / 2);
    extrudeShape.lineTo(strapWidth / 2, -strapThickness / 2);
    extrudeShape.lineTo(strapWidth / 2, strapThickness / 2);
    extrudeShape.lineTo(-strapWidth / 2, strapThickness / 2);
    extrudeShape.closePath();

    const strapGeo = new THREE.ExtrudeGeometry(extrudeShape, {
      extrudePath: curve,
      steps: 24,
      bevelEnabled: false,
    });

    const mesh = new THREE.Mesh(strapGeo, strapMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const topStrap = createCurvedStrap(true);
  const bottomStrap = createCurvedStrap(false);
  strapsGroup.add(topStrap);
  strapsGroup.add(bottomStrap);

  // Brass Buckle on bottom strap
  const buckleGeo = new THREE.BoxGeometry(strapWidth + 0.15, 0.38, 0.32);
  const buckleMesh = new THREE.Mesh(buckleGeo, brassMaterial);
  buckleMesh.position.set(0, -pcbH / 2 - 2.8, -2.4);
  strapsGroup.add(buckleMesh);

  rootGroup.add(strapsGroup);

  // --- 7. Controller Functions & Animations ---
  const setStrapColor = (color: StrapColor) => {
    const cfg = STRAP_COLORS[color];
    strapMaterial.color.setHex(cfg.hex);
  };

  const setExplodedProgress = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress));

    // Display module and 2.5D glass slide forward
    glassMesh.position.z = pcbDepth / 2 + 0.08 + p * 1.8;
    screenMesh.position.z = pcbDepth / 2 + 0.02 + p * 1.2;
    pcbMesh.position.z = p * 0.7;

    // Brass tubular roll-bars remain as central chassis
    brassFrameGroup.position.z = 0;

    // Internals (Seeed Xiao, Battery, Wires) slide backward
    internalsGroup.position.z = -p * 1.3;

    // Rear Sensor Board slides further backward
    sensorPodGroup.position.z = -p * 2.5;

    // Straps follow chassis
    strapsGroup.position.z = -p * 0.4;
  };

  const setPulseGlow = (intensity: number) => {
    // Intense Red pulse matching physical MAX30102 sensor optical output
    sensorLedLight.intensity = 1.0 + intensity * 3.5;
    ledMaterial.color.setHex(0xff1122);
  };

  return {
    rootGroup,
    screenMesh,
    glassMesh,
    caseMesh,
    strapsGroup,
    sensorPodGroup,
    internalsGroup,
    sensorLedLight,
    materials: {
      caseMaterial,
      strapMaterial,
      glassMaterial,
      screenMaterial,
      ledMaterial,
      goldPadMaterial,
      brassMaterial,
    },
    setStrapColor,
    setExplodedProgress,
    setPulseGlow,
  };
}
