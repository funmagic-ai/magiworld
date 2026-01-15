'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ImageCropper } from './image-cropper';
import type { TextLabel, CubeSize } from './cube-viewer';

// Dynamic import for Three.js viewer to avoid SSR issues
const CubeViewer = dynamic(
  () => import('./cube-viewer').then((mod) => mod.CubeViewer),
  { ssr: false, loading: () => <ViewerSkeleton /> }
);

function ViewerSkeleton() {
  return (
    <div className="w-full h-full min-h-[400px] bg-gray-900 rounded-lg flex items-center justify-center">
      <div className="text-gray-400">Loading 3D Viewer...</div>
    </div>
  );
}

type ToolData = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  toolType: {
    slug: string;
    name: string;
    badgeColor: string;
  };
};

interface Crystal3DInterfaceProps {
  tool: ToolData;
}

const DEFAULT_CUBE_SIZE: CubeSize = {
  width: 80,
  height: 100,
  depth: 50,
};

type ImageState = 'upload' | 'cropping' | 'preview';

export function Crystal3DInterface({ tool }: Crystal3DInterfaceProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState<string>('image');

  // Image states
  const [imageState, setImageState] = useState<ImageState>('upload');
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  // Cube size
  const [cubeSize, setCubeSize] = useState<CubeSize>(DEFAULT_CUBE_SIZE);

  // Text labels
  const [labels, setLabels] = useState<TextLabel[]>([]);
  const [newLabelText, setNewLabelText] = useState('');
  const [newLabelFontSize, setNewLabelFontSize] = useState(8);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setRawImage(dataUrl);
      setImageState('cropping');
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setRawImage(dataUrl);
      setImageState('cropping');
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle crop completion
  const handleCrop = useCallback((croppedUrl: string) => {
    setCroppedImage(croppedUrl);
    setImageState('preview');
  }, []);

  // Handle cropper cancel
  const handleCropperClose = useCallback(() => {
    if (croppedImage) {
      // User was re-cropping, go back to preview with existing crop
      setImageState('preview');
    } else {
      // First time cropping, go back to upload
      setImageState('upload');
      setRawImage(null);
    }
  }, [croppedImage]);

  // Handle re-crop
  const handleReCrop = useCallback(() => {
    setImageState('cropping');
  }, []);

  // Handle continue to 3D
  const handleContinueTo3D = useCallback(() => {
    setActiveTab('3d');
  }, []);

  // Handle change image
  const handleChangeImage = useCallback(() => {
    setImageState('upload');
    setRawImage(null);
    setCroppedImage(null);
    setShowOriginal(false);
  }, []);

  // Add text label
  const handleAddLabel = useCallback(() => {
    if (!newLabelText.trim()) return;

    const newLabel: TextLabel = {
      id: `label-${Date.now()}`,
      text: newLabelText.trim(),
      position: { x: 0, y: 0, z: cubeSize.depth / 2 + 5 },
      fontSize: newLabelFontSize,
    };

    setLabels((prev) => [...prev, newLabel]);
    setNewLabelText('');
    setSelectedLabelId(newLabel.id);
  }, [newLabelText, newLabelFontSize, cubeSize.depth]);

  // Remove text label
  const handleRemoveLabel = useCallback((id: string) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
    if (selectedLabelId === id) {
      setSelectedLabelId(null);
    }
  }, [selectedLabelId]);

  // Scale text label size
  const handleScaleLabel = useCallback((id: string, scaleFactor: number) => {
    setLabels((prev) =>
      prev.map((label) =>
        label.id === id
          ? { ...label, fontSize: Math.max(1, Math.min(50, label.fontSize * scaleFactor)) }
          : label
      )
    );
  }, []);

  // Update label fontSize directly
  const handleLabelFontSizeChange = useCallback((id: string, newSize: number) => {
    setLabels((prev) =>
      prev.map((label) =>
        label.id === id
          ? { ...label, fontSize: Math.max(1, Math.min(50, newSize)) }
          : label
      )
    );
  }, []);

  // Handle label position change from 3D viewer
  const handleLabelPositionChange = useCallback((id: string, position: { x: number; y: number; z: number }) => {
    setLabels((prev) =>
      prev.map((label) =>
        label.id === id ? { ...label, position } : label
      )
    );
  }, []);

  // Update cube size
  const handleSizeChange = useCallback((key: keyof CubeSize, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setCubeSize((prev) => ({ ...prev, [key]: numValue }));
    }
  }, []);

  const is3DReady = !!croppedImage;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{tool.title}</h1>
          <Badge variant={tool.toolType.badgeColor as 'default' | 'secondary' | 'outline'}>
            {tool.toolType.name}
          </Badge>
        </div>
        {tool.description && (
          <p className="text-muted-foreground">{tool.description}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full max-w-xs grid grid-cols-2">
          <TabsTrigger value="image" className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image
          </TabsTrigger>
          <TabsTrigger value="3d" disabled={!is3DReady} className="gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            3D Crystal
          </TabsTrigger>
        </TabsList>

        {/* Image Tab */}
        <TabsContent value="image" className="mt-0 border rounded-lg p-4 sm:p-6">
          {imageState === 'upload' && (
            <div
              role="button"
              tabIndex={0}
              className="w-full min-h-[300px] lg:min-h-[450px] border-2 border-dashed rounded-xl flex items-center justify-center text-center hover:border-primary/50 hover:bg-muted/30 motion-safe:transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  document.getElementById('image-upload')?.click();
                }
              }}
              onClick={() => document.getElementById('image-upload')?.click()}
              aria-label="Upload image area. Press Enter or click to select a file, or drag and drop an image."
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
                aria-hidden="true"
              />
              <div className="p-8 sm:p-12">
                <div className="space-y-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-medium">Drop an image here or click to upload</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports JPG, PNG, WebP
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {imageState === 'cropping' && rawImage && (
            <ImageCropper
              imageUrl={rawImage}
              isOpen={true}
              onClose={handleCropperClose}
              onCrop={handleCrop}
              embedded={true}
            />
          )}

          {imageState === 'preview' && croppedImage && (
            <div className="space-y-6">
              {/* Image Preview */}
              <div className="relative aspect-square max-w-md mx-auto rounded-xl overflow-hidden bg-muted border">
                <img
                  src={showOriginal ? rawImage! : croppedImage}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
                {showOriginal && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    Original
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                {/* Toggle Original/Cropped */}
                <div role="group" aria-label="Image view toggle" className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setShowOriginal(false)}
                    aria-pressed={!showOriginal}
                    className={`px-3 py-1.5 rounded text-sm font-medium motion-safe:transition-colors ${
                      !showOriginal ? 'bg-background shadow' : 'hover:bg-background/50'
                    }`}
                  >
                    Cropped
                  </button>
                  <button
                    onClick={() => setShowOriginal(true)}
                    aria-pressed={showOriginal}
                    className={`px-3 py-1.5 rounded text-sm font-medium motion-safe:transition-colors ${
                      showOriginal ? 'bg-background shadow' : 'hover:bg-background/50'
                    }`}
                  >
                    Original
                  </button>
                </div>

                <Button variant="outline" onClick={handleReCrop}>
                  Re-crop
                </Button>

                <Button variant="outline" onClick={handleChangeImage}>
                  Change Image
                </Button>
              </div>

              {/* Continue Button */}
              <div className="flex justify-center">
                <Button size="lg" onClick={handleContinueTo3D} className="gap-2">
                  Continue to 3D Crystal
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 3D Crystal Tab */}
        <TabsContent value="3d" className="mt-0 border rounded-lg p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* 3D Cube Viewer */}
            <div className="h-[500px] lg:h-[600px] relative rounded-lg overflow-hidden">
              <CubeViewer
                size={cubeSize}
                textureUrl={croppedImage}
                labels={labels}
                autoRotate={false}
                selectedLabelId={selectedLabelId}
                onSelectLabel={setSelectedLabelId}
                onLabelPositionChange={handleLabelPositionChange}
              />
            </div>

            {/* Right Side Panel */}
            <div className="space-y-4 lg:max-h-[600px] lg:overflow-y-auto pr-1">
              <Accordion defaultValue={['image-preview', 'crystal', 'text']} className="space-y-2">
                {/* Image Preview */}
                <AccordionItem value="image-preview" className="border rounded-lg">
                  <AccordionTrigger className="text-sm font-medium px-4">
                    Image
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-3">
                    <div className="space-y-3 px-1">
                      {croppedImage && (
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                          <img
                            src={croppedImage}
                            alt="Current"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImageState('cropping');
                            setActiveTab('image');
                          }}
                        >
                          Re-crop
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleChangeImage();
                            setActiveTab('image');
                          }}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Crystal Box Settings */}
                <AccordionItem value="crystal" className="border rounded-lg">
                  <AccordionTrigger className="text-sm font-medium px-4">
                    Crystal Box (mm)
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-3">
                    <div className="space-y-3 px-1">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Width</label>
                          <Input
                            type="number"
                            value={cubeSize.width}
                            onChange={(e) => handleSizeChange('width', e.target.value)}
                            min={10}
                            max={500}
                            className="focus-visible:ring-inset"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Height</label>
                          <Input
                            type="number"
                            value={cubeSize.height}
                            onChange={(e) => handleSizeChange('height', e.target.value)}
                            min={10}
                            max={500}
                            className="focus-visible:ring-inset"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Depth</label>
                          <Input
                            type="number"
                            value={cubeSize.depth}
                            onChange={(e) => handleSizeChange('depth', e.target.value)}
                            min={10}
                            max={500}
                            className="focus-visible:ring-inset"
                          />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Text Labels */}
                <AccordionItem value="text" className="border rounded-lg">
                  <AccordionTrigger className="text-sm font-medium px-4">
                    Add Text
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 px-3">
                    <div className="space-y-3 px-1">
                      <div className="space-y-2">
                        <Input
                          placeholder="Enter text (supports Chinese)"
                          value={newLabelText}
                          onChange={(e) => setNewLabelText(e.target.value)}
                          className="focus-visible:ring-inset"
                        />

                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Font Size</label>
                          <Input
                            type="number"
                            value={newLabelFontSize}
                            onChange={(e) => setNewLabelFontSize(parseInt(e.target.value, 10) || 8)}
                            min={1}
                            max={50}
                            className="focus-visible:ring-inset"
                          />
                        </div>

                        <Button onClick={handleAddLabel} className="w-full" disabled={!newLabelText.trim()}>
                          Add Text
                        </Button>

                        <p className="text-xs text-muted-foreground">
                          Click text in 3D view to select, then drag to position
                        </p>
                      </div>

                      {labels.length > 0 && (
                        <div className="space-y-2" role="listbox" aria-label="Text labels">
                          {labels.map((label) => (
                            <div
                              key={label.id}
                              role="option"
                              tabIndex={0}
                              aria-selected={selectedLabelId === label.id}
                              onClick={() => setSelectedLabelId(label.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setSelectedLabelId(label.id);
                                }
                              }}
                              className={`p-2 rounded text-sm cursor-pointer motion-safe:transition-colors ${
                                selectedLabelId === label.id
                                  ? 'bg-primary/20 border border-primary'
                                  : 'bg-muted hover:bg-muted/80'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="truncate flex-1 font-medium">{label.text}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveLabel(label.id);
                                  }}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  aria-label={`Remove label: ${label.text}`}
                                >
                                  <span aria-hidden="true">×</span>
                                </Button>
                              </div>
                              {/* Size controls */}
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">Size:</span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScaleLabel(label.id, 0.9);
                                  }}
                                  className="h-6 w-6 p-0"
                                  aria-label="Decrease font size"
                                >
                                  <span aria-hidden="true">−</span>
                                </Button>
                                <Input
                                  type="number"
                                  value={Math.round(label.fontSize)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleLabelFontSizeChange(label.id, parseInt(e.target.value, 10) || 8);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  min={1}
                                  max={50}
                                  className="h-6 w-14 text-center text-xs px-1 focus-visible:ring-inset"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScaleLabel(label.id, 1.1);
                                  }}
                                  className="h-6 w-6 p-0"
                                  aria-label="Increase font size"
                                >
                                  <span aria-hidden="true">+</span>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
