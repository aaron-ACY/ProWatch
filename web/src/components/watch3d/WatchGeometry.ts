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
  };
  setStrapColor: (color: StrapColor) => void;
  setExplodedProgress: (progress: number) => void;
  setPulseGlow: (intensity: number) => void;
}

export function createWatch3DModel(screenTexture: THREE.CanvasTexture, initialStrapColor: StrapColor = 'OBSIDIAN'): Watch3DModel {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ProWatch_Root';

  // --- 1. Materials ---
  const strapConfig = STRAP_COLORS[initialStrapColor];

  const caseMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f242d,
    metalness: 0.88,
    roughness: 0.22,
    envMapIntensity: 1.2,
  });

  const strapMaterial = new THREE.MeshStandardMaterial({
    color: strapConfig.hex,
    metalness: 0.05,
    roughness: 0.85,
  });

  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.92,
    thickness: 0.35,
    transparent: true,
    opacity: 0.75,
    reflectivity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const ledMaterial = new THREE.MeshBasicMaterial({
    color: 0x10b981,
  });

  const goldPadMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.15,
  });

  // --- 2. Watch Case (Chassis) ---
  // Dimensions roughly matching modern smart watch: width 3.6, height 4.4, depth 1.0 (Three.js units)
  const caseWidth = 3.6;
  const caseHeight = 4.4;
  const caseDepth = 0.9;
  const caseRadius = 0.65;

  // Build rounded rect shape for extrude
  const shape = new THREE.Shape();
  const x = -caseWidth / 2;
  const y = -caseHeight / 2;
  const w = caseWidth;
  const h = caseHeight;
  const r = caseRadius;

  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: caseDepth,
    bevelEnabled: true,
    bevelSegments: 6,
    steps: 1,
    bevelSize: 0.12,
    bevelThickness: 0.12,
  };

  const caseGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  caseGeometry.center(); // Center at origin (0,0,0)
  const caseMesh = new THREE.Mesh(caseGeometry, caseMaterial);
  caseMesh.castShadow = true;
  caseMesh.receiveShadow = true;

  // Metallic hardware material for buttons and buckle
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.25,
  });

  // Sleek side flush button (no rotating crown knob)
  const buttonGeo = new THREE.BoxGeometry(0.12, 0.75, 0.2);
  const buttonMesh = new THREE.Mesh(buttonGeo, metalMaterial);
  buttonMesh.position.set(caseWidth / 2 + 0.06, 0, 0);
  caseMesh.add(buttonMesh);

  // Mic hole
  const micGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8);
  micGeo.rotateZ(Math.PI / 2);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x090a0f });
  const micMesh = new THREE.Mesh(micGeo, holeMat);
  micMesh.position.set(-caseWidth / 2 - 0.08, 0.3, 0);
  caseMesh.add(micMesh);

  rootGroup.add(caseMesh);

  // --- 3. Screen Mesh & Protective 2.5D Curved Glass ---
  const screenW = caseWidth - 0.55;
  const screenH = caseHeight - 0.55;
  const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, 0, caseDepth / 2 + 0.13);
  rootGroup.add(screenMesh);

  const glassGeo = new THREE.BoxGeometry(screenW + 0.2, screenH + 0.2, 0.08);
  const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
  glassMesh.position.set(0, 0, caseDepth / 2 + 0.18);
  rootGroup.add(glassMesh);

  // --- 4. Straps (Top & Bottom Silicone Bands) ---
  const strapsGroup = new THREE.Group();
  strapsGroup.name = 'Straps';

  const strapWidth = 2.4;
  const strapThickness = 0.22;
  const strapLength = 4.8;

  // Function to create an ergonomically curved strap
  const createCurvedStrap = (isTop: boolean) => {
    const curvePoints = [];
    const dir = isTop ? 1 : -1;
    const startY = dir * (caseHeight / 2 + 0.1);

    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const py = startY + dir * t * strapLength;
      // Ergonomic curve wrapping backward around wrist (-Z)
      const pz = -Math.pow(t, 1.6) * 1.8;
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

  // Buckle on bottom strap
  const buckleGeo = new THREE.BoxGeometry(strapWidth + 0.15, 0.4, 0.35);
  const buckleMesh = new THREE.Mesh(buckleGeo, metalMaterial);
  buckleMesh.position.set(0, -caseHeight / 2 - 2.8, -1.2);
  strapsGroup.add(buckleMesh);

  rootGroup.add(strapsGroup);

  // --- 5. Sensor Pod (Back of Watch: MAX30102 Optical Sensor) ---
  const sensorPodGroup = new THREE.Group();
  sensorPodGroup.name = 'SensorPod';

  // Ceramic dome disc on the back (-Z)
  const sensorBaseGeo = new THREE.CylinderGeometry(1.2, 1.35, 0.22, 32);
  sensorBaseGeo.rotateX(Math.PI / 2);
  const sensorBaseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
    metalness: 0.5,
  });
  const sensorBaseMesh = new THREE.Mesh(sensorBaseGeo, sensorBaseMat);
  sensorBaseMesh.position.set(0, 0, -caseDepth / 2 - 0.12);
  sensorPodGroup.add(sensorBaseMesh);

  // Optical sensor glass window
  const sensorGlassGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.05, 32);
  sensorGlassGeo.rotateX(Math.PI / 2);
  const sensorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.1,
    metalness: 0.9,
  });
  const sensorGlassMesh = new THREE.Mesh(sensorGlassGeo, sensorGlassMat);
  sensorGlassMesh.position.set(0, 0, -caseDepth / 2 - 0.23);
  sensorPodGroup.add(sensorGlassMesh);

  // Dual Optical Sensor LEDs (MAX30102 Red & Green photodiode emitters)
  const ledGeo = new THREE.BoxGeometry(0.2, 0.12, 0.06);
  const ledMesh1 = new THREE.Mesh(ledGeo, ledMaterial);
  ledMesh1.position.set(-0.35, 0, -caseDepth / 2 - 0.25);
  sensorPodGroup.add(ledMesh1);

  const ledMesh2 = new THREE.Mesh(ledGeo, ledMaterial);
  ledMesh2.position.set(0.35, 0, -caseDepth / 2 - 0.25);
  sensorPodGroup.add(ledMesh2);

  // Dynamic Point Light that pulses with the heart rate
  const sensorLedLight = new THREE.PointLight(0x10b981, 1.5, 3.5);
  sensorLedLight.position.set(0, 0, -caseDepth / 2 - 0.35);
  sensorPodGroup.add(sensorLedLight);

  // Pogo Charging Pins (4 gold dots)
  for (let i = 0; i < 4; i++) {
    const pinGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12);
    pinGeo.rotateX(Math.PI / 2);
    const pin = new THREE.Mesh(pinGeo, goldPadMaterial);
    pin.position.set(-0.45 + i * 0.3, -0.85, -caseDepth / 2 - 0.15);
    sensorPodGroup.add(pin);
  }

  rootGroup.add(sensorPodGroup);

  // --- 6. Internal Hardware (Exploded View Only) ---
  const internalsGroup = new THREE.Group();
  internalsGroup.name = 'Internals_Xiao_ESP32S3';
  internalsGroup.visible = false;

  // PCB Board: Seeed XIAO ESP32-S3 (Green / Black matte finish)
  const pcbW = 2.4;
  const pcbH = 3.0;
  const pcbThickness = 0.08;
  const pcbGeo = new THREE.BoxGeometry(pcbW, pcbH, pcbThickness);
  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x064e3b, // Emerald circuit board
    roughness: 0.4,
    metalness: 0.3,
  });
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
  pcbMesh.position.set(0, 0, 0);
  internalsGroup.add(pcbMesh);

  // ESP32-S3 SoC Metallic Shield Can
  const socGeo = new THREE.BoxGeometry(1.2, 1.2, 0.12);
  const socMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.95,
    roughness: 0.2,
  });
  const socMesh = new THREE.Mesh(socGeo, socMat);
  socMesh.position.set(0, 0.4, 0.08);
  internalsGroup.add(socMesh);

  // Gold Edge Contact Pads on PCB
  for (let i = 0; i < 7; i++) {
    const padGeo = new THREE.BoxGeometry(0.18, 0.25, 0.03);
    const padL = new THREE.Mesh(padGeo, goldPadMaterial);
    padL.position.set(-pcbW / 2 + 0.15, -pcbH / 2 + 0.35 + i * 0.38, 0.05);
    internalsGroup.add(padL);

    const padR = new THREE.Mesh(padGeo, goldPadMaterial);
    padR.position.set(pcbW / 2 - 0.15, -pcbH / 2 + 0.35 + i * 0.38, 0.05);
    internalsGroup.add(padR);
  }

  // LiPo Pouch Battery (Silver foil cell under PCB)
  const batteryGeo = new THREE.BoxGeometry(2.2, 2.5, 0.25);
  const batteryMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.85,
    roughness: 0.3,
  });
  const batteryMesh = new THREE.Mesh(batteryGeo, batteryMat);
  batteryMesh.position.set(0, -0.1, -0.2);
  internalsGroup.add(batteryMesh);

  rootGroup.add(internalsGroup);

  // --- Controller Helpers ---
  const setStrapColor = (color: StrapColor) => {
    const cfg = STRAP_COLORS[color];
    strapMaterial.color.setHex(cfg.hex);
  };

  const baseScreenZ = caseDepth / 2 + 0.13;
  const baseGlassZ = caseDepth / 2 + 0.18;
  const baseSensorZ = 0;

  const setExplodedProgress = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress));
    internalsGroup.visible = p > 0.02;

    // Separate along Z-axis
    glassMesh.position.z = baseGlassZ + p * 2.2;
    screenMesh.position.z = baseScreenZ + p * 1.5;
    internalsGroup.position.z = p * 0.4;
    caseMesh.position.z = -p * 0.7;
    sensorPodGroup.position.z = baseSensorZ - p * 1.9;
    strapsGroup.position.z = -p * 0.7;
  };

  const setPulseGlow = (intensity: number) => {
    sensorLedLight.intensity = 1.0 + intensity * 2.5;
    ledMaterial.color.setHex(intensity > 0.5 ? 0xef4444 : 0x10b981);
    sensorLedLight.color.setHex(intensity > 0.5 ? 0xef4444 : 0x10b981);
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
    },
    setStrapColor,
    setExplodedProgress,
    setPulseGlow,
  };
}
