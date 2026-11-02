import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { StrapColor, STRAP_COLORS } from './types';

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
  interactiveObjects: THREE.Object3D[];
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
  setPowerSwitch: (on: boolean) => void;
  triggerTouchPadPulse: (index: number) => void;
  highlightComponent: (componentId: string | null) => void;
  updateHighlightPulse?: (time: number) => void;
}

/**
 * Traverses a loaded real CAD component GLTF scene and enhances its materials
 * with authentic PBR parameters (gold plating, nickel shielding, FR4 soldermask, molded IC epoxy).
 */
function enhanceCADMaterials(scene: THREE.Object3D) {
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const name = (mesh.name || '').toLowerCase();
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const matName = (mat && mat.name ? mat.name.toLowerCase() : '');

      // 1. Solder pads / vias / gold headers
      if (
        name.includes('boss-extrude') ||
        name.includes('trou') ||
        name.includes('pin') ||
        name.includes('nauo3') ||
        name.includes('pad')
      ) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xf5c850,
          metalness: 0.95,
          roughness: 0.18,
          envMapIntensity: 1.8,
        });
      }
      // 2. Metal shields / USB Type-C receptacle / slide switch metal case / steel plate
      else if (
        name.includes('shield') ||
        name.includes('usb') ||
        name.includes('solid') ||
        name.includes('nauo2') ||
        name.includes('chamfer9')
      ) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xd6dbe1,
          metalness: 0.9,
          roughness: 0.22,
          envMapIntensity: 1.8,
        });
      }
      // 2b. Real 523450 1000mAh LiPo Battery Components
      else if (
        name.includes('battery body_part 1') ||
        name.includes('battery body_part 2') ||
        (name.includes('battery') && name.includes('body'))
      ) {
        if (name.includes('part 2') || name.includes('part_2')) {
          // Amber Kapton polyimide insulating tape over protection circuit
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xdf8418,
            roughness: 0.18,
            metalness: 0.08,
            transparent: true,
            opacity: 0.9,
            envMapIntensity: 1.2,
          });
        } else {
          // Authentic Metallic Silver Lithium Polymer Pouch Foil
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xdce0e6,
            metalness: 0.85,
            roughness: 0.28,
            envMapIntensity: 1.5,
          });
        }
      }
      else if (name.includes('bms')) {
        // BMS Protection Circuit Board & Micro-components
        if (name.includes('pcb_2') || name.includes('pcb_3')) {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0x18181b,
            metalness: 0.2,
            roughness: 0.5,
          });
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0x0d4722, // Green FR4 PCB
            metalness: 0.15,
            roughness: 0.35,
          });
        }
      }
      else if (name.includes('wire red_1')) {
        // Red lead wire
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          roughness: 0.5,
          metalness: 0.05,
        });
      }
      else if (name.includes('battry wire') || name.includes('battery wire')) {
        // Black lead wire
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.5,
          metalness: 0.05,
        });
      }
      else if (name.includes('jst')) {
        // White nylon JST connector
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0xf5f5f0,
          roughness: 0.45,
          metalness: 0.05,
        });
      }
      else if (name.includes('battery sticker') || (name.includes('sticker') && !name.includes('text'))) {
        // Sticker label: keep texture if present, else white vinyl
        if (mat && (mat as any).map) {
          (mat as THREE.MeshStandardMaterial).roughness = 0.35;
          (mat as THREE.MeshStandardMaterial).metalness = 0.05;
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xfafafa,
            roughness: 0.35,
            metalness: 0.05,
          });
        }
      }
      // 3. PCBs: Blue FR4 (Display, MPU6050)
      else if (
        name.includes('pcb') ||
        name.includes('154_tft_ips_-_module_-_board') ||
        (name.includes('corps') && matName.includes('mat_0'))
      ) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x0040bf,
          metalness: 0.12,
          roughness: 0.35,
          envMapIntensity: 1.2,
        });
      }
      // 4. MAX30102 board (dark green/teal PCB)
      else if (name.includes('01113')) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x1b4332,
          metalness: 0.12,
          roughness: 0.35,
          envMapIntensity: 1.2,
        });
      }
      // 5. Silk-screen text & labels
      else if (name.includes('text') || name.includes('symb')) {
        mesh.material = new THREE.MeshBasicMaterial({
          color: 0xffffff,
        });
      }
      // 6. Tactile buttons / switch slider / IC packages / passives
      else if (
        name.includes('body') ||
        name.includes('sot') ||
        name.includes('qfn') ||
        name.includes('nauo1') ||
        name.includes('resistor') ||
        name.includes('capacitor') ||
        name.includes('c_0603') ||
        name.includes('r_0603')
      ) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x1a1c22,
          metalness: 0.1,
          roughness: 0.5,
        });
      }
      // 7. LCD Glass panel mount
      else if (name.includes('flat_flush_mount')) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x07090e,
          metalness: 0.1,
          roughness: 0.2,
        });
      }
      // Fallback
      else if (mat && mat.isMeshStandardMaterial) {
        mat.roughness = Math.min(mat.roughness, 0.45);
        mat.metalness = Math.min(mat.metalness, 0.85);
        mat.envMapIntensity = 1.3;
      }
    }
  });
}

