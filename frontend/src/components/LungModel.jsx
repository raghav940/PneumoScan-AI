import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Capsule, Sphere, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

export default function LungModel({ severity = 'Normal' }) {
  const groupRef = useRef();

  // Slowly rotate the entire lung group
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
    }
  });

  const isInfected = severity === 'Moderate' || severity === 'Severe' || severity === 'Critical';
  const infectionColor = '#ef4444'; // Red
  const normalColor = '#06b6d4'; // Cyan

  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Left Lung (Healthy) */}
      <group position={[-1.2, 0, 0]} rotation={[0, 0, 0.2]}>
        <Capsule args={[0.8, 1.5, 4, 16]}>
          <meshBasicMaterial 
            color={normalColor} 
            wireframe={true} 
            transparent={true} 
            opacity={0.3} 
            blending={THREE.AdditiveBlending}
          />
        </Capsule>
        {/* Core highlight */}
        <Sphere args={[0.4, 8, 8]} position={[0, -0.2, 0]}>
          <meshBasicMaterial color={normalColor} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </Sphere>
      </group>

      {/* Right Lung (Potentially Infected) */}
      <group position={[1.2, 0, 0]} rotation={[0, 0, -0.2]}>
        <Capsule args={[0.8, 1.5, 4, 16]}>
          <meshBasicMaterial 
            color={isInfected ? infectionColor : normalColor} 
            wireframe={true} 
            transparent={true} 
            opacity={0.3} 
            blending={THREE.AdditiveBlending}
          />
        </Capsule>
        {/* Core highlight */}
        <Sphere args={[0.4, 8, 8]} position={[0, -0.2, 0]}>
          <meshBasicMaterial 
            color={isInfected ? infectionColor : normalColor} 
            transparent 
            opacity={0.5} 
            blending={THREE.AdditiveBlending} 
          />
        </Sphere>
        
        {/* If infected, add glowing particles */}
        {isInfected && (
          <mesh position={[0, 0.5, 0]}>
             <sphereGeometry args={[0.6, 16, 16]} />
             <meshBasicMaterial color={infectionColor} wireframe transparent opacity={0.6} blending={THREE.AdditiveBlending} />
          </mesh>
        )}
      </group>

      {/* Trachea (Windpipe) */}
      <group position={[0, 2.2, 0]}>
        <Capsule args={[0.2, 1, 4, 8]}>
          <meshBasicMaterial color={normalColor} wireframe transparent opacity={0.2} blending={THREE.AdditiveBlending} />
        </Capsule>
      </group>
    </group>
  );
}
