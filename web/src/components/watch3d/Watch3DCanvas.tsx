'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SensorTelemetry } from '../../types/sensor';
import { AIPrediction } from '../../types/ai';
import { WatchScreenTexture } from './WatchScreenTexture';
import { createWatch3DModel, Watch3DModel } from './WatchGeometry';
import { CameraPreset, StrapColor, WatchFaceTheme } from './types';

interface Watch3DCanvasProps {
  telemetry: SensorTelemetry;
  prediction?: AIPrediction;
  strapColor: StrapColor;
  watchFaceTheme: WatchFaceTheme;
  autoRotate: boolean;
  motionSync: boolean;
  explodedProgress: number;
  cameraPreset: CameraPreset;
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<Watch3DModel | null>(null);
  const screenTextureRef = useRef<WatchScreenTexture | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(3.8, 2.8, 6.2));
  const isUserInteractingRef = useRef<boolean>(false);

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
  }, [explodedProgress]);

  // Handle Camera Presets
  useEffect(() => {
    if (!controlsRef.current || isUserInteractingRef.current) return;

    if (cameraPreset === 'FRONT') {
      targetCameraPos.current.set(0, 0, 7.5);
    } else if (cameraPreset === 'PERSPECTIVE') {
      targetCameraPos.current.set(3.8, 2.8, 6.2);
    } else if (cameraPreset === 'BACK_SENSOR') {
      targetCameraPos.current.set(0, 0, -7.5);
    } else if (cameraPreset === 'SIDE') {
      targetCameraPos.current.set(7.5, 0.4, 0.2);
    }
  }, [cameraPreset]);

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
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 14.0;
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

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // Key Light (Warm front-top light)
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 1.8);
    keyLight.position.set(5, 8, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Fill Light (Cool cyan side light)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    fillLight.position.set(-6, -3, 4);
    scene.add(fillLight);

    // Rim Light (Magenta/purple cyber backlight)
    const rimLight = new THREE.PointLight(0xa855f7, 1.4, 15);
    rimLight.position.set(0, 4, -6);
    scene.add(rimLight);

    // Floor shadow catcher / subtle glow disc
    const floorGeo = new THREE.CircleGeometry(5.5, 32);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      transparent: true,
      opacity: 0.45,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -3.2;
    scene.add(floorMesh);

    // 4. Screen Texture & Watch Model
    const screenTexture = new WatchScreenTexture(512);
    screenTextureRef.current = screenTexture;

    const watchModel = createWatch3DModel(screenTexture.texture, strapColor);
    modelRef.current = watchModel;
    scene.add(watchModel.rootGroup);

    // 5. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update Live OLED Screen Texture
      if (screenTextureRef.current) {
        screenTextureRef.current.update(telemetry, prediction, watchFaceTheme);
      }

      // Optical Sensor pulse glow
      if (modelRef.current) {
        const pulse = 0.5 + 0.5 * Math.sin(time * (telemetry.max30102.heart_rate / 60) * Math.PI * 2);
        modelRef.current.setPulseGlow(pulse);
      }

      // Smooth camera transition when user isn't dragging
      if (!isUserInteractingRef.current && camera) {
        camera.position.lerp(targetCameraPos.current, 0.05);
      }

      // Rotation & Motion Sync
      if (watchModel && watchModel.rootGroup) {
        if (motionSync) {
          // Responsive to MPU6050 accelerometer & gyro tilt
          const ax = telemetry.mpu6050?.accel_x ?? 0;
          const ay = telemetry.mpu6050?.accel_y ?? 0;
          const az = (telemetry.mpu6050?.accel_z ?? 9.8) - 9.8;
          const targetRotX = (ay / 9.8) * 0.7;
          const targetRotY = (-ax / 9.8) * 0.7;
          const targetRotZ = (az / 9.8) * 0.4;

          watchModel.rootGroup.rotation.x = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.x, targetRotX, 0.08);
          watchModel.rootGroup.rotation.y = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.y, targetRotY, 0.08);
          watchModel.rootGroup.rotation.z = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.z, targetRotZ, 0.08);
        } else if (autoRotate) {
          // Slow smooth presentation rotation
          watchModel.rootGroup.rotation.y += delta * 0.35;
          watchModel.rootGroup.rotation.x = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.x, 0, 0.05);
          watchModel.rootGroup.rotation.z = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.z, 0, 0.05);
        } else {
          // Slerp back to default orientation if neither is active
          watchModel.rootGroup.rotation.x = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.x, 0, 0.05);
          watchModel.rootGroup.rotation.z = THREE.MathUtils.lerp(watchModel.rootGroup.rotation.z, 0, 0.05);
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 6. Handle Resize
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
      controls.dispose();
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
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 50%, #0d131f 0%, #060910 80%, #020408 100%)',
        cursor: 'grab',
      }}
    />
  );
};
