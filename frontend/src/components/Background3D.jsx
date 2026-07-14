import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function ParticleField() {
  const ref = useRef();
  
  // Generate random particles
  const [positions, colors] = useMemo(() => {
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
      // Create a cylindrical/torus like distribution for a "tunnel" or DNA-like vibe
      const r = 4 + Math.random() * 6;
      const theta = 2 * Math.PI * Math.random();
      const z = (Math.random() - 0.5) * 40;
      
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(theta);
      positions[i * 3 + 2] = z;

      // Mix Cyan (0x06b6d4) and Emerald (0x10b981)
      const isCyan = Math.random() > 0.5;
      color.setHex(isCyan ? 0x06b6d4 : 0x10b981);
      
      // Make some particles brighter
      color.multiplyScalar(Math.random() * 1.5 + 0.5);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return [positions, colors];
  }, []);

  // Animate particles
  useFrame((state) => {
    if (!ref.current) return;
    
    // Rotate the entire field slowly
    ref.current.rotation.z = state.clock.elapsedTime * 0.05;
    
    // Subtly move based on mouse position (normalized -1 to 1)
    const mouseX = (state.pointer.x * Math.PI) / 10;
    const mouseY = (state.pointer.y * Math.PI) / 10;
    
    // Interpolate rotation towards mouse position for smooth effect
    ref.current.rotation.x += (mouseY - ref.current.rotation.x) * 0.05;
    ref.current.rotation.y += (mouseX - ref.current.rotation.y) * 0.05;
  });

  return (
    <Points ref={ref} positions={positions} colors={colors} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        vertexColors
        size={0.1}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function Background3D() {
  return (
    <div className="fixed inset-0 z-0 bg-[#030712] pointer-events-none">
      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <fog attach="fog" args={['#030712', 10, 30]} />
        <ParticleField />
      </Canvas>
      {/* Overlay gradient to blend UI */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030712]/50 to-[#030712]"></div>
    </div>
  );
}
