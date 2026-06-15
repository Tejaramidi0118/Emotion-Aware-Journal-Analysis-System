import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Interactive3DBG() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf3f8fc, 0.0025);

    const camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    camera.position.z = 380;
    camera.position.y = 120;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // fully transparent background
    container.appendChild(renderer.domElement);

    // 2. Create Particle Wave Geometry & Emotion Color Palettes
    const SEPARATOR = 16, AMOUNTX = 64, AMOUNTY = 64;
    const numParticles = AMOUNTX * AMOUNTY;

    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);
    const targetColors = new Float32Array(numParticles * 3);

    const EMOTION_PALETTES = {
      joy: [new THREE.Color(0xfde047), new THREE.Color(0xfcbd5c), new THREE.Color(0xf43f5e)], // yellow, peach, rose
      trust: [new THREE.Color(0x60a5fa), new THREE.Color(0x38bdf8), new THREE.Color(0x34d399)], // blue, sky, emerald
      fear: [new THREE.Color(0x78716c), new THREE.Color(0x7c3aed), new THREE.Color(0x0284c7)], // stone grey, purple, blue
      surprise: [new THREE.Color(0xc084fc), new THREE.Color(0x22d3ee), new THREE.Color(0xf472b6)], // violet, cyan, pink
      sadness: [new THREE.Color(0x93c5fd), new THREE.Color(0x6366f1), new THREE.Color(0x475569)], // blue, indigo, slate
      disgust: [new THREE.Color(0xa7f3d0), new THREE.Color(0x34d399), new THREE.Color(0xa855f7)], // green, emerald, purple
      anger: [new THREE.Color(0xfca5a5), new THREE.Color(0xdc2626), new THREE.Color(0xf97316)], // red, rose, orange
      anticipation: [new THREE.Color(0xfed7aa), new THREE.Color(0xf59e0b), new THREE.Color(0x10b981)], // orange, amber, emerald
      love: [new THREE.Color(0xfbcfe8), new THREE.Color(0xec4899), new THREE.Color(0xc084fc)], // pink, rose, purple
      optimism: [new THREE.Color(0xfef08a), new THREE.Color(0xeab308), new THREE.Color(0x10b981)], // yellow, gold, emerald
      pessimism: [new THREE.Color(0xcbd5e1), new THREE.Color(0x64748b), new THREE.Color(0x475569)], // slate shades
      neutral: [new THREE.Color(0xc084fc), new THREE.Color(0x93c5fd), new THREE.Color(0xa7f3d0)] // purple, blue, green
    };

    const setTargetColors = (emotion) => {
      const palette = EMOTION_PALETTES[emotion] || EMOTION_PALETTES.neutral;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const col = palette[(ix + iy) % palette.length];
          targetColors[i] = col.r;
          targetColors[i + 1] = col.g;
          targetColors[i + 2] = col.b;
          i += 3;
        }
      }
    };

    // Initialize with neutral palette
    setTargetColors('neutral');

    let i = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions[i] = ix * SEPARATOR - (AMOUNTX * SEPARATOR) / 2; // X
        positions[i + 1] = 0; // Y
        positions[i + 2] = iy * SEPARATOR - (AMOUNTY * SEPARATOR) / 2; // Z

        colors[i] = targetColors[i];
        colors[i + 1] = targetColors[i + 1];
        colors[i + 2] = targetColors[i + 2];
        i += 3;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circular particle texture generator
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 16;
    pCanvas.height = 16;
    const pCtx = pCanvas.getContext('2d');
    const grad = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 16, 16);
    const texture = new THREE.CanvasTexture(pCanvas);

    const material = new THREE.PointsMaterial({
      size: 1.8, // smaller premium particles
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending, // glowing overlap
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 3. Mouse & Dynamic Events
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.12;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.08;
    };

    const handleEmotionChanged = (e) => {
      const emotion = e.detail;
      setTargetColors(emotion);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('emotion-changed', handleEmotionChanged);

    // 4. Animation Loop
    let count = 0;
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth camera interpolation
      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;

      camera.position.x = 380 * Math.sin(targetX * 0.002) + targetX;
      camera.position.y = 120 + targetY;
      camera.lookAt(0, 0, 0);

      // Slower calming wave Y calculation
      const posAttr = geometry.attributes.position;
      const posArr = posAttr.array;
      let idx = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          posArr[idx + 1] =
            Math.sin((ix + count) * 0.2) * 18 +
            Math.sin((iy + count) * 0.3) * 18;
          idx += 3;
        }
      }
      posAttr.needsUpdate = true;

      // Smooth color morphing interpolation
      const colorsAttr = geometry.attributes.color;
      const colorsArr = colorsAttr.array;
      let needsColorUpdate = false;
      for (let k = 0; k < colorsArr.length; k++) {
        const diff = targetColors[k] - colorsArr[k];
        if (Math.abs(diff) > 0.001) {
          colorsArr[k] += diff * 0.03; // morph speed
          needsColorUpdate = true;
        }
      }
      if (needsColorUpdate) {
        colorsAttr.needsUpdate = true;
      }

      // Meditative slow rotation
      particles.rotation.y = count * 0.008;

      renderer.render(scene, camera);
      count += 0.006; // reduced animation speed
    };

    animate();

    // 5. Handle Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // 6. Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('emotion-changed', handleEmotionChanged);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    />
  );
}
