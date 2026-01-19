/**
 * @fileoverview Tools Grid Component
 * @fileoverview 工具网格组件
 *
 * Displays a responsive grid of AI tool cards.
 * Clicking a card navigates to the tool view.
 * 显示AI工具卡片的响应式网格。
 * 点击卡片导航到工具视图。
 *
 * @module components/ai/tools-grid
 */

'use client';

import { useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wrench01Icon } from '@hugeicons/core-free-icons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MagiTool } from './types';

interface ToolsGridProps {
  tools: MagiTool[];
}

/** Format provider slug for display */
function formatProvider(provider: string): string {
  const providerNames: Record<string, string> = {
    fal_ai: 'Fal.ai',
    google: 'Google',
    openai: 'OpenAI',
  };
  return providerNames[provider] || provider;
}

/** Get provider badge classes */
function getProviderClasses(provider: string): string {
  const classes: Record<string, string> = {
    fal_ai: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    google: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    openai: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };
  return classes[provider] || 'bg-secondary text-secondary-foreground';
}

/**
 * Tools Grid Component
 *
 * Renders a grid of tool cards that users can click to open each tool.
 */
export function ToolsGrid({ tools }: ToolsGridProps) {
  const router = useRouter();

  const handleToolClick = (toolId: string) => {
    router.push(`/magi?tool=${toolId}`);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-6 sm:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <HugeiconsIcon
              icon={Wrench01Icon}
              className="h-6 w-6 text-primary"
              strokeWidth={2}
            />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Magi AI Tools</h1>
            <p className="text-muted-foreground">
              Select a tool to get started
            </p>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="max-w-4xl mx-auto">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onClick={() => handleToolClick(tool.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ToolCardProps {
  tool: MagiTool;
  onClick: () => void;
}

/**
 * Individual Tool Card
 */
function ToolCard({ tool, onClick }: ToolCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-[box-shadow,transform] duration-200',
        'hover:ring-2 hover:ring-primary/50 hover:shadow-lg',
        'active:scale-[0.98]'
      )}
      onClick={onClick}
    >
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <HugeiconsIcon
            icon={tool.icon}
            className="h-7 w-7 text-primary"
            strokeWidth={2}
          />
        </div>
        <CardTitle className="text-base">{tool.name}</CardTitle>
        <CardDescription className="text-xs line-clamp-2">
          {tool.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 pb-4">
        <div className="flex flex-col items-center gap-1">
          <span className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
            getProviderClasses(tool.provider)
          )}>
            {formatProvider(tool.provider)}
          </span>
          <span className="text-[10px] text-muted-foreground truncate max-w-full">
            {tool.model}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
