'use client';

/**
 * @fileoverview Chat Message Component
 *
 * Displays a single chat message with appropriate styling
 * based on the message role (user or assistant).
 *
 * @module apps/admin/components/chat/chat-message
 */

import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message?: {
    role: string;
    content: string;
  };
  loading?: boolean;
}

export function ChatMessage({ message, loading }: ChatMessageProps) {
  if (loading) {
    return (
      <div className="flex gap-3 justify-start">
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
            <div
              className="h-2 w-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className="h-2 w-2 bg-primary rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!message) return null;

  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg p-3 whitespace-pre-wrap',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
