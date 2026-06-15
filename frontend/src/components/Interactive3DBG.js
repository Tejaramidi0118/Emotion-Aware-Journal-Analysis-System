import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Interactive3DBG() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf3f8fc, 0.0035);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    camera.position.z = 350;
    camera.position.y = 100;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // fully transparent background
    container.appendChild(renderer.domElement);

    // 2. Create Particle Wave Geometry
    const SEPARATOR = 15, AMOUNTX = 60, AMOUNTY = 60;
    const numParticles = AMOUNTX * AMOUNTY;

    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);

    // Subtle pastel palette matching the wellness aesthetic
    const colorChoices = [
      new THREE.Color(0xc084fc), // pastel purple
      new THREE.Color(0x93c5fd), // pastel blue
      new THREE.Color(0xa7f3d0), // pastel green
      new THREE.Color(0xfde047), // pastel yellow
    ];

    let i = 0;
    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        // Grid layout X and Z
        positions[i] = ix * SEPARATOR - (AMOUNTX * SEPARATOR) / 2; // X
        positions[i + 1] = 0; // Y (height)
        positions[i + 2] = iy * SEPARATOR - (AMOUNTY * SEPARATOR) / 2; // Z

        // Color selection
        const col = colorChoices[(ix + iy) % colorChoices.length];
        colors[i] = col.r;
        colors[i + 1] = col.g;
        colors[i + 2] = col.b;

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
      size: 4.5,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // 3. Mouse Interaction
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.15;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 4. Animation Loop
    let count = 0;
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth camera lerp
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      camera.position.x = 350 * Math.sin(targetX * 0.003) + targetX;
      camera.position.y = 100 + targetY;
      camera.lookAt(0, 0, 0);

      // Y-axis wave mathematics
      const positions = geometry.attributes.position.array;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          positions[i + 1] =
            Math.sin((ix + count) * 0.25) * 22 +
            Math.sin((iy + count) * 0.4) * 22;
          i += 3;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      // Subtle automatic rotation
      particles.rotation.y = count * 0.025;

      renderer.render(scene, camera);
      count += 0.025;
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
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
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
