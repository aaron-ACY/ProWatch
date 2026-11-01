import * as THREE from 'three';
import { StrapColor, STRAP_COLORS } from './types';
import {
  createDisplayFrontTexture,
  createDisplayBackTexture,
  createXiaoEsp32Texture,
  createBatteryTexture,
  createSensorBoardTexture,
} from './ComponentTextures';

export interface Watch3DModel {
  rootGroup: THREE.Group;
  screenMesh: THREE.Mesh;
  glassMesh: THREE.Mesh;
  caseMesh: THREE.Mesh;
  strapsGroup: THREE.Group;
  sensorPodGroup: THREE.Group;
  internalsGroup: THREE.Group;
  displayModuleGroup: THREE.Group;
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
 * Creates the photorealistic 3D Digital Twin of the physical ProWatch hardware:
 * - Real 1.3" SPI TFT display module: Blue FR4 with solder pins on front, brushed stainless steel plate on back.
 * - Genuine Seeed Studio XIAO ESP32-S3 board with RF shield, gold castellated pads, and USB-C port.
 * - Authentic LiPo battery wrapped in black vinyl electrical tape with spec label.
 * - GY-MAX30102 + MPU6050 sensor board with pulsing red optical PointLight.
 * - Dual bent brass tubular roll-bars (strap loops / guard cage).
 */
export function createWatch3DModel(
  screenTexture: THREE.CanvasTexture,
  initialStrapColor: StrapColor = 'OBSIDIAN'
): Watch3DModel {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ProWatch_Physical_Digital_Twin';

  // --- 1. Procedural High-Fidelity Component Textures ---
  const displayFrontTex = createDisplayFrontTexture();
  const displayBackTex = createDisplayBackTexture();
  const xiaoTex = createXiaoEsp32Texture();
  const batteryTex = createBatteryTexture();
  const sensorTex = createSensorBoardTexture();

  // --- 2. Materials ---
  const strapConfig = STRAP_COLORS[initialStrapColor];

  // Authentic Polished Brass for tubular roll-bars & standoffs
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 1.8,
  });

  // Display Module Multi-Material (Front blue PCB with pins, Back stainless steel plate)
  const displayEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x173f8a,
    roughness: 0.4,
    metalness: 0.2,
  });
  const displayFrontMat = new THREE.MeshStandardMaterial({
    map: displayFrontTex,
    roughness: 0.35,
    metalness: 0.15,
  });
  const displayBackMat = new THREE.MeshStandardMaterial({
    map: displayBackTex,
    roughness: 0.25,
    metalness: 0.9,
    envMapIntensity: 1.5,
  });
  const displayBoxMaterials = [
    displayEdgeMat,  // +X
    displayEdgeMat,  // -X
    displayEdgeMat,  // +Y
    displayEdgeMat,  // -Y
    displayFrontMat, // +Z (Front with pins & bezel)
    displayBackMat,  // -Z (Back stamped steel plate)
  ];

  // Seeed XIAO ESP32-S3 Multi-Material
  const xiaoEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.5,
    metalness: 0.2,
  });
  const xiaoFrontMat = new THREE.MeshStandardMaterial({
    map: xiaoTex,
    roughness: 0.35,
    metalness: 0.3,
    envMapIntensity: 1.4,
  });
  const xiaoBoxMaterials = [
    xiaoEdgeMat,
    xiaoEdgeMat,
    xiaoEdgeMat,
    xiaoEdgeMat,
    xiaoFrontMat, // +Z
    xiaoEdgeMat,  // -Z
  ];

  // Battery Vinyl Tape Material with Specs Label
  const batteryMaterial = new THREE.MeshStandardMaterial({
    map: batteryTex,
    roughness: 0.4,
    metalness: 0.15,
  });

  // Sensor Board Multi-Material
  const sensorEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x3b0764,
    roughness: 0.45,
    metalness: 0.2,
  });
  const sensorFrontMat = new THREE.MeshStandardMaterial({
    map: sensorTex,
    roughness: 0.35,
    metalness: 0.25,
    envMapIntensity: 1.2,
  });
  const sensorBoxMaterials = [
    sensorEdgeMat,
    sensorEdgeMat,
    sensorEdgeMat,
    sensorEdgeMat,
    sensorFrontMat, // +Z
    sensorFrontMat, // -Z
  ];

  // Gold plated pads and pins
  const goldPadMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.95,
    roughness: 0.15,
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

  // Crystal Clear Display Protective Glass
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.02,
    roughness: 0.03,
    transmission: 0.98,
    thickness: 0.15,
    transparent: true,
    opacity: 0.18,
    reflectivity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  });

  // Red Pulsing Optical Sensor LED (MAX30102)
  const ledMaterial = new THREE.MeshBasicMaterial({
    color: 0xff1122,
  });

  // Hardware Metal
  const caseMaterial = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.3,
  });

  // --- 3. Display Module Group (Front Component) ---
  const displayModuleGroup = new THREE.Group();
  displayModuleGroup.name = 'DisplayModule';

  const pcbW = 3.6;
  const pcbH = 4.7;
  const pcbDepth = 0.12;

  // Real Display Breakout Board with Front PCB & Rear Stainless Steel Backplate
  const pcbGeo = new THREE.BoxGeometry(pcbW, pcbH, pcbDepth);
  const pcbMesh = new THREE.Mesh(pcbGeo, displayBoxMaterials);
  pcbMesh.castShadow = true;
  pcbMesh.receiveShadow = true;
  displayModuleGroup.add(pcbMesh);

  // 2 Brass Standoff Screws at Top Corners
  const standoffGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 16);
  standoffGeo.rotateX(Math.PI / 2);
  const topStandoffL = new THREE.Mesh(standoffGeo, brassMaterial);
  topStandoffL.position.set(-pcbW / 2 + 0.32, pcbH / 2 - 0.25, pcbDepth / 2 + 0.08);
  displayModuleGroup.add(topStandoffL);

  const topStandoffR = new THREE.Mesh(standoffGeo, brassMaterial);
  topStandoffR.position.set(pcbW / 2 - 0.32, pcbH / 2 - 0.25, pcbDepth / 2 + 0.08);
  displayModuleGroup.add(topStandoffR);

  // Green Plastic Pull-Tab on the right edge
  const tabGeo = new THREE.BoxGeometry(0.35, 0.75, 0.02);
  const tabMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.85,
    roughness: 0.3,
  });
  const pullTabMesh = new THREE.Mesh(tabGeo, tabMat);
  pullTabMesh.position.set(pcbW / 2 + 0.16, 0.6, pcbDepth / 2 + 0.04);
  displayModuleGroup.add(pullTabMesh);

  // Active Screen Panel (Pip-Boy OLED Texture) - Flush on front face
  const screenW = 3.1;
  const screenH = 3.8;
  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, -0.06, pcbDepth / 2 + 0.005);
  displayModuleGroup.add(screenMesh);

  // Ultra-Thin Clear Protective Glass - Laminated directly onto the screen
  const glassGeo = new THREE.PlaneGeometry(screenW, screenH);
  const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
  glassMesh.position.set(0, -0.06, pcbDepth / 2 + 0.015);
  displayModuleGroup.add(glassMesh);

  rootGroup.add(displayModuleGroup);

  const caseMesh = pcbMesh;

  // --- 4. Dual Brass Tubular Roll-Bars / Guard Rails (Lugs) ---
  const brassFrameGroup = new THREE.Group();
  brassFrameGroup.name = 'BrassTubularRollBars';

  const createBrassUTube = (isTop: boolean) => {
    const dir = isTop ? 1 : -1;
    const yFront = dir * (pcbH / 2 - 0.25);
    const yBack = dir * (pcbH / 2 - 0.25);

    const points = [
      new THREE.Vector3(-pcbW / 2 + 0.32, yFront, pcbDepth / 2 + 0.12),
      new THREE.Vector3(-pcbW / 2 + 0.32, yFront, -1.35),
      new THREE.Vector3(0, yBack + dir * 0.08, -1.48),
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

  // --- 5. Middle Sandwich Layer (Internals: Seeed XIAO ESP32-S3 + LiPo Battery + Switch) ---
  const internalsGroup = new THREE.Group();
  internalsGroup.name = 'Internals_Xiao_ESP32S3_Stack';

  // Seeed Studio XIAO ESP32-S3 PCB (with realistic silk-screen, gold castellated pads, RF shield)
  const xiaoW = 2.2;
  const xiaoH = 1.8;
  const xiaoDepth = 0.1;
  const xiaoPcbGeo = new THREE.BoxGeometry(xiaoW, xiaoH, xiaoDepth);
  const xiaoMesh = new THREE.Mesh(xiaoPcbGeo, xiaoBoxMaterials);
  xiaoMesh.position.set(0, 0.35, -0.45);
  internalsGroup.add(xiaoMesh);

  // Stainless Steel USB Type-C Receptacle (on left side edge)
  const usbGeo = new THREE.BoxGeometry(0.55, 0.4, 0.26);
  const usbMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 1.8,
  });
  const usbMesh = new THREE.Mesh(usbGeo, usbMat);
  usbMesh.position.set(-xiaoW / 2 - 0.22, 0.35, -0.45);
  internalsGroup.add(usbMesh);

  // Black USB slot opening
  const slotGeo = new THREE.BoxGeometry(0.04, 0.28, 0.14);
  const slotMat = new THREE.MeshBasicMaterial({ color: 0x090a0f });
  const slotMesh = new THREE.Mesh(slotGeo, slotMat);
  slotMesh.position.set(-xiaoW / 2 - 0.5, 0.35, -0.45);
  internalsGroup.add(slotMesh);

  // Genuine LiPo Battery Pack wrapped in Black Electrical Tape with Specs Label
  const battGeo = new THREE.BoxGeometry(2.5, 2.7, 0.65);
  const batteryMesh = new THREE.Mesh(battGeo, batteryMaterial);
  batteryMesh.position.set(0, -0.2, -0.78);
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

  // Flexible Silicone Jumper Wires (Red, Yellow, Black)
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

  // --- 6. Rear Sensor Board (GY-MAX30102 + MPU6050 with Red Optical LED) ---
  const sensorPodGroup = new THREE.Group();
  sensorPodGroup.name = 'SensorBoard_MAX30102';

  // Purple Breakout PCB with GY-MAX30102 silk-screen & IC packages
  const sensorPcbW = 2.3;
  const sensorPcbH = 1.8;
  const sensorPcbGeo = new THREE.BoxGeometry(sensorPcbW, sensorPcbH, 0.12);
  const sensorPcbMesh = new THREE.Mesh(sensorPcbGeo, sensorBoxMaterials);
  sensorPcbMesh.position.set(0, 0.2, -1.45);
  sensorPodGroup.add(sensorPcbMesh);

  // Red Optical Emitter Window (MAX30102 Sensor Aperture)
  const ledLensGeo = new THREE.BoxGeometry(0.24, 0.18, 0.08);
  const ledLensMesh = new THREE.Mesh(ledLensGeo, ledMaterial);
  ledLensMesh.position.set(0.35, 0.2, -1.54);
  sensorPodGroup.add(ledLensMesh);

  // Dynamic Real Pulsing Red PointLight
  const sensorLedLight = new THREE.PointLight(0xff1122, 2.2, 5.0);
  sensorLedLight.position.set(0.35, 0.2, -1.68);
  sensorPodGroup.add(sensorLedLight);

  rootGroup.add(sensorPodGroup);

  // --- 7. Silicone Straps (Pass through the brass tubular loops) ---
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

  // --- 8. Controller Functions & Exploded View Animation ---
  const setStrapColor = (color: StrapColor) => {
    const cfg = STRAP_COLORS[color];
    strapMaterial.color.setHex(cfg.hex);
  };

  const setExplodedProgress = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress));

    // The entire Display Module (Glass + Screen + Blue PCB + Backplate) moves forward cohesively as ONE real unit
    displayModuleGroup.position.z = p * 1.6;

    // Brass tubular roll-bars remain as central chassis reference
    brassFrameGroup.position.z = 0;

    // Seeed Studio XIAO ESP32-S3 board with USB-C moves backward
    internalsGroup.position.z = -p * 1.3;

    // Rear Sensor Board moves backward
    sensorPodGroup.position.z = -p * 2.6;

    // Straps follow chassis
    strapsGroup.position.z = -p * 0.4;
  };

  const setPulseGlow = (intensity: number) => {
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
    displayModuleGroup,
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
