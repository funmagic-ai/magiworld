/**
 * @fileoverview Tool View Component
 * @fileoverview 工具视图组件
 *
 * Full-screen wrapper for individual AI tools.
 * Includes header with back button, tool name, and close button.
 * 单个AI工具的全屏包装器。
 * 包含带返回按钮、工具名称和关闭按钮的头部。
 *
 * @module components/ai/tool-view
 */

'use client';

import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import type { MagiTool } from './types';

// Tool components
import { BackgroundRemover } from './background-remover';
import { ImageGenerator } from './image-generator';
import { ImageUpscaler } from './image-upscaler';
import { ImageRerenderer } from './image-rerenderer';
import { NanobananaPro } from './nanobanana-pro';

interface ToolViewProps {
  tool: MagiTool;
}

/**
 * Tool View Component
 *
 * Renders a full-screen view of a selected tool with navigation controls.
 */
export function ToolView({ tool }: ToolViewProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push('/magi');
  };

  const handleClose = () => {
    router.push('/magi');
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <HugeiconsIcon
              icon={ArrowLeft01Icon}
              className="h-4 w-4"
              strokeWidth={2}
            />
            <span className="hidden sm:inline">Back</span>
          </Button>

          {/* Center: Tool name */}
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={tool.icon}
              className="h-5 w-5 text-primary"
              strokeWidth={2}
            />
            <h1 className="text-lg font-semibold">{tool.name}</h1>
          </div>

          {/* Right: Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-9 w-9"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              className="h-5 w-5"
              strokeWidth={2}
            />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>

      {/* Tool Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="max-w-3xl mx-auto">
            <ToolComponent toolId={tool.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Render the appropriate tool component based on toolId
 */
function ToolComponent({ toolId }: { toolId: string }) {
  switch (toolId) {
    case 'background-remove':
      return <BackgroundRemover />;
    case 'image-generate':
      return <ImageGenerator />;
    case 'image-upscale':
      return <ImageUpscaler />;
    case 'image-rerender':
      return <ImageRerenderer />;
    case 'nanobanana':
      return <NanobananaPro />;
    default:
      return (
        <div className="text-center py-12 text-muted-foreground">
          Tool not found
        </div>
      );
  }
}
