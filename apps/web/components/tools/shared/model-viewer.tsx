'use client';

/**
 * @fileoverview 3D Model Viewer Component
 *
 * A reusable component for displaying GLB/GLTF 3D models with:
 * - Auto-rotation
 * - Orbit controls
 * - Fullscreen/maximize capability
 * - Loading states
 *
 * @module components/tools/shared/model-viewer
 */

import { Suspense, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Maximize02Icon, Minimize02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

interface ModelProps {
  url: string;
  autoRotate?: boolean;
}

function Model({ url, autoRotate = true }: ModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4a5568" wireframe />
    </mesh>
  );
}

function Scene({ url, autoRotate }: ModelProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <Environment preset="studio" />

      <Suspense fallback={<LoadingFallback />}>
        <Center>
          <Model url={url} autoRotate={autoRotate} />
        </Center>
      </Suspense>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
      />
    </>
  );
}

export interface ModelViewerProps {
  /** URL to the GLB/GLTF model */
  url: string;
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Additional class names */
  className?: string;
  /** Allow maximize/fullscreen */
  allowMaximize?: boolean;
}

export function ModelViewer({
  url,
  autoRotate = true,
  className,
  allowMaximize = true,
}: ModelViewerProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => !prev);
  }, []);

  // Handle escape key to exit fullscreen
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && isMaximized) {
      setIsMaximized(false);
    }
  }, [isMaximized]);

  // Add/remove event listener
  useState(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  });

  return (
    <>
      {/* Maximized overlay */}
      {isMaximized && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsMaximized(false)}
        >
          <div
            className="relative w-full h-full max-w-[90vw] max-h-[90vh] m-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <Scene url={url} autoRotate={autoRotate} />
            </Canvas>
            <Button
              onClick={toggleMaximize}
              variant="secondary"
              size="icon"
              className="absolute top-4 right-4"
            >
              <HugeiconsIcon icon={Minimize02Icon} className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Normal view */}
      <div
        ref={containerRef}
        className={cn(
          'relative w-full h-full min-h-[300px] bg-gray-900 rounded-lg overflow-hidden',
          className
        )}
      >
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <Scene url={url} autoRotate={autoRotate} />
        </Canvas>

        {allowMaximize && (
          <Button
            onClick={toggleMaximize}
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 opacity-70 hover:opacity-100"
          >
            <HugeiconsIcon icon={Maximize02Icon} className="w-4 h-4" />
          </Button>
        )}
      </div>
    </>
  );
}
