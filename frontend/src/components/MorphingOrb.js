import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function MorphingOrb({ size = 80 }) {
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
    renderer.setClearColor(0x000000, 0); // fully transparent background
    container.appendChild(renderer.domElement);

    // 2. Lights (refracted colors)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x3b82f6, 12, 50); // deep blue
    light1.position.set(2, 2, 2);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xec4899, 12, 50); // pink/rose
    light2.position.set(-2, -2, 2);
    scene.add(light2);

    const light3 = new THREE.PointLight(0x06b6d4, 8, 50); // teal
    light3.position.set(0, 2, -2);
    scene.add(light3);

    // 3. Morphing Sphere Geometry & Material
    // Segment count 48x48 is perfectly smooth and lightweight
    const geometry = new THREE.SphereGeometry(1.2, 48, 48);
    
    // Store original positions for displacement relative to base sphere
    const originalPositions = geometry.attributes.position.clone();
    
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.05,
      transmission: 0.95, // frosted glass transmission
      ior: 1.55, // glass refraction index
      thickness: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 4. Animation Loop
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const time = clock.getElapsedTime();
      
      // Rotate the mesh slowly
      mesh.rotation.y = time * 0.15;
      mesh.rotation.x = time * 0.1;

      // Rotate point lights around the sphere to shift the refracted colors
      light1.position.x = 3 * Math.sin(time * 0.7);
      light1.position.z = 3 * Math.cos(time * 0.7);
      
      light2.position.y = 3 * Math.sin(time * 0.5);
      light2.position.x = 3 * Math.cos(time * 0.5);

      // Morphing mathematics: perturb vertices along their normals
      const posAttr = geometry.attributes.position;
      const origArr = originalPositions.array;
      const posArr = posAttr.array;

      for (let idx = 0; idx < posArr.length; idx += 3) {
        // Base coordinate
        const ox = origArr[idx];
        const oy = origArr[idx + 1];
        const oz = origArr[idx + 2];

        // Length of base vector (distance from center)
        const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
        
        // Normalized direction vector (normal)
        const nx = ox / len;
        const ny = oy / len;
        const nz = oz / len;

        // Compound sine wave noise based on coordinate and time
        const wave = 
          Math.sin(ox * 2.5 + time * 1.5) * 0.08 +
          Math.cos(oy * 2.5 + time * 1.2) * 0.08 +
          Math.sin(oz * 2.5 + time * 2.0) * 0.06;

        // Apply displacement along the normal
        posArr[idx] = ox + nx * wave;
        posArr[idx + 1] = oy + ny * wave;
        posArr[idx + 2] = oz + nz * wave;
      }

      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();

      renderer.render(scene, camera);
    };

    animate();

    // 5. Cleanup
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
  }, [size]);

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
