'use client';

/**
 * @fileoverview Magi - AI Tools Dashboard
 *
 * Multi-tool interface for AI-powered asset processing.
 * Operators can quickly select and use different AI tools.
 *
 * @module apps/admin/app/magi/page
 */

import { useState } from 'react';
import {
  Image01Icon,
  AiGenerativeIcon,
  ImageUploadIcon,
  PaintBrushIcon,
} from '@hugeicons/core-free-icons';
import {
  MagiLayout,
  ToolHeader,
  type MagiTool,
  BackgroundRemover,
  ImageGenerator,
  ImageUpscaler,
  ImageRerenderer,
} from '@/components/ai';

// Tool definitions
const TOOLS: MagiTool[] = [
  {
    id: 'background-remove',
    name: 'Remove Background',
    description: 'Remove backgrounds from images',
    icon: Image01Icon,
    category: 'image',
  },
  {
    id: 'image-generate',
    name: 'Generate Image',
    description: 'Create images from text prompts',
    icon: AiGenerativeIcon,
    category: 'image',
  },
  {
    id: 'image-upscale',
    name: 'Upscale Image',
    description: 'Enhance image resolution',
    icon: ImageUploadIcon,
    category: 'image',
  },
  {
    id: 'image-rerender',
    name: 'Rerender Image',
    description: 'Transform image with AI',
    icon: PaintBrushIcon,
    category: 'image',
  },
];

export default function MagiPage() {
  const [selectedToolId, setSelectedToolId] = useState('background-remove');

  const selectedTool = TOOLS.find((t) => t.id === selectedToolId) || TOOLS[0];

  const renderTool = () => {
    switch (selectedToolId) {
      case 'background-remove':
        return <BackgroundRemover />;
      case 'image-generate':
        return <ImageGenerator />;
      case 'image-upscale':
        return <ImageUpscaler />;
      case 'image-rerender':
        return <ImageRerenderer />;
      default:
        return null;
    }
  };

  return (
    <MagiLayout
      tools={TOOLS}
      selectedToolId={selectedToolId}
      onSelectTool={setSelectedToolId}
    >
      <ToolHeader tool={selectedTool} />
      {renderTool()}
    </MagiLayout>
  );
}
