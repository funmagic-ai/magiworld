/**
 * @fileoverview Prompt Editor Component
 * @fileoverview 提示词编辑器组件
 *
 * Collapsible prompt editor with preset templates.
 * Used for AI tools that require text prompts with sensible defaults.
 * 可折叠的提示词编辑器，带有预设模板。
 * 用于需要文本提示词的AI工具，提供合理的默认值。
 *
 * @module components/ai/prompt-editor
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Edit02Icon, SparklesIcon } from '@hugeicons/core-free-icons';

export interface PromptPreset {
  id: string;
  label: string;
  prompt: string;
}

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  presets?: PromptPreset[];
  placeholder?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  defaultExpanded?: boolean;
}

export function PromptEditor({
  value,
  onChange,
  presets = [],
  placeholder = 'Enter your prompt...',
  label = 'Prompt',
  description,
  disabled,
  defaultExpanded = false,
}: PromptEditorProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(
    presets.length > 0 ? presets[0].id : null
  );

  // If not expanded, show collapsed view with current prompt preview
  const activePreset = presets.find((p) => p.id === selectedPreset);
  const displayPrompt = value || activePreset?.prompt || '';
  const isCustomized = value && activePreset && value !== activePreset.prompt;

  const handlePresetSelect = (preset: PromptPreset) => {
    setSelectedPreset(preset.id);
    onChange(preset.prompt);
  };

  const handleReset = () => {
    if (activePreset) {
      onChange(activePreset.prompt);
    }
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger
          disabled={disabled}
          render={
            <button
              type="button"
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-t-lg"
            />
          }
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={SparklesIcon}
                className="h-4 w-4 text-primary"
                strokeWidth={2}
              />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{label}</span>
                {isCustomized && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                    Customized
                  </span>
                )}
              </div>
              {!isOpen && displayPrompt && (
                <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                  {displayPrompt}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={Edit02Icon}
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={2}
            />
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              strokeWidth={2}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}

            {/* Preset Buttons */}
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    variant={selectedPreset === preset.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePresetSelect(preset)}
                    disabled={disabled}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Prompt Textarea */}
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              rows={4}
              disabled={disabled}
              className="resize-none"
            />

            {/* Reset Button */}
            {isCustomized && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={disabled}
                >
                  Reset to preset
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
