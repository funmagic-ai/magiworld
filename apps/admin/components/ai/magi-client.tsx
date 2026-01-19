'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Image01Icon,
  AiGenerativeIcon,
  ImageUploadIcon,
  PaintBrushIcon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToolsGrid } from './tools-grid';
import { ToolView } from './tool-view';
import { MagiTasksList, type TaskItem } from './magi-tasks-list';
import type { MagiTool } from './types';

const TOOLS: MagiTool[] = [
  {
    id: 'background-remove',
    name: 'Remove Background',
    description: 'Remove backgrounds from images using AI',
    icon: Image01Icon,
    category: 'image',
    provider: 'fal_ai',
    model: 'bria/background/remove',
  },
  {
    id: 'image-generate',
    name: 'Generate Image',
    description: 'Create images from text prompts',
    icon: AiGenerativeIcon,
    category: 'image',
    provider: 'fal_ai',
    model: 'flux/dev',
  },
  {
    id: 'image-upscale',
    name: 'Upscale Image',
    description: 'Enhance image resolution with AI',
    icon: ImageUploadIcon,
    category: 'image',
    provider: 'fal_ai',
    model: 'clarity-upscaler',
  },
  {
    id: 'image-rerender',
    name: 'Rerender Image',
    description: 'Transform images with AI styles',
    icon: PaintBrushIcon,
    category: 'image',
    provider: 'fal_ai',
    model: 'creative-upscaler',
  },
  {
    id: 'nanobanana',
    name: 'Nanobanana Pro',
    description: 'Generate images with Gemini',
    icon: SparklesIcon,
    category: 'image',
    provider: 'google',
    model: 'gemini-2.0-flash-exp',
  },
];

interface MagiClientProps {
  tasks: TaskItem[];
}

export function MagiClient({ tasks }: MagiClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const toolId = searchParams.get('tool');
  const tab = searchParams.get('tab') || 'tools';

  const selectedTool = toolId ? TOOLS.find((t) => t.id === toolId) : null;

  // If a tool is selected, show full-screen tool view
  if (selectedTool) {
    return <ToolView tool={selectedTool} />;
  }

  const handleTabChange = (value: string | null) => {
    if (!value) return;
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'tools') {
      params.delete('tab');
    } else {
      params.set('tab', value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Magi</h1>
          <p className="text-muted-foreground">AI-powered tools and task management</p>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList variant="line" className="mb-6">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="tools">
            <ToolsGrid tools={TOOLS} />
          </TabsContent>

          <TabsContent value="tasks">
            <MagiTasksList tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
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
