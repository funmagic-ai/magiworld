'use client';

import { useRef, useMemo, Suspense, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Box, Center } from '@react-three/drei';
import * as THREE from 'three';

interface TextLabel {
  id: string;
  text: string;
  position: { x: number; y: number; z: number };
  fontSize: number;
}

interface CubeSize {
  width: number;
  height: number;
  depth: number;
}

interface DisplaySize {
  width: number;
  height: number;
  depth: number;
}

// Create canvas texture for text (high quality, works for all languages)
function createTextCanvas(
  text: string,
  fontSize: number,
  color: string,
  isSelected: boolean
): { canvas: HTMLCanvasElement; aspectRatio: number } {
  // High resolution canvas for crisp text
  const canvasHeight = 256;
  const padding = 40;

  // Create temporary canvas to measure text
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  const fontSizePx = 120; // Base font size for quality
  tempCtx.font = `bold ${fontSizePx}px "Noto Sans SC", "Microsoft YaHei", "SimHei", Arial, sans-serif`;
  const metrics = tempCtx.measureText(text);
  const textWidth = metrics.width;

  // Calculate canvas width based on text
  const canvasWidth = Math.max(256, Math.ceil(textWidth + padding * 2));
  const aspectRatio = canvasWidth / canvasHeight;

  // Create actual canvas
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw text
  ctx.font = `bold ${fontSizePx}px "Noto Sans SC", "Microsoft YaHei", "SimHei", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text color
  const textColor = isSelected ? '#ffff00' : color;

  // Add glow effect
  ctx.shadowColor = textColor;
  ctx.shadowBlur = 10;

  // Draw text with outline for better visibility
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeText(text, canvasWidth / 2, canvasHeight / 2);

  ctx.fillStyle = textColor;
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

  return { canvas, aspectRatio };
}

// Text3D component - uses "Double-Plane Sandwich" Canvas texture method
function Text3D({
  text,
  fontSize,
  color,
  position,
  isSelected,
  renderOrder,
}: {
  text: string;
  fontSize: number;
  color: string;
  position: [number, number, number];
  isSelected: boolean;
  renderOrder: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Create canvas texture and materials
  const { texture, planeWidth, planeHeight } = useMemo(() => {
    const { canvas, aspectRatio } = createTextCanvas(text, fontSize, color, isSelected);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    // Calculate plane size based on fontSize and aspect ratio
    const height = fontSize * 1.2;
    const width = height * aspectRatio;

    return { texture: tex, planeWidth: width, planeHeight: height };
  }, [text, fontSize, color, isSelected]);

  // Create material with emissive for visibility in dark scenes
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      emissive: new THREE.Color(isSelected ? '#ffff00' : '#ffffff'),
      emissiveIntensity: 0.3,
      emissiveMap: texture,
    });
  }, [texture, isSelected]);

  // Plane geometry
  const geometry = useMemo(() => {
    return new THREE.PlaneGeometry(planeWidth, planeHeight);
  }, [planeWidth, planeHeight]);

  // Small gap between front and back planes to prevent Z-fighting
  const gap = 0.01;

  return (
    <group ref={groupRef} position={position} renderOrder={renderOrder}>
      {/* Front-facing plane */}
      <mesh geometry={geometry} material={material} position={[0, 0, gap]} />

      {/* Back-facing plane (rotated 180° on Y axis) */}
      <mesh
        geometry={geometry}
        material={material}
        position={[0, 0, -gap]}
        rotation={[0, Math.PI, 0]}
      />
    </group>
  );
}

// Draggable text label component
function DraggableTextLabel({
  label,
  scale,
  cubeSize,
  labelIndex,
  isSelected,
  onSelect,
  onPositionChange,
  onDragStart,
  onDragEnd,
}: {
  label: TextLabel;
  scale: number;
  cubeSize: CubeSize;
  labelIndex: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onPositionChange: (id: string, position: { x: number; y: number; z: number }) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { camera, raycaster } = useThree();
  const dragPlane = useRef(new THREE.Plane());
  const intersection = useRef(new THREE.Vector3());
  const offset = useRef(new THREE.Vector3());
  const parentInverseMatrix = useRef(new THREE.Matrix4());
  const worldPosition = useRef(new THREE.Vector3());

  // Calculate font size proportional to cube size (use smallest dimension as reference)
  const minCubeDimension = Math.min(cubeSize.width, cubeSize.height, cubeSize.depth);
  // Font size is a percentage of the cube size, scaled by the label's fontSize factor
  const baseFontSize = (minCubeDimension * 0.08) * label.fontSize * scale;

  // Calculate hitbox size based on actual font size
  const hitboxWidth = Math.max(label.text.length * baseFontSize * 0.8, minCubeDimension * scale * 0.3);
  const hitboxHeight = Math.max(baseFontSize * 1.4, minCubeDimension * scale * 0.15);

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect(label.id);

    if (groupRef.current && groupRef.current.parent) {
      setIsDragging(true);
      onDragStart();

      // Store parent's inverse world matrix for coordinate transformation
      groupRef.current.parent.updateWorldMatrix(true, false);
      parentInverseMatrix.current.copy(groupRef.current.parent.matrixWorld).invert();

      // Get current world position of the text
      groupRef.current.getWorldPosition(worldPosition.current);

      // Create a plane facing the camera at the object's world position
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);
      dragPlane.current.setFromNormalAndCoplanarPoint(
        cameraDirection.negate(),
        worldPosition.current
      );

      // Calculate offset from click point to object center (in world space)
      raycaster.setFromCamera(e.pointer, camera);
      raycaster.ray.intersectPlane(dragPlane.current, intersection.current);
      offset.current.copy(worldPosition.current).sub(intersection.current);

      // Capture pointer
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, [camera, raycaster, onSelect, onDragStart, label.id]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !groupRef.current) return;

    // Calculate new world position from drag
    raycaster.setFromCamera(e.pointer, camera);
    raycaster.ray.intersectPlane(dragPlane.current, intersection.current);
    const newWorldPosition = intersection.current.add(offset.current);

    // Transform world position to parent's local space
    const localPosition = newWorldPosition.clone().applyMatrix4(parentInverseMatrix.current);
    groupRef.current.position.copy(localPosition);
  }, [isDragging, camera, raycaster]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;

    setIsDragging(false);
    onDragEnd();

    if (groupRef.current) {
      const pos = groupRef.current.position;
      onPositionChange(label.id, {
        x: pos.x / scale,
        y: pos.y / scale,
        z: pos.z / scale,
      });
    }

    // Release pointer
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, [isDragging, onDragEnd, onPositionChange, label.id, scale]);

  const handlePointerEnter = useCallback(() => {
    setIsHovered(true);
    document.body.style.cursor = 'grab';
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovered(false);
      document.body.style.cursor = 'auto';
    }
  }, [isDragging]);

  // Each text gets unique renderOrder to prevent z-fighting between texts
  const textRenderOrder = 100 + labelIndex;

  return (
    <group
      ref={groupRef}
      position={[label.position.x * scale, label.position.y * scale, label.position.z * scale]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* 3D Text using TextGeometry with DoubleSide material */}
      <Text3D
        text={label.text}
        fontSize={baseFontSize}
        color="#ffffff"
        position={[0, 0, 0]}
        isSelected={isSelected}
        renderOrder={textRenderOrder}
      />

      {/* Invisible hitbox for easier clicking - double-sided */}
      <mesh visible={false}>
        <planeGeometry args={[hitboxWidth * 1.2, hitboxHeight * 1.2]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>

      {/* Selection indicator - render behind text */}
      {(isSelected || isHovered) && (
        <mesh renderOrder={textRenderOrder - 1} position={[0, 0, -baseFontSize * 0.1]}>
          <planeGeometry args={[hitboxWidth, hitboxHeight]} />
          <meshBasicMaterial
            color={isSelected ? '#ff8800' : '#4488ff'}
            transparent
            opacity={isSelected ? 0.3 : 0.2}
            depthTest={false}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

interface RotatingCubeProps {
  size: CubeSize;
  textureUrl?: string | null;
  labels: TextLabel[];
  autoRotate?: boolean;
  selectedLabelId: string | null;
  onSelectLabel: (id: string | null) => void;
  onLabelPositionChange: (id: string, position: { x: number; y: number; z: number }) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

function CrystalCube({
  size,
  textureUrl,
  labels,
  autoRotate = true,
  selectedLabelId,
  onSelectLabel,
  onLabelPositionChange,
  isDragging,
  setIsDragging,
}: RotatingCubeProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Load texture if provided
  const texture = useMemo(() => {
    if (!textureUrl) return null;
    const loader = new THREE.TextureLoader();
    return loader.load(textureUrl);
  }, [textureUrl]);

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate && !selectedLabelId && !isDragging) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  // Scale down for display (assuming mm input, display in reasonable units)
  const scale = 0.02;
  const displaySize: DisplaySize = {
    width: size.width * scale,
    height: size.height * scale,
    depth: size.depth * scale,
  };

  const handleBackgroundClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelectLabel(null);
  };

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';
  }, [setIsDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = 'auto';
  }, [setIsDragging]);

  return (
    <group ref={groupRef}>
      {/* Crystal box wireframe */}
      <Box
        args={[displaySize.width, displaySize.height, displaySize.depth]}
        onClick={handleBackgroundClick}
        renderOrder={0}
      >
        <meshBasicMaterial
          color="#00ffff"
          wireframe
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </Box>

      {/* Inner cube with texture or solid color */}
      <Box
        args={[displaySize.width * 0.95, displaySize.height * 0.95, displaySize.depth * 0.95]}
        onClick={handleBackgroundClick}
        renderOrder={1}
      >
        {texture ? (
          <meshStandardMaterial
            map={texture}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
        ) : (
          <meshStandardMaterial
            color="#1e3a5f"
            transparent
            opacity={0.15}
            depthWrite={false}
          />
        )}
      </Box>

      {/* Text labels as children of the cube group - they rotate with the cube */}
      <Suspense fallback={null}>
        {labels.map((label, index) => (
          <DraggableTextLabel
            key={label.id}
            label={label}
            scale={scale}
            cubeSize={size}
            labelIndex={index}
            isSelected={selectedLabelId === label.id}
            onSelect={onSelectLabel}
            onPositionChange={onLabelPositionChange}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Suspense>
    </group>
  );
}

// Wrapper to manage orbit controls
function Scene({
  size,
  textureUrl,
  labels,
  autoRotate,
  selectedLabelId,
  onSelectLabel,
  onLabelPositionChange,
}: {
  size: CubeSize;
  textureUrl?: string | null;
  labels: TextLabel[];
  autoRotate: boolean;
  selectedLabelId: string | null;
  onSelectLabel: (id: string | null) => void;
  onLabelPositionChange: (id: string, position: { x: number; y: number; z: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const orbitControlsRef = useRef<any>(null);

  // Disable orbit controls while dragging
  const handleDraggingChange = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = !dragging;
    }
  }, []);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />

      <Suspense fallback={null}>
        <Center>
          <CrystalCube
            size={size}
            textureUrl={textureUrl}
            labels={labels}
            autoRotate={autoRotate}
            selectedLabelId={selectedLabelId}
            onSelectLabel={onSelectLabel}
            onLabelPositionChange={onLabelPositionChange}
            isDragging={isDragging}
            setIsDragging={handleDraggingChange}
          />
        </Center>
      </Suspense>

      <gridHelper args={[10, 20, '#333333', '#222222']} position={[0, -2, 0]} />
      <OrbitControls ref={orbitControlsRef} enableDamping dampingFactor={0.05} />
    </>
  );
}

interface CubeViewerProps {
  size: CubeSize;
  textureUrl?: string | null;
  labels?: TextLabel[];
  autoRotate?: boolean;
  selectedLabelId?: string | null;
  onSelectLabel?: (id: string | null) => void;
  onLabelPositionChange?: (id: string, position: { x: number; y: number; z: number }) => void;
}

export function CubeViewer({
  size,
  textureUrl,
  labels = [],
  autoRotate = true,
  selectedLabelId = null,
  onSelectLabel,
  onLabelPositionChange,
}: CubeViewerProps) {
  const handleSelectLabel = useCallback((id: string | null) => {
    onSelectLabel?.(id);
  }, [onSelectLabel]);

  const handlePositionChange = useCallback((id: string, position: { x: number; y: number; z: number }) => {
    onLabelPositionChange?.(id, position);
  }, [onLabelPositionChange]);

  return (
    <div className="w-full h-full min-h-[300px] bg-gray-900 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [3, 2, 4], fov: 50 }}>
        <Scene
          size={size}
          textureUrl={textureUrl}
          labels={labels}
          autoRotate={autoRotate}
          selectedLabelId={selectedLabelId}
          onSelectLabel={handleSelectLabel}
          onLabelPositionChange={handlePositionChange}
        />
      </Canvas>
    </div>
  );
}

export type { TextLabel, CubeSize };
