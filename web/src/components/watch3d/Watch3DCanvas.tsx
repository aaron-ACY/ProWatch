'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SensorTelemetry } from '../../types/sensor';
import { AIPrediction } from '../../types/ai';
import { WatchScreenTexture, WatchMenu } from './WatchScreenTexture';
import { createWatch3DModel, Watch3DModel } from './WatchGeometry';
import { CameraPreset, StrapColor, WatchFaceTheme } from './types';
import { useLanguage } from '@/context/LanguageContext';

interface Watch3DCanvasProps {
  telemetry: SensorTelemetry;
  prediction?: AIPrediction;
  strapColor: StrapColor;
  watchFaceTheme: WatchFaceTheme;
  autoRotate: boolean;
  motionSync: boolean;
  explodedProgress: number;
  cameraPreset: CameraPreset;
  presetTrigger?: number;
  selectedComponentId?: string | null;
}

export const Watch3DCanvas: React.FC<Watch3DCanvasProps> = ({
  telemetry,
  prediction,
  strapColor,
  watchFaceTheme,
  autoRotate,
  motionSync,
  explodedProgress,
  cameraPreset,
  presetTrigger,
  selectedComponentId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Watch3DModel | null>(null);
  const screenTextureRef = useRef<WatchScreenTexture | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const floorGroupRef = useRef<THREE.Group | null>(null);
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(3.8, 2.8, 6.2));
  const { language } = useLanguage();
  const isUserInteractingRef = useRef<boolean>(false);

  // Interactive Physical States (Mặc định màn hình đồng hồ tắt)
  const [powerOn, setPowerOn] = useState<boolean>(false);
  const [currentMenu, setCurrentMenu] = useState<WatchMenu>('START');

  const powerOnRef = useRef(powerOn);
  powerOnRef.current = powerOn;
  const currentMenuRef = useRef(currentMenu);
  currentMenuRef.current = currentMenu;

  // Fresh refs to prevent stale closures
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;
  const motionSyncRef = useRef(motionSync);
  motionSyncRef.current = motionSync;
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const predictionRef = useRef(prediction);
  predictionRef.current = prediction;
  const selectedComponentIdRef = useRef(selectedComponentId);
  selectedComponentIdRef.current = selectedComponentId;
  const explodedProgressRef = useRef(explodedProgress);
  explodedProgressRef.current = explodedProgress;

  // 1. Navigation Action Handlers (Chỉ 3 màn hình START -> HEART -> DATA đồng bộ Firmware)
  const handleNavLeft = useCallback(() => {
    const menus: WatchMenu[] = ['START', 'HEART', 'DATA'];
    const idx = menus.indexOf(currentMenuRef.current);
    const nextIdx = (idx - 1 + menus.length) % menus.length;
    const nextMenu = menus[nextIdx];
    currentMenuRef.current = nextMenu;
    setCurrentMenu(nextMenu);
    if (screenTextureRef.current) screenTextureRef.current.currentMenu = nextMenu;
    modelRef.current?.triggerTouchPadPulse(0);
  }, []);

  const handleNavRight = useCallback(() => {
    const menus: WatchMenu[] = ['START', 'HEART', 'DATA'];
    const idx = menus.indexOf(currentMenuRef.current);
    const nextIdx = (idx + 1) % menus.length;
    const nextMenu = menus[nextIdx];
    currentMenuRef.current = nextMenu;
    setCurrentMenu(nextMenu);
    if (screenTextureRef.current) screenTextureRef.current.currentMenu = nextMenu;
    modelRef.current?.triggerTouchPadPulse(2);
  }, []);

  const handleSelectOk = useCallback(() => {
    modelRef.current?.triggerTouchPadPulse(1);
    const active = currentMenuRef.current;
    if (active === 'START') {
      currentMenuRef.current = 'HEART';
      setCurrentMenu('HEART');
      if (screenTextureRef.current) screenTextureRef.current.currentMenu = 'HEART';
    } else if (active === 'HEART') {
      if (screenTextureRef.current) {
        screenTextureRef.current.isMeasuring = true;
        screenTextureRef.current.measuringProgress = 0;
      }
    } else if (active === 'DATA') {
      currentMenuRef.current = 'START';
      setCurrentMenu('START');
      if (screenTextureRef.current) screenTextureRef.current.currentMenu = 'START';
    }
  }, []);

  const handleTogglePower = useCallback(() => {
    setPowerOn((prev) => {
      const next = !prev;
      if (screenTextureRef.current) screenTextureRef.current.powerOn = next;
      if (modelRef.current) modelRef.current.setPowerSwitch(next);
      return next;
    });
  }, []);

  // Stable handler refs for Raycasting listeners
  const handleNavLeftRef = useRef(handleNavLeft);
  handleNavLeftRef.current = handleNavLeft;
  const handleNavRightRef = useRef(handleNavRight);
  handleNavRightRef.current = handleNavRight;
  const handleSelectOkRef = useRef(handleSelectOk);
  handleSelectOkRef.current = handleSelectOk;
  const handleTogglePowerRef = useRef(handleTogglePower);
  handleTogglePowerRef.current = handleTogglePower;

  // Sync Strap Color changes
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setStrapColor(strapColor);
    }
  }, [strapColor]);

  // Sync Exploded Progress changes
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.setExplodedProgress(explodedProgress);
    }
    if (floorGroupRef.current) {
      floorGroupRef.current.position.y = -explodedProgress * 1.6;
    }
  }, [explodedProgress]);

  // Sync Selected / Highlighted Component changes
  useEffect(() => {
    if (modelRef.current) {
      modelRef.current.highlightComponent(selectedComponentId || null);
    }
  }, [selectedComponentId]);

  // Handle Camera Presets
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;

    const presetPositions: Record<CameraPreset, THREE.Vector3> = {
      FRONT: new THREE.Vector3(0, 0, 9.6),
      PERSPECTIVE: new THREE.Vector3(6.2, 2.6, 8.6),
      BACK_SENSOR: new THREE.Vector3(4.5, 1.2, -9.2),
      SIDE: new THREE.Vector3(-11.2, 0.2, -1.6),
    };

    const presetTargets: Record<CameraPreset, THREE.Vector3> = {
      FRONT: new THREE.Vector3(0, 0, 0),
      PERSPECTIVE: new THREE.Vector3(0, 0, -0.8),
      BACK_SENSOR: new THREE.Vector3(0, 0, -1.5),
      SIDE: new THREE.Vector3(0, 0, -1.8),
    };

    targetCameraPos.current.copy(presetPositions[cameraPreset] || presetPositions.PERSPECTIVE);
    const targetLookAt = presetTargets[cameraPreset] || presetTargets.PERSPECTIVE;

    const c = controlsRef.current as any;
    if (c._sphericalDelta) c._sphericalDelta.set(0, 0, 0);

    cameraRef.current.position.copy(targetCameraPos.current);
    cameraRef.current.lookAt(targetLookAt);
    controlsRef.current.target.copy(targetLookAt);
    controlsRef.current.update();

    if (modelRef.current) {
      modelRef.current.rootGroup.rotation.set(0, 0, 0);
    }
  }, [cameraPreset, presetTrigger]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.copy(targetCameraPos.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Realistic Studio Room Environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    scene.environment = envTexture;

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, -0.8);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 18.0;
    controls.maxPolarAngle = Math.PI - 0.05;
    controls.addEventListener('start', () => {
      isUserInteractingRef.current = true;
    });
    controls.addEventListener('end', () => {
      setTimeout(() => {
        isUserInteractingRef.current = false;
      }, 800);
    });
    controlsRef.current = controls;

    // Apply initial camera preset
    const initialPresetPositions: Record<CameraPreset, THREE.Vector3> = {
      FRONT: new THREE.Vector3(0, 0, 9.6),
      PERSPECTIVE: new THREE.Vector3(6.2, 2.6, 8.6),
      BACK_SENSOR: new THREE.Vector3(4.5, 1.2, -9.2),
      SIDE: new THREE.Vector3(-11.2, 0.2, -1.6),
    };
    camera.position.copy(initialPresetPositions[cameraPreset] || initialPresetPositions.PERSPECTIVE);
    controls.update();

    // 3. Lighting Setup (Clean Studio Light Environment)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe2e8f0, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(5, 8, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf8fafc, 0.85);
    fillLight.position.set(-6, -3, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.65);
    rimLight.position.set(0, 4, -6);
    scene.add(rimLight);

    // Group floor elements so they smoothly adjust height during strap straightening
    const floorGroup = new THREE.Group();
    floorGroupRef.current = floorGroup;
    scene.add(floorGroup);

    // Soft Radial Contact Shadow (Zero hard edges: smooth Gaussian falloff to 0 opacity)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 512;
    shadowCanvas.height = 512;
    const sCtx = shadowCanvas.getContext('2d')!;
    const shadowGrad = sCtx.createRadialGradient(256, 256, 0, 256, 256, 240);
    shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.38)');
    shadowGrad.addColorStop(0.25, 'rgba(30, 41, 59, 0.22)');
    shadowGrad.addColorStop(0.5, 'rgba(71, 85, 105, 0.08)');
    shadowGrad.addColorStop(0.8, 'rgba(148, 163, 184, 0.02)');
    shadowGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = shadowGrad;
    sCtx.fillRect(0, 0, 512, 512);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    shadowTexture.needsUpdate = true;

    const shadowGeo = new THREE.PlaneGeometry(14, 14);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(0, -3.22, -1.5);
    floorGroup.add(shadowMesh);

    // Studio Engineering Floor Grid & Calibration Rings (Enriches background environment)
    const gridHelper = new THREE.GridHelper(16, 16, 0xc7d2fe, 0xe2e8f0);
    gridHelper.position.set(0, -3.25, -1.5);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.22;
    floorGroup.add(gridHelper);

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
    });
    const ringGeo = new THREE.RingGeometry(3.6, 3.65, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, -3.24, -1.5);
    floorGroup.add(ringMesh);

    const outerRingGeo = new THREE.RingGeometry(5.8, 5.84, 64);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, ringMat);
    outerRingMesh.position.set(0, -3.24, -1.5);
    floorGroup.add(outerRingMesh);

    // 4. Screen Texture & Watch Model
    const screenTexture = new WatchScreenTexture(512);
    screenTexture.powerOn = powerOnRef.current;
    screenTexture.currentMenu = currentMenuRef.current;
    screenTextureRef.current = screenTexture;

    const watchModel = createWatch3DModel(screenTexture.texture, strapColor);
    modelRef.current = watchModel;
    watchModel.setPowerSwitch(powerOnRef.current);
    scene.add(watchModel.rootGroup);

    // Attach debug reference
    (window as any).__WATCH_DEBUG__ = {
      scene,
      camera,
      controls,
      watchModel,
      screenTexture,
      navRight: () => handleNavRightRef.current(),
      navLeft: () => handleNavLeftRef.current(),
      selectOk: () => handleSelectOkRef.current(),
      togglePower: () => handleTogglePowerRef.current(),
      setMenu: (m: WatchMenu) => {
        currentMenuRef.current = m;
        setCurrentMenu(m);
        if (screenTextureRef.current) screenTextureRef.current.currentMenu = m;
      }
    };

    // 5. 3D Raycasting for Direct Physical Touch & Switch Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downPos = { x: 0, y: 0, time: 0 };

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!modelRef.current) return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(modelRef.current.interactiveObjects, true);
      const hasInteractiveHit = hits.some(
        (h) =>
          h.object.userData?.interactiveType === 'touchPad' ||
          h.object.userData?.interactiveType === 'powerSwitch' ||
          h.object.userData?.componentId === 'display'
      );

      container.style.cursor = hasInteractiveHit ? 'pointer' : 'grab';
    };

    const onPointerDown = (e: MouseEvent) => {
      downPos = { x: e.clientX, y: e.clientY, time: Date.now() };
    };

    const onPointerUp = (e: MouseEvent) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      const duration = Date.now() - downPos.time;
      if (dist > 8 || duration > 500) return; // Ignore drag rotation

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!modelRef.current) return;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(modelRef.current.interactiveObjects, true);

      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const hitData = hitObj.userData || {};

        // Hardware Controls Interaction
        if (hitData.interactiveType === 'touchPad') {
          if (!powerOnRef.current) {
            handleTogglePowerRef.current();
          } else {
            if (hitData.action === 'left') handleNavLeftRef.current();
            else if (hitData.action === 'ok') handleSelectOkRef.current();
            else if (hitData.action === 'right') handleNavRightRef.current();
          }
        } else if (hitData.interactiveType === 'powerSwitch') {
          handleTogglePowerRef.current();
        } else if (hitData.componentId === 'display') {
          // Tapping on display wakes screen if off, or navigates menus if on
          if (!powerOnRef.current) {
            handleTogglePowerRef.current();
          } else {
            handleNavRightRef.current();
          }
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('mousedown', onPointerDown);
    renderer.domElement.addEventListener('mouseup', onPointerUp);

    // 6. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update Screen Texture
      if (screenTextureRef.current) {
        screenTextureRef.current.language = language;
        screenTextureRef.current.powerOn = powerOnRef.current;
        screenTextureRef.current.currentMenu = currentMenuRef.current;
        screenTextureRef.current.update(telemetryRef.current, predictionRef.current, watchFaceTheme);
      }

      // Optical Sensor pulse glow
      if (modelRef.current && powerOnRef.current) {
        const pulse = 0.5 + 0.5 * Math.sin(time * (telemetryRef.current.max30102.heart_rate / 60) * Math.PI * 2);
        modelRef.current.setPulseGlow(pulse);
      }

      // Component highlight pulse animation
      if (modelRef.current?.updateHighlightPulse) {
        modelRef.current.updateHighlightPulse(time);
      }

      // Rotation & Motion Sync
      if (watchModel && watchModel.rootGroup) {
        if (motionSyncRef.current) {
          const ax = telemetryRef.current.mpu6050?.accel_x ?? 0;
          const ay = telemetryRef.current.mpu6050?.accel_y ?? 0;
          const az = (telemetryRef.current.mpu6050?.accel_z ?? 9.8) - 9.8;
          const targetRotX = (ay / 9.8) * 0.7;
          const targetRotY = (-ax / 9.8) * 0.7;
          const targetRotZ = (az / 9.8) * 0.4;

          watchModel.rootGroup.rotation.x = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.x, targetRotX, 0.08);
          watchModel.rootGroup.rotation.y = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.y, targetRotY, 0.08);
          watchModel.rootGroup.rotation.z = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.z, targetRotZ, 0.08);
        } else if (autoRotateRef.current) {
          watchModel.rootGroup.rotation.y += delta * 0.35;
          watchModel.rootGroup.rotation.x = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.x, 0, 0.05);
          watchModel.rootGroup.rotation.z = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.z, 0, 0.05);
        } else {
          watchModel.rootGroup.rotation.x = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.x, 0, 0.1);
          watchModel.rootGroup.rotation.y = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.y, 0, 0.1);
          watchModel.rootGroup.rotation.z = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.z, 0, 0.1);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 7. Handle Resize
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('mousedown', onPointerDown);
      renderer.domElement.removeEventListener('mouseup', onPointerUp);
      controls.dispose();
      pmremGenerator.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (screenTextureRef.current) {
        screenTextureRef.current.dispose();
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 35%, #ffffff 0%, #f8fafc 45%, #e2e8f0 85%, #cbd5e1 100%)',
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

    </div>
  );
};
