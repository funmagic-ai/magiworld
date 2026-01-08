'use client';

/**
 * @fileoverview Magi Client Component
 *
 * Main client component for the Magi AI Tools page.
 * Handles URL-based routing between grid view and tool view.
 *
 * URL Pattern:
 * - /magi              → Tools grid
 * - /magi?tool=xxx     → Tool view (maximized)
 *
 * @module apps/admin/components/ai/magi-client
 */

import { useSearchParams } from 'next/navigation';
import {
  Image01Icon,
  AiGenerativeIcon,
  ImageUploadIcon,
  PaintBrushIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { ToolsGrid } from './tools-grid';
import { ToolView } from './tool-view';
import type { MagiTool } from './types';

/**
 * Available tools configuration
 */
const TOOLS: MagiTool[] = [
  {
    id: 'background-remove',
    name: 'Remove Background',
    description: 'Remove backgrounds from images using AI',
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
    description: 'Enhance image resolution with AI',
    icon: ImageUploadIcon,
    category: 'image',
  },
  {
    id: 'image-rerender',
    name: 'Rerender Image',
    description: 'Transform images with AI styles',
    icon: PaintBrushIcon,
    category: 'image',
  },
  {
    id: 'nanobanana',
    name: 'Nanobanana Pro',
    description: 'Generate images with Gemini 3 Pro',
    icon: SparklesIcon,
    category: 'image',
  },
];

/**
 * Magi Client Component
 *
 * Routes between grid view and tool view based on URL query param.
 */
export function MagiClient() {
  const searchParams = useSearchParams();
  const toolId = searchParams.get('tool');

  // Find the selected tool
  const selectedTool = toolId ? TOOLS.find((t) => t.id === toolId) : null;

  // If no tool selected or tool not found, show grid
  if (!selectedTool) {
    return <ToolsGrid tools={TOOLS} />;
  }

  // Show tool view
  return <ToolView tool={selectedTool} />;
}

/**
 * Loading skeleton for the grid view
 */
export function MagiClientSkeleton() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
      {/* Header skeleton */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-12 w-12 rounded-xl bg-muted animate-pulse" />
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Grid skeleton */}
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
