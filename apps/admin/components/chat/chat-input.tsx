'use client';

/**
 * @fileoverview Chat Input Component
 *
 * Input area for composing and sending chat messages.
 * Supports Enter to send, Shift+Enter for new line.
 *
 * @module apps/admin/components/chat/chat-input
 */

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { SentIcon } from '@hugeicons/core-free-icons';

interface ChatInputProps {
  input: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}

export function ChatInput({ input, onChange, onSubmit, disabled }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-3 border-t">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-32 resize-none"
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled || !input.trim()} size="icon">
          <HugeiconsIcon icon={SentIcon} className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
