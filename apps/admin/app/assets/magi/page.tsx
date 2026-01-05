'use client';

/**
 * @fileoverview Magi - AI Asset Assistant
 *
 * AI-powered chatbot interface to help operators process and create
 * banner assets. Uses various AI model APIs for image/video processing.
 *
 * Features:
 * - Chat-based interaction with Magi assistant
 * - Image upload and processing
 * - Video asset handling
 * - Integration with multiple AI model APIs
 * - Process selected files from Library
 *
 * @module apps/admin/app/assets/magi/page
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiChat02Icon, SentIcon, AttachmentIcon } from '@hugeicons/core-free-icons';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export default function MagiPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Magi, your AI asset assistant. I can help you process images and videos for your banners and creative assets. What would you like to create today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate assistant response (placeholder for AI integration)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a placeholder response. AI model integration coming soon! I will be able to help you with:\n\n- Resizing images for banner dimensions\n- Removing backgrounds\n- Generating image variations\n- Adding text overlays\n- Processing video assets',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Page Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <HugeiconsIcon icon={AiChat02Icon} className="h-5 w-5 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Magi</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered assistant for processing creative assets
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-60 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </Card>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-muted p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce" />
                <div className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:0.1s]" />
                <div className="h-2 w-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:0.2s]" />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            title="Attach file"
          >
            <HugeiconsIcon icon={AttachmentIcon} className="h-4 w-4" strokeWidth={2} />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe what you'd like to create..."
            className="min-h-[44px] max-h-32 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0"
            disabled={!input.trim() || isLoading}
          >
            <HugeiconsIcon icon={SentIcon} className="h-4 w-4" strokeWidth={2} />
          </Button>
        </form>
      </div>
    </div>
  );
}
