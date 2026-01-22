'use client';

/**
 * @fileoverview 3D Model Viewer Component
 *
 * A reusable component for displaying GLB/GLTF 3D models with:
 * - Auto-rotation
 * - Orbit controls
 * - Fullscreen/maximize capability
 * - Loading states
 * - Error handling for WebGL crashes
 *
 * @module components/tools/shared/model-viewer
 */

import { Suspense, useRef, useState, useCallback, useEffect, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Maximize02Icon, Minimize02Icon, RefreshIcon, Alert02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

/**
 * Error boundary for catching WebGL and Three.js errors
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CanvasErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ModelViewer] Canvas error:', error);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

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

  // Cleanup GLTF resources on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Dispose of the cached GLTF when component unmounts
      useGLTF.clear(url);
    };
  }, [url]);

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
        minDistance={1}
        maxDistance={6}
      />
    </>
  );
}

/**
 * Error fallback component shown when WebGL fails
 */
function ErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 rounded-lg text-white gap-4 p-4">
      <HugeiconsIcon icon={Alert02Icon} className="w-12 h-12 text-yellow-500" />
      <p className="text-sm text-center text-gray-400">Failed to load 3D model</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm" className="gap-2">
          <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" />
          Retry
        </Button>
      )}
    </div>
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
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [key, setKey] = useState(0);

  const toggleMaximize = useCallback(() => {
    setIsMaximized((prev) => {
      // Force remount of Canvas when exiting maximize to avoid WebGL issues
      if (prev) {
        setKey((k) => k + 1);
      }
      return !prev;
    });
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setKey((prev) => prev + 1); // Force remount of Canvas
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMaximized) {
        setIsMaximized(false);
      }
    };

    if (isMaximized) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isMaximized]);

  // Track container dimensions to ensure Canvas has valid size
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkDimensions = () => {
      const { width, height } = container.getBoundingClientRect();
      // Only mark as ready when we have valid dimensions
      setIsReady(width > 0 && height > 0);
    };

    // Check immediately
    checkDimensions();

    // Use ResizeObserver to track dimension changes
    const observer = new ResizeObserver(checkDimensions);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

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
            <CanvasErrorBoundary
              fallback={<ErrorFallback onRetry={handleRetry} />}
              onError={handleError}
            >
              <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }}>
                <Scene url={url} autoRotate={autoRotate} />
              </Canvas>
            </CanvasErrorBoundary>
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
        {hasError ? (
          <ErrorFallback onRetry={handleRetry} />
        ) : isReady ? (
          <CanvasErrorBoundary
            key={key}
            fallback={<ErrorFallback onRetry={handleRetry} />}
            onError={handleError}
          >
            <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }}>
              <Scene url={url} autoRotate={autoRotate} />
            </Canvas>
          </CanvasErrorBoundary>
        ) : (
          // Loading placeholder while waiting for valid dimensions
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {allowMaximize && !hasError && (
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
