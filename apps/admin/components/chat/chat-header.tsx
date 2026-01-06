'use client';

/**
 * @fileoverview Chat Header Component
 *
 * Header section with model selector and stop button.
 * Allows switching between different AI providers and models.
 *
 * @module apps/admin/components/chat/chat-header
 */

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HugeiconsIcon } from '@hugeicons/react';
import { StopIcon, ArrowExpandDiagonal01Icon, ArrowShrink02Icon } from '@hugeicons/core-free-icons';
import {
  CHAT_MODELS,
  getProviderName,
  getModelsByProvider,
  type ChatModel,
} from '@/lib/ai/chat-providers';

interface ChatHeaderProps {
  model?: ChatModel;
  onModelChange: (modelId: string | null) => void;
  onStop?: () => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
}

export function ChatHeader({
  model,
  onModelChange,
  onStop,
  isMaximized,
  onToggleMaximize,
}: ChatHeaderProps) {
  const modelsByProvider = getModelsByProvider();

  return (
    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
      <Select value={model?.id} onValueChange={onModelChange}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(modelsByProvider) as Array<keyof typeof modelsByProvider>).map(
            (provider) => (
              <SelectGroup key={provider}>
                <SelectLabel>{getProviderName(provider)}</SelectLabel>
                {modelsByProvider[provider].map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            )
          )}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        {onStop && (
          <Button variant="outline" size="sm" onClick={onStop}>
            <HugeiconsIcon icon={StopIcon} className="h-4 w-4 mr-1" strokeWidth={2} />
            Stop
          </Button>
        )}
        {onToggleMaximize && (
          <Button variant="ghost" size="icon" onClick={onToggleMaximize} title={isMaximized ? 'Exit fullscreen' : 'Fullscreen'}>
            <HugeiconsIcon
              icon={isMaximized ? ArrowShrink02Icon : ArrowExpandDiagonal01Icon}
              className="h-4 w-4"
              strokeWidth={2}
            />
          </Button>
        )}
      </div>
    </div>
  );
}