/**
 * Creates the exact photorealistic 3D Digital Twin of the physical ProWatch:
 * - Front: 1.54" TFT IPS Display module (ER-TFTM1.54-1 CAD) with Pip-Boy 3000 screen
 * - Top & Bottom: Dual U-shaped curved tubular brass roll-bars & 4 corner standoffs (matches original prototype)
 * - Rear is split into 2 distinct halves:
 *   - Upper Half (Y > 0) Electronics Sandwich:
 *     1. Seeed Studio XIAO ESP32-S3 (inner layer, USB-C on side)
 *     2. GY-521 MPU-6050 6-Axis IMU (middle layer, between Xiao and MAX30102)
 *     3. MAX30102 Pulse Oximeter Board (outermost layer, facing wrist with pulsing red PointLight)
 *   - Lower Half (Y < 0) Power Section:
 *     1. High-capacity LiPo battery wrapped in black vinyl electrical tape
 *     2. 3-pin mechanical slide power switch
 */
export function createWatch3DModel(
  screenTexture: THREE.CanvasTexture,
  initialStrapColor: StrapColor = 'OBSIDIAN'
): Watch3DModel {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ProWatch_Physical_Digital_Twin';

  // --- 1. Materials ---
  const strapConfig = STRAP_COLORS[initialStrapColor];

  // Authentic Polished Brass for tubular U-bars & standoffs
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 1.8,
  });

  // Matte Dark Metal
  const caseMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.45,
    metalness: 0.7,
  });

  // Glass Screen Protector (Anti-Reflective Optical Sapphire Glass)
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.98,
    opacity: 0.9,
    transparent: true,
    roughness: 0.12,
    ior: 1.5,
    reflectivity: 0.08,
    clearcoat: 0.4,
    clearcoatRoughness: 0.1,
  });

  // Live Pip-Boy 3000 Canvas Screen Material
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
  });

  // Dynamic Pulsing Optical Red LED Lens Material (Mặc định tắt khi nguồn chưa bật)
  const ledMaterial = new THREE.MeshBasicMaterial({
    color: 0x050505,
  });

  // Gold Plated Solder Contacts
  const goldPadMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5c850,
    metalness: 0.95,
    roughness: 0.18,
    envMapIntensity: 1.8,
  });

  // Flexible Premium Silicone Strap Material
  const strapMaterial = new THREE.MeshStandardMaterial({
    color: strapConfig.hex,
    roughness: 0.60,
    metalness: 0.08,
  });

  // Track Interactive Meshes for 3D Raycasting (Touch pads, Slide switch)
  const interactiveObjects: THREE.Object3D[] = [];
  const touchRingMaterials: THREE.MeshStandardMaterial[] = [];

  // Dummy caseMesh for interface compatibility
  const dummyCaseGeo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  const caseMesh = new THREE.Mesh(dummyCaseGeo, caseMaterial);
  caseMesh.visible = false;
  rootGroup.add(caseMesh);

  // --- 2. Functional Groups Setup ---
  // A. Front Display Module Assembly
  const displayModuleGroup = new THREE.Group();
  displayModuleGroup.name = 'DisplayModule_Assembly';
  displayModuleGroup.position.set(0, 0, 0.1);
  rootGroup.add(displayModuleGroup);

  // B. Dual Brass Tubular U-Bars (Central Chassis Reference)
  const brassFrameGroup = new THREE.Group();
  brassFrameGroup.name = 'BrassTubularU_Bars';
  rootGroup.add(brassFrameGroup);

  // C. Upper Half: Electronics Stack (Xiao -> MPU6050 -> MAX30102)
  const internalsGroup = new THREE.Group();
  internalsGroup.name = 'Internals_Upper_Electronics';
  rootGroup.add(internalsGroup);

  const xiaoGroup = new THREE.Group();
  xiaoGroup.name = 'Xiao_ESP32S3_Inner';
  xiaoGroup.position.set(0, 0.85, -0.45);
  internalsGroup.add(xiaoGroup);

  const mpuGroup = new THREE.Group();
  mpuGroup.name = 'MPU6050_IMU_Middle';
  mpuGroup.position.set(0, 0.85, -0.95);
  internalsGroup.add(mpuGroup);

  const maxGroup = new THREE.Group();
  maxGroup.name = 'MAX30102_Sensor_Outer';
  maxGroup.position.set(0, 0.85, -1.45);
  internalsGroup.add(maxGroup);

  // D. Lower Half: Power Stack (Battery + Slide Switch)
  const sensorPodGroup = new THREE.Group();
  sensorPodGroup.name = 'Power_Lower_Section';
  rootGroup.add(sensorPodGroup);

  const batteryGroup = new THREE.Group();
  batteryGroup.name = 'LiPo_Battery_Lower';
  batteryGroup.position.set(0, -0.85, -0.85);
  sensorPodGroup.add(batteryGroup);

  const switchGroup = new THREE.Group();
  switchGroup.name = 'SlideSwitch_3Pin_SideEdge';
  switchGroup.position.set(1.58, -0.85, -0.85);
  sensorPodGroup.add(switchGroup);

  // E. Straps
  const strapsGroup = new THREE.Group();
  strapsGroup.name = 'Straps';
  rootGroup.add(strapsGroup);

  // --- 3. Pip-Boy 3000 Active Screen & Glass Cover ---
  const screenGeo = new THREE.PlaneGeometry(2.82, 2.82);
  const screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, 0, 0.20);
  screenMesh.userData = { componentId: 'display' };
  interactiveObjects.push(screenMesh);
  displayModuleGroup.add(screenMesh);

  const glassGeo = new THREE.PlaneGeometry(2.84, 2.84);
  const glassMesh = new THREE.Mesh(glassGeo, glassMaterial);
  glassMesh.position.set(0, 0, 0.22);
  glassMesh.userData = { componentId: 'display' };
  interactiveObjects.push(glassMesh);
  displayModuleGroup.add(glassMesh);

  // --- 3b. 3 Drilled Capacitive Touch Pads in Bottom Blue PCB Margin ---
  const touchPadGroup = new THREE.Group();
  touchPadGroup.name = 'TouchPads_3Button_Control';
  displayModuleGroup.add(touchPadGroup);

  const touchPadXPositions = [-0.68, 0, 0.68];
  const touchPadY = -1.86;
  const touchZ = 0.13;

  const goldRingGeo = new THREE.RingGeometry(0.075, 0.165, 32);
  const darkHoleGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.16, 24);
  darkHoleGeo.rotateX(Math.PI / 2);
  const darkHoleMat = new THREE.MeshBasicMaterial({ color: 0x04060c });

  const silkRingGeo = new THREE.RingGeometry(0.19, 0.21, 32);
  const silkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  touchPadXPositions.forEach((x, index) => {
    // 1. Through-hole drilled through the board
    const holeMesh = new THREE.Mesh(darkHoleGeo, darkHoleMat);
    holeMesh.position.set(x, touchPadY, touchZ - 0.05);
    holeMesh.userData = { componentId: 'touch_pads' };
    touchPadGroup.add(holeMesh);

    // 2. Gold plated annular contact pad on front (individual material for touch pulse)
    const padMat = goldPadMaterial.clone();
    touchRingMaterials.push(padMat);
    const frontRingMesh = new THREE.Mesh(goldRingGeo, padMat);
    frontRingMesh.position.set(x, touchPadY, touchZ + 0.005);
    frontRingMesh.userData = { componentId: 'touch_pads' };
    touchPadGroup.add(frontRingMesh);

    // 3. Gold plated annular contact pad on rear of display board
    const rearRingMesh = new THREE.Mesh(goldRingGeo, goldPadMaterial);
    rearRingMesh.position.set(x, touchPadY, touchZ - 0.11);
    rearRingMesh.rotation.y = Math.PI;
    rearRingMesh.userData = { componentId: 'touch_pads' };
    touchPadGroup.add(rearRingMesh);

    // 4. White silkscreen circular touch guide ring
    const silkRingMesh = new THREE.Mesh(silkRingGeo, silkMat);
    silkRingMesh.position.set(x, touchPadY, touchZ + 0.007);
    silkRingMesh.userData = { componentId: 'touch_pads' };
    touchPadGroup.add(silkRingMesh);

    // 5. Interactive Hitbox for Raycasting (Pad 0: Left, Pad 1: OK, Pad 2: Right)
    const action = index === 0 ? 'left' : index === 1 ? 'ok' : 'right';
    const hitMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.24, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(x, touchPadY, touchZ + 0.015);
    hitMesh.userData = { interactiveType: 'touchPad', padIndex: index, action, componentId: 'touch_pads' };
    touchPadGroup.add(hitMesh);
    interactiveObjects.push(hitMesh);
  });

  // --- 4. The Original Dual U-Shaped Brass Tubes (Top & Bottom) ---
  const holeX = 1.35;
  const topHoleY = 1.88;
  const bottomHoleY = -1.88;
  const frontZ = 0.12;
  const backZ = -1.55;
  const lugBarY = 1.96;

  const createBrassUTube = (isTop: boolean) => {
    const dir = isTop ? 1 : -1;
    const y = dir * topHoleY;
    const rearY = dir * lugBarY;

    const points = [
      new THREE.Vector3(-holeX, y, frontZ),
      new THREE.Vector3(-holeX, y, backZ + 0.14),
      new THREE.Vector3(-holeX + 0.22, rearY, backZ),
      new THREE.Vector3(0, rearY, backZ),
      new THREE.Vector3(holeX - 0.22, rearY, backZ),
      new THREE.Vector3(holeX, y, backZ + 0.14),
      new THREE.Vector3(holeX, y, frontZ),
    ];

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.12, 16, false);
    const mesh = new THREE.Mesh(tubeGeo, brassMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { componentId: 'copper_frame' };
    return mesh;
  };

  const topBrassBar = createBrassUTube(true);
  const bottomBrassBar = createBrassUTube(false);
  brassFrameGroup.add(topBrassBar);
  brassFrameGroup.add(bottomBrassBar);

  // 4 Corner Brass Standoffs / Thumb Nuts at Display Mounting Holes
  const standoffGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 16);
  standoffGeo.rotateX(Math.PI / 2);
  const standoffPositions = [
    [-holeX, topHoleY, frontZ + 0.05],
    [holeX, topHoleY, frontZ + 0.05],
    [-holeX, bottomHoleY, frontZ + 0.05],
    [holeX, bottomHoleY, frontZ + 0.05],
  ];
  standoffPositions.forEach(([x, y, z]) => {
    const mesh = new THREE.Mesh(standoffGeo, brassMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.userData = { componentId: 'copper_frame' };
    brassFrameGroup.add(mesh);
  });

  // --- 5. Lower Half: LiPo Battery Pack (Real CAD 523450 1000mAh Loaded Below in Section 8) ---
  // Placeholder reference mesh kept minimal for bounding/lighting if needed
  const dummyBatteryGeo = new THREE.BoxGeometry(0.01, 0.01, 0.01);
  const dummyBatteryMesh = new THREE.Mesh(dummyBatteryGeo, new THREE.MeshBasicMaterial({ visible: false }));
  batteryGroup.add(dummyBatteryMesh);

  // --- 6. Upper Half: Optical PointLight & Red Sensor Aperture ---
  const ledLensGeo = new THREE.BoxGeometry(0.24, 0.18, 0.08);
  const ledLensMesh = new THREE.Mesh(ledLensGeo, ledMaterial);
  ledLensMesh.position.set(0, 0, -0.09);
  ledLensMesh.userData = { componentId: 'max30102' };
  maxGroup.add(ledLensMesh);

  const sensorLedLight = new THREE.PointLight(0xff1122, 0, 5.0);
  sensorLedLight.position.set(0, 0, -0.25);
  maxGroup.add(sensorLedLight);

  // --- 7. Complete Ergonomic Silicone Straps & Brass Buckle Hardware ---
  const strapWidth = 2.05;
  const strapThickness = 0.20;

  // Sculpted sports silicone profile with chamfered edges and center accent groove
  const createStrapShape = (w: number, t: number, r: number = 0.04) => {
    const shape = new THREE.Shape();
    const hw = w / 2;
    const ht = t / 2;
    // Outer rounded profile
    shape.moveTo(-hw + r, -ht);
    shape.lineTo(hw - r, -ht);
    shape.quadraticCurveTo(hw, -ht, hw, -ht + r);
    shape.lineTo(hw, ht - r);
    shape.quadraticCurveTo(hw, ht, hw - r, ht);
    // Center sport groove on exterior face
    shape.lineTo(0.42, ht);
    shape.lineTo(0.36, ht - 0.025);
    shape.lineTo(-0.36, ht - 0.025);
    shape.lineTo(-0.42, ht);
    shape.lineTo(-hw + r, ht);
    shape.quadraticCurveTo(-hw, ht, -hw, ht - r);
    shape.lineTo(-hw, -ht + r);
    shape.quadraticCurveTo(-hw, -ht, -hw + r, -ht);
    return shape;
  };

  // Dedicated assemblies for top and bottom straps attached at the rear horizontal bar of the brass U-tubes
  const topStrapAssembly = new THREE.Group();
  topStrapAssembly.name = 'TopStrapAssembly';
  strapsGroup.add(topStrapAssembly);

  const bottomStrapAssembly = new THREE.Group();
  bottomStrapAssembly.name = 'BottomStrapAssembly';
  strapsGroup.add(bottomStrapAssembly);

  // Molded Silicone Lug Sleeves wrapping directly around the rear horizontal bars of the brass U-tubes (Y = ±1.96, Z = -1.55)
  const lugSleeveGeo = new THREE.CylinderGeometry(0.20, 0.20, strapWidth - 0.02, 24);
  lugSleeveGeo.rotateZ(Math.PI / 2);

  const topLugSleeve = new THREE.Mesh(lugSleeveGeo, strapMaterial);
  topLugSleeve.position.set(0, lugBarY, backZ);
  topLugSleeve.castShadow = true;
  topLugSleeve.userData = { componentId: 'straps' };
  topStrapAssembly.add(topLugSleeve);

  const bottomLugSleeve = new THREE.Mesh(lugSleeveGeo, strapMaterial);
  bottomLugSleeve.position.set(0, -lugBarY, backZ);
  bottomLugSleeve.castShadow = true;
  bottomLugSleeve.userData = { componentId: 'straps' };
  bottomStrapAssembly.add(bottomLugSleeve);

  // Mathematical Circular-to-Straight Strap Kinematics:
  // At p = 0 (assembled): forms a true circle of radius R0 = 2.352 centered at (0, -2.85) passing through both brass lugs (0, ±1.96, -1.55).
  // At p = 1 (100% exploded): unrolls curvature completely (deltaPhi -> 0) so both straps straighten out flat along ±Y.
  const circleCenterZ = -2.85;
  const dZ0 = backZ - circleCenterZ; // +1.30
  const R0 = Math.hypot(lugBarY, dZ0); // ~2.35194
  const thetaLug = Math.atan2(lugBarY, dZ0); // ~0.98511 rad (56.44 deg)

  const topEndAngle0 = (216 * Math.PI) / 180;
  const botEndAngle0 = (172 * Math.PI) / 180;
  const deltaPhiTop0 = topEndAngle0 - thetaLug;
  const deltaPhiBot0 = botEndAngle0 - thetaLug;

  const LTop = R0 * deltaPhiTop0; // ~6.55 (Physical constant length)
  const LBot = (R0 - strapThickness * 0.5) * deltaPhiBot0; // ~4.54 (Physical constant length)

  // As p -> 1, initial launch angle opens gracefully backward to 84 deg
  const thetaStraight = (84 * Math.PI) / 180;

  const evalStrapCurve = (isTop: boolean, u: number, p: number) => {
    const dir = isTop ? 1 : -1;
    const startY = dir * lugBarY;
    const startZ = backZ;

    const L = isTop ? LTop : LBot;
    const deltaPhi0 = isTop ? deltaPhiTop0 : deltaPhiBot0;

    // Smoothly unroll bend angle from deltaPhi0 to 0
    const deltaPhi = (1 - p) * deltaPhi0;

    // Initial launch angle: at p=0 it is thetaLug (56.44 deg); at p=1 it opens backward to 68 deg
    const alpha = (1 - p) * thetaLug + p * thetaStraight;

    // Radius at p=0:
    // Top strap is R0 (pure circle).
    // Bottom strap is R0 - strapThickness * u (smoothly nested).
    const r0 = isTop ? R0 : (R0 - strapThickness * u);

    // Tangent angle at normalized position u:
    const phi = alpha + u * deltaPhi;

    let y: number;
    let z: number;

    if (deltaPhi > 1e-4) {
      // Radius of curvature during unrolling: smoothly expands from r0 to infinity
      const rEff = L / deltaPhi;
      // Exact closed-form integral anchored at (startY, startZ) at u = 0:
      y = startY + dir * rEff * (Math.sin(phi) - Math.sin(alpha));
      z = startZ - rEff * (Math.cos(alpha) - Math.cos(phi));
    } else {
      // Pure straight line limit at p = 1:
      const s = u * L;
      y = startY + dir * s * Math.cos(alpha);
      z = startZ - s * Math.sin(alpha);
    }

    // Unit tangent vector in Y-Z plane
    const ty = dir * Math.cos(phi);
    const tz = -Math.sin(phi);

    // Outward unit normal vector in Y-Z plane (perpendicular to tangent, pointing away from wrist)
    const ny = dir * Math.sin(phi);
    const nz = Math.cos(phi);

    return {
      y,
      z,
      ty,
      tz,
      ny,
      nz,
    };
  };

  // Build straight unit-depth ExtrudeGeometries and store original template vertices for fast in-place morphing
  const strapShape = createStrapShape(strapWidth, strapThickness);
  const createDeformableStrapGeo = (steps: number) => {
    const geo = new THREE.ExtrudeGeometry(strapShape, {
      steps,
      depth: 1,
      bevelEnabled: false,
    });
    const origPos = new Float32Array(geo.attributes.position.array);
    const origNorm = new Float32Array(geo.attributes.normal.array);
    return { geo, origPos, origNorm };
  };

  const bottomStrapData = createDeformableStrapGeo(64);
  const bottomStrap = new THREE.Mesh(bottomStrapData.geo, strapMaterial);
  bottomStrap.castShadow = true;
  bottomStrap.receiveShadow = true;
  bottomStrap.userData = { componentId: 'straps' };
  bottomStrapAssembly.add(bottomStrap);

  const topStrapData = createDeformableStrapGeo(76);
  const topStrap = new THREE.Mesh(topStrapData.geo, strapMaterial);
  topStrap.castShadow = true;
  topStrap.receiveShadow = true;
  topStrap.userData = { componentId: 'straps' };
  topStrapAssembly.add(topStrap);

  // Smooth rounded bullet-nose tip for the top strap tail end
  const tipGeo = new THREE.CylinderGeometry(strapThickness / 2, strapThickness / 2, strapWidth - 0.08, 16);
  tipGeo.rotateZ(Math.PI / 2);
  const tipMesh = new THREE.Mesh(tipGeo, strapMaterial);
  tipMesh.castShadow = true;
  tipMesh.userData = { componentId: 'straps' };
  topStrapAssembly.add(tipMesh);

  // 8 Adjustment Pin Holes along the long strap spine
  const holeGeo = new THREE.CylinderGeometry(0.045, 0.045, strapThickness + 0.04, 14);
  holeGeo.rotateX(Math.PI / 2);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const rimGeo = new THREE.TorusGeometry(0.06, 0.012, 6, 14);

  const pinHoles: { u: number; holeMesh: THREE.Mesh; rimMesh: THREE.Mesh }[] = [];
  for (let i = 0; i < 8; i++) {
    const u = 0.50 + i * 0.055;
    const holeMesh = new THREE.Mesh(holeGeo, holeMat);
    holeMesh.userData = { componentId: 'straps' };
    topStrapAssembly.add(holeMesh);

    const rimMesh = new THREE.Mesh(rimGeo, strapMaterial);
    rimMesh.userData = { componentId: 'straps' };
    topStrapAssembly.add(rimMesh);

    pinHoles.push({ u, holeMesh, rimMesh });
  }

  // C. Polished Brass Hollow Buckle Frame Assembly (Mounted at u = 1.0 of Bottom Short Strap)
  const buckleGroup = new THREE.Group();
  buckleGroup.name = 'BuckleGroup';
  buckleGroup.userData = { componentId: 'copper_frame' };
  bottomStrapAssembly.add(buckleGroup);

  // 1. Crossbar Hinge
  const crossbarGeo = new THREE.CylinderGeometry(0.045, 0.045, strapWidth + 0.16, 16);
  crossbarGeo.rotateZ(Math.PI / 2);
  const crossbar = new THREE.Mesh(crossbarGeo, brassMaterial);
  crossbar.castShadow = true;
  crossbar.userData = { componentId: 'copper_frame' };
  buckleGroup.add(crossbar);

  // 2. Left and Right Frame Arms (along tangent Y)
  const sideArmGeo = new THREE.BoxGeometry(0.08, 0.38, 0.16);
  const leftArm = new THREE.Mesh(sideArmGeo, brassMaterial);
  leftArm.position.set(-(strapWidth / 2 + 0.04), 0.18, 0.08);
  leftArm.castShadow = true;
  leftArm.userData = { componentId: 'copper_frame' };
  buckleGroup.add(leftArm);

  const rightArm = new THREE.Mesh(sideArmGeo, brassMaterial);
  rightArm.position.set(strapWidth / 2 + 0.04, 0.18, 0.08);
  rightArm.castShadow = true;
  rightArm.userData = { componentId: 'copper_frame' };
  buckleGroup.add(rightArm);

  // 3. Front Bridge spanning outer strap
  const bridgeGeo = new THREE.BoxGeometry(strapWidth + 0.16, 0.08, 0.16);
  const bridge = new THREE.Mesh(bridgeGeo, brassMaterial);
  bridge.position.set(0, 0.34, 0.08);
  bridge.castShadow = true;
  bridge.userData = { componentId: 'copper_frame' };
  buckleGroup.add(bridge);

  // 4. Buckle Tongue / Center Prong (lying flat along tangent Y over strap)
  const prongGeo = new THREE.CylinderGeometry(0.026, 0.020, 0.34, 12);
  const prong = new THREE.Mesh(prongGeo, brassMaterial);
  prong.position.set(0, 0.17, 0.10);
  prong.castShadow = true;
  prong.userData = { componentId: 'copper_frame' };
  buckleGroup.add(prong);

  // D. 2 Hollow Silicone Keeper Loops (Con đỉa rỗng ôm sát 2 lớp dây)
  const createKeeperGeo = () => {
    const shape = new THREE.Shape();
    const w = strapWidth + 0.18;
    const h = strapThickness * 2 + 0.08;
    const r = 0.04;

    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

    const hole = new THREE.Path();
    const iw = strapWidth + 0.03;
    const ih = strapThickness * 2 + 0.02;
    hole.moveTo(-iw / 2, -ih / 2);
    hole.lineTo(iw / 2, -ih / 2);
    hole.lineTo(iw / 2, ih / 2);
    hole.lineTo(-iw / 2, ih / 2);
    hole.closePath();
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: false,
    });
    // Center extrusion along Z
    geo.translate(0, 0, -0.08);
    return geo;
  };

  const keeper1 = new THREE.Mesh(createKeeperGeo(), strapMaterial);
  keeper1.castShadow = true;
  keeper1.receiveShadow = true;
  keeper1.userData = { componentId: 'straps' };
  bottomStrapAssembly.add(keeper1);

  const keeper2 = new THREE.Mesh(createKeeperGeo(), strapMaterial);
  keeper2.castShadow = true;
  keeper2.receiveShadow = true;
  keeper2.userData = { componentId: 'straps' };
  bottomStrapAssembly.add(keeper2);

  const basisX = new THREE.Vector3(1, 0, 0);
  const rotMatrix = new THREE.Matrix4();
  const tanVec = new THREE.Vector3();
  const normVec = new THREE.Vector3();

  const updateStrapDeformation = (p: number) => {
    const deformMesh = (
      data: { geo: THREE.ExtrudeGeometry; origPos: Float32Array; origNorm: Float32Array },
      isTop: boolean
    ) => {
      const posAttr = data.geo.attributes.position as THREE.BufferAttribute;
      const normAttr = data.geo.attributes.normal as THREE.BufferAttribute;
      const { origPos, origNorm } = data;
      const count = posAttr.count;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const x0 = origPos[idx];
        const y0 = origPos[idx + 1];
        const u = origPos[idx + 2];

        const pt = evalStrapCurve(isTop, u, p);
        posAttr.setXYZ(i, x0, pt.y + y0 * pt.ny, pt.z + y0 * pt.nz);

        const nx0 = origNorm[idx];
        const ny0 = origNorm[idx + 1];
        const nz0 = origNorm[idx + 2];
        normAttr.setXYZ(
          i,
          nx0,
          ny0 * pt.ny + nz0 * pt.ty,
          ny0 * pt.nz + nz0 * pt.tz
        );
      }
      posAttr.needsUpdate = true;
      normAttr.needsUpdate = true;
      data.geo.computeBoundingSphere();
    };

    deformMesh(topStrapData, true);
    deformMesh(bottomStrapData, false);

    // Update rounded tail tip on top strap
    const endTop = evalStrapCurve(true, 1.0, p);
    tipMesh.position.set(0, endTop.y, endTop.z);

    // Update 8 adjustment pin holes & rims along top strap
    for (let i = 0; i < pinHoles.length; i++) {
      const { u, holeMesh, rimMesh } = pinHoles[i];
      const pt = evalStrapCurve(true, u, p);
      tanVec.set(0, pt.ty, pt.tz);
      normVec.set(0, pt.ny, pt.nz);
      rotMatrix.makeBasis(basisX, tanVec, normVec);

      holeMesh.position.set(0, pt.y, pt.z);
      holeMesh.quaternion.setFromRotationMatrix(rotMatrix);

      rimMesh.position.set(
        0,
        pt.y + pt.ny * (strapThickness * 0.5),
        pt.z + pt.nz * (strapThickness * 0.5)
      );
      rimMesh.quaternion.setFromRotationMatrix(rotMatrix);
    }

    // Update Brass Buckle Assembly at end of bottom strap (u = 1.0)
    const endBot = evalStrapCurve(false, 1.0, p);
    tanVec.set(0, endBot.ty, endBot.tz);
    normVec.set(0, endBot.ny, endBot.nz);
    rotMatrix.makeBasis(basisX, tanVec, normVec);

    buckleGroup.position.set(0, endBot.y, endBot.z);
    buckleGroup.quaternion.setFromRotationMatrix(rotMatrix);

    // Update 2 Silicone Keeper Loops on bottom strap (u = 0.88 and u = 0.76)
    const k1Pt = evalStrapCurve(false, 0.88, p);
    tanVec.set(0, k1Pt.ty, k1Pt.tz);
    normVec.set(0, k1Pt.ny, k1Pt.nz);
    rotMatrix.makeBasis(basisX, tanVec, normVec);
    keeper1.position.set(
      0,
      k1Pt.y + k1Pt.ny * (strapThickness * 0.5),
      k1Pt.z + k1Pt.nz * (strapThickness * 0.5)
    );
    keeper1.quaternion.setFromRotationMatrix(rotMatrix);

    const k2Pt = evalStrapCurve(false, 0.76, p);
    tanVec.set(0, k2Pt.ty, k2Pt.tz);
    normVec.set(0, k2Pt.ny, k2Pt.nz);
    rotMatrix.makeBasis(basisX, tanVec, normVec);
    keeper2.position.set(
      0,
      k2Pt.y + k2Pt.ny * (strapThickness * 0.5),
      k2Pt.z + k2Pt.nz * (strapThickness * 0.5)
    );
    keeper2.quaternion.setFromRotationMatrix(rotMatrix);
  };

  // Initialize strap geometry at p = 0 (assembled circular loop)
  updateStrapDeformation(0);

  // --- 8. Asynchronously Load Real CAD Component GLBs ---
  const gltfLoader = new GLTFLoader();

  // 1. Real 1.54" TFT Display CAD
  gltfLoader.load(
    '/electronic-modules/1-54-tft-ips-lcd-display/display-1-54.glb',
    (gltf) => {
      const model = gltf.scene;
      enhanceCADMaterials(model);
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.componentId = 'display';
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.scale.set(100, 100, 100);
      wrapper.position.set(0, 0, 0);

      displayModuleGroup.add(wrapper);
    },
    undefined,
    (err) => console.warn('Display GLB load error:', err)
  );

  // 2. Real Seeed Studio XIAO ESP32-S3 CAD (Upper Half, Layer 1: Innermost)
  gltfLoader.load(
    '/electronic-modules/xiao-esp32s3/xiao-esp32s3.glb',
    (gltf) => {
      const model = gltf.scene;
      enhanceCADMaterials(model);
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.componentId = 'xiao';
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.scale.set(100, 100, 100);
      // Orient: flat parallel to display, RF shield facing front, USB-C port facing left
      wrapper.rotation.set(-Math.PI / 2, 0, Math.PI);
      wrapper.position.set(0, 0, 0);

      xiaoGroup.add(wrapper);
    },
    undefined,
    (err) => console.warn('Xiao GLB load error:', err)
  );

  // 3. Real GY-521 MPU-6050 6-Axis IMU CAD (Upper Half, Layer 2: Middle between Xiao and MAX30102)
  gltfLoader.load(
    '/electronic-modules/mpu6050/mpu6050.glb',
    (gltf) => {
      const model = gltf.scene;
      enhanceCADMaterials(model);
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.componentId = 'mpu6050';
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.scale.set(100, 100, 100);
      wrapper.rotation.set(0, Math.PI, 0);
      wrapper.position.set(0, 0, 0);

      mpuGroup.add(wrapper);
    },
    undefined,
    (err) => console.warn('MPU6050 GLB load error:', err)
  );

  // 4. Real MAX30102 Optical Sensor Breakout CAD (Upper Half, Layer 3: Outermost, facing wrist)
  gltfLoader.load(
    '/electronic-modules/max30102/max30102.glb',
    (gltf) => {
      const model = gltf.scene;
      enhanceCADMaterials(model);
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.componentId = 'max30102';
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.scale.set(100, 100, 100);
      // Optical sensor window facing backward towards the wrist, oriented horizontally matching MPU6050
      wrapper.rotation.set(0, Math.PI, Math.PI / 2);
      wrapper.position.set(0, 0, 0);

      maxGroup.add(wrapper);
    },
    undefined,
    (err) => console.warn('MAX30102 GLB load error:', err)
  );

  // 5. Real 3-Pin Slide Switch CAD (Mounted on Right Edge with toggle knob exposed outward)
  let switchKnobMesh: THREE.Mesh | null = null;
  let powerSwitchState = false;

  // Invisible responsive Hitbox for Raycasting on Slide Switch
  const switchHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.95, 0.65),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  switchHitbox.name = 'Switch_Hitbox';
  switchHitbox.userData = { interactiveType: 'powerSwitch', componentId: 'power_switch' };
  switchGroup.add(switchHitbox);
  interactiveObjects.push(switchHitbox);

  gltfLoader.load(
    '/electronic-modules/switch-3-pin/slideswitch.glb',
    (gltf) => {
      const model = gltf.scene;
      enhanceCADMaterials(model);

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.componentId = 'power_switch';
        }
        if (child.name === 'NAUO1' && (child as THREE.Mesh).isMesh) {
          switchKnobMesh = child as THREE.Mesh;
          switchKnobMesh.position.x = powerSwitchState ? -0.0015 : 0.0015;
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(model);
      wrapper.scale.set(100, 100, 100);
      // Orient: toggle knob sticking OUTWARDS (+X) to right edge, pins pointing inwards (-X) towards battery
      wrapper.rotation.set(0, 0, -Math.PI / 2);
      wrapper.position.set(0, 0, 0);

      switchGroup.add(wrapper);
    },
    undefined,
    (err) => console.warn('Switch GLB load error:', err)
  );

  // 6. Real LiPo Battery CAD 601520 4000mAh (Lower Half Power Stack)
  gltfLoader.load(
    '/electronic-modules/battery/battery.glb?v=custom2',
    (gltf) => {
      const model = gltf.scene;
      enhanceCADMaterials(model);
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData.componentId = 'battery';
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      const wrapper = new THREE.Group();
      wrapper.add(model);
      // Scale: X(width 34mm)->1.63, Y(thick 5mm)->0.35, Z(len 51.5mm)->2.47
      wrapper.scale.set(48, 70, 48);
      // Orient: flat pouch & sticker facing backward (-Z) towards wrist, text right-side up
      wrapper.rotation.set(0, -Math.PI / 2, Math.PI / 2);
      wrapper.position.set(0, 0, 0);

      batteryGroup.add(wrapper);
    },
    undefined,
    (err) => console.warn('Battery GLB load error:', err)
  );

  // --- 9. Exploded View & Control Functions ---
  const setStrapColor = (color: StrapColor) => {
    const cfg = STRAP_COLORS[color];
    strapMaterial.color.setHex(cfg.hex);
  };

  const setExplodedProgress = (progress: number) => {
    const p = Math.max(0, Math.min(1, progress));

    // 1. Display Module Assembly slides forward
    displayModuleGroup.position.z = 0.1 + p * 2.2;

    // 2. Brass tubular U-bars remain as central chassis reference
    brassFrameGroup.position.z = 0;

    // 3. Upper Half Electronics Stack separates along Z: Xiao -> MPU6050 -> MAX30102
    xiaoGroup.position.z = -0.45 - p * 0.9;
    mpuGroup.position.z = -0.95 - p * 2.0;
    maxGroup.position.z = -1.45 - p * 3.1;

    // 4. Lower Half Power Stack separates along Z: Battery -> Switch
    batteryGroup.position.z = -0.85 - p * 1.5;
    switchGroup.position.z = -0.85 - p * 2.3;

    // 5. Straps automatically unbuckle and unroll from circular loop to completely straight at 100%
    updateStrapDeformation(p);
  };

  const setPulseGlow = (intensity: number) => {
    if (!powerSwitchState) return;
    sensorLedLight.intensity = 1.0 + intensity * 3.5;
    ledMaterial.color.setHex(0xff1122);
  };

  const setPowerSwitch = (on: boolean) => {
    powerSwitchState = on;
    if (switchKnobMesh) {
      switchKnobMesh.position.x = on ? -0.0015 : 0.0015;
    }
    if (!on) {
      sensorLedLight.intensity = 0;
      ledMaterial.color.setHex(0x050505);
    } else {
      sensorLedLight.intensity = 1.0;
      ledMaterial.color.setHex(0xff1122);
    }
  };

  const triggerTouchPadPulse = (index: number) => {
    const mat = touchRingMaterials[index];
    if (mat) {
      mat.color.setHex(0x4ade80); // Phosphor green capacitive touch glow
      mat.emissive.setHex(0x22c55e);
      mat.emissiveIntensity = 0.9;
      setTimeout(() => {
        mat.color.setHex(0xf5c850); // Restore gold plating
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }, 220);
    }
  };

  // --- 10. Interactive Component Explorer Highlight System ---
  let activeHighlightedId: string | null = null;
  interface HighlightRecord {
    material: THREE.Material;
    origEmissiveHex: number;
    origIntensity: number;
  }
  const highlightRecords: HighlightRecord[] = [];

  const highlightComponent = (componentId: string | null) => {
    // 1. Restore previously highlighted meshes
    highlightRecords.forEach(({ material, origEmissiveHex, origIntensity }) => {
      if ((material as any).emissive) {
        (material as any).emissive.setHex(origEmissiveHex);
        (material as any).emissiveIntensity = origIntensity;
      }
    });
    highlightRecords.length = 0;
    activeHighlightedId = componentId;

    if (!componentId) return;

    // 2. Traverse and highlight matching meshes
    rootGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh && obj.userData?.componentId === componentId) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat && (mat as any).emissive) {
            highlightRecords.push({
              material: mat,
              origEmissiveHex: (mat as any).emissive.getHex(),
              origIntensity: (mat as any).emissiveIntensity ?? 0,
            });
            // Refined studio cyan highlight for high visibility on materials
            (mat as any).emissive.setHex(0x38bdf8);
            (mat as any).emissiveIntensity = componentId === 'straps' ? 0.22 : 0.45;
          }
        });
      }
    });
  };

  const updateHighlightPulse = (time: number) => {
    if (!activeHighlightedId || highlightRecords.length === 0) return;
    const basePulse = activeHighlightedId === 'straps' ? 0.20 : 0.38;
    const pulse = basePulse + 0.12 * Math.sin(time * 5.5);
    highlightRecords.forEach(({ material }) => {
      if ((material as any).emissive) {
        (material as any).emissiveIntensity = pulse;
      }
    });
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
    interactiveObjects,
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
    setPowerSwitch,
    triggerTouchPadPulse,
    highlightComponent,
    updateHighlightPulse,
  };
}
