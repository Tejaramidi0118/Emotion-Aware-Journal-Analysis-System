import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function MorphingOrb({ size = 80, emotion = 'neutral' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0); // transparent background
    container.appendChild(renderer.domElement);

    // 2. Emotion Color Map Definitions
    const emotionColorMap = {
      joy: { color: 0xfde047, light1: 0xf43f5e, light2: 0x10b981, light3: 0xf59e0b },
      trust: { color: 0x60a5fa, light1: 0x3b82f6, light2: 0x06b6d4, light3: 0x10b981 },
      fear: { color: 0x78716c, light1: 0x6b7280, light2: 0x7c3aed, light3: 0x0284c7 },
      surprise: { color: 0xc084fc, light1: 0xa855f7, light2: 0x06b6d4, light3: 0xec4899 },
      sadness: { color: 0x93c5fd, light1: 0x3b82f6, light2: 0x6366f1, light3: 0x475569 },
      disgust: { color: 0xa7f3d0, light1: 0x059669, light2: 0x10b981, light3: 0x84cc16 },
      anger: { color: 0xfca5a5, light1: 0xdc2626, light2: 0xe11d48, light3: 0xf97316 },
      anticipation: { color: 0xfed7aa, light1: 0xf59e0b, light2: 0xd97706, light3: 0x06b6d4 },
      love: { color: 0xfbcfe8, light1: 0xec4899, light2: 0xf43f5e, light3: 0x8b5cf6 },
      optimism: { color: 0xfef08a, light1: 0xeab308, light2: 0xf97316, light3: 0x10b981 },
      pessimism: { color: 0xcbd5e1, light1: 0x64748b, light2: 0x475569, light3: 0x334155 },
      neutral: { color: 0xe0e7ff, light1: 0x3b82f6, light2: 0xec4899, light3: 0x06b6d4 }
    };

    const theme = emotionColorMap[emotion] || emotionColorMap.neutral;

    // 3. Ambient & Focused Point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(theme.light1, 14, 50);
    light1.position.set(2, 2, 2);
    scene.add(light1);

    const light2 = new THREE.PointLight(theme.light2, 14, 50);
    light2.position.set(-2, -2, 2);
    scene.add(light2);

    const light3 = new THREE.PointLight(theme.light3, 10, 50);
    light3.position.set(0, 2, -2);
    scene.add(light3);

    // 4. Geometry and Refined Mesh Material (High-contrast glass)
    const geometry = new THREE.SphereGeometry(1.2, 48, 48);
    const originalPositions = geometry.attributes.position.clone();

    const material = new THREE.MeshPhysicalMaterial({
      color: theme.color,
      roughness: 0.15,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transparent: true,
      opacity: 0.82, // Frosted opacity showing color
      depthWrite: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 5. Animation Loop
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      
      mesh.rotation.y = time * 0.18;
      mesh.rotation.x = time * 0.12;

      // Rotate point lights around the sphere
      light1.position.x = 3 * Math.sin(time * 0.8);
      light1.position.z = 3 * Math.cos(time * 0.8);
      
      light2.position.y = 3 * Math.sin(time * 0.6);
      light2.position.x = 3 * Math.cos(time * 0.6);

      // Morph geometry vertices along normals
      const posAttr = geometry.attributes.position;
      const origArr = originalPositions.array;
      const posArr = posAttr.array;

      for (let idx = 0; idx < posArr.length; idx += 3) {
        const ox = origArr[idx];
        const oy = origArr[idx + 1];
        const oz = origArr[idx + 2];

        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const nx = ox / len;
        const ny = oy / len;
        const nz = oz / len;

        // Wave noise pertubations
        const wave = 
          Math.sin(ox * 2.2 + time * 1.6) * 0.08 +
          Math.cos(oy * 2.2 + time * 1.3) * 0.08 +
          Math.sin(oz * 2.2 + time * 2.1) * 0.06;

        posArr[idx] = ox + nx * wave;
        posArr[idx + 1] = oy + ny * wave;
        posArr[idx + 2] = oz + nz * wave;
      }

      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();

      renderer.render(scene, camera);
    };

    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      geometry.dispose();
      originalPositions.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [size, emotion]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
}
