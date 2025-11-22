import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, Stars, Float } from '@react-three/drei';
import * as THREE from 'three';

interface SoulVisualizerProps {
  audioLevel: number; // 0 to 1
  isActive: boolean;
}

const SoulMesh: React.FC<{ audioLevel: number; isActive: boolean }> = ({ audioLevel, isActive }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Rotate slowly
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
      
      // Pulse scale based on audio
      const targetScale = 1.5 + audioLevel * 1.5;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }

    if (materialRef.current) {
       // Distort more when talking
       const targetDistort = 0.3 + audioLevel * 0.8;
       materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.1);
       
       // Color shift
       const hue = (state.clock.getElapsedTime() * 0.1) % 1;
       const color = new THREE.Color().setHSL(hue, 0.6, 0.5);
       if (isActive) {
           // Brighter, more cyan/white when active
           materialRef.current.color.lerp(new THREE.Color("#a0e0ff"), 0.05);
       } else {
           materialRef.current.color.lerp(new THREE.Color("#4b0082"), 0.05);
       }
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[1, 64, 64]} ref={meshRef}>
        <MeshDistortMaterial
          ref={materialRef}
          color="#4b0082"
          attach="material"
          distort={0.4}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
    </Float>
  );
};

const SoulVisualizer: React.FC<SoulVisualizerProps> = ({ audioLevel, isActive }) => {
  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 4] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} color="blue" intensity={0.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <SoulMesh audioLevel={audioLevel} isActive={isActive} />
      </Canvas>
    </div>
  );
};

export default SoulVisualizer;