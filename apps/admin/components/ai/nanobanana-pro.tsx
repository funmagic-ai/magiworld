'use client';

/**
 * @fileoverview Nanobanana Pro Component
 *
 * Chat-like UI for Gemini 3 Pro image generation.
 * Supports multi-round conversations with per-message options.
 *
 * @module apps/admin/components/ai/nanobanana-pro
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SentIcon,
  Loading03Icon,
  Image01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface NanobananaOptions {
  aspectRatio: string;
  imageSize: string;
}

interface GeneratedImage {
  dataUrl: string;
  mediaType: string;
}

interface UploadedImage {
  id: string;
  dataUrl: string;
  base64: string;
  mediaType: string;
}

interface NanobananaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: {
    prompt?: string;
    options?: NanobananaOptions;
    uploadedImages?: UploadedImage[];
    text?: string;
    images?: GeneratedImage[];
    error?: string;
  };
  timestamp: Date;
}

// ============================================
// Options Config
// ============================================

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '4:3', label: '4:3 (Landscape)' },
  { value: '9:16', label: '9:16 (Vertical)' },
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '21:9', label: '21:9 (Ultra-wide)' },
];

const IMAGE_SIZE_OPTIONS = [
  { value: '1K', label: '1K' },
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];


// ============================================
// Component
// ============================================

export function NanobananaPro() {
  const [messages, setMessages] = useState<NanobananaMessage[]>([]);
  const [input, setInput] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('2K');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          // Extract base64 from data URL
          const base64 = dataUrl.split(',')[1];
          setUploadedImages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              dataUrl,
              base64,
              mediaType: file.type,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    []
  );

  // Remove uploaded image
  const removeUploadedImage = useCallback((id: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedInput = input.trim();
      if (!trimmedInput || isLoading) return;

      const options: NanobananaOptions = {
        aspectRatio,
        imageSize,
      };
      const currentImages = [...uploadedImages];

      // Add user message
      const userMessage: NanobananaMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: {
          prompt: trimmedInput,
          options,
          uploadedImages: currentImages.length > 0 ? currentImages : undefined,
        },
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setUploadedImages([]);
      setIsLoading(true);

      // Prepare input images for API
      const inputImages =
        currentImages.length > 0
          ? currentImages.map((img) => ({
              base64: img.base64,
              mediaType: img.mediaType,
            }))
          : undefined;

      try {
        const res = await fetch('/api/ai/nanobanana', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: trimmedInput, options, inputImages }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || data.error || 'Generation failed');
        }

        // Add assistant message
        const assistantMessage: NanobananaMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: {
            text: data.text || '',
            images: data.images || [],
          },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        // Add error message
        const errorMessage: NanobananaMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: {
            error: err instanceof Error ? err.message : 'Unknown error',
          },
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, aspectRatio, imageSize, isLoading, uploadedImages]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 py-4">
          {messages.length === 0 ? (
            <EmptyState />
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && <LoadingBubble />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="py-4 space-y-3">
          {/* Options Row */}
          <div className="flex items-center gap-3">
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={imageSize} onValueChange={setImageSize}>
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_SIZE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground">
              Gemini 3 Pro Image
            </span>
          </div>

          {/* Uploaded Images Preview */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {uploadedImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.dataUrl}
                    alt="Uploaded"
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removeUploadedImage(img.id)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Image upload button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="h-11 w-11 rounded-xl flex-shrink-0"
            >
              <HugeiconsIcon icon={Image01Icon} className="h-5 w-5" strokeWidth={1.5} />
            </Button>

            <div className="flex-1">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to generate..."
                className="min-h-[44px] max-h-36 resize-none rounded-xl py-3 text-[15px] bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                disabled={isLoading}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-11 w-11 rounded-xl flex-shrink-0"
            >
              {isLoading ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  className="h-5 w-5 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={SentIcon} className="h-5 w-5" strokeWidth={1.5} />
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <span className="text-2xl">🍌</span>
        </div>
        <p className="text-xl font-medium text-foreground">Nanobanana Pro</p>
        <p className="text-sm max-w-sm">
          Generate or edit images with Gemini 3 Pro. Upload images to transform
          them, or describe what you want to create.
        </p>
      </div>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="flex gap-4 justify-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex-shrink-0 flex items-center justify-center">
        <span className="text-white text-xs">🍌</span>
      </div>
      <div className="bg-muted/60 backdrop-blur-sm rounded-2xl px-5 py-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 bg-primary/60 rounded-full animate-bounce" />
          <div
            className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: '0.15s' }}
          />
          <div
            className="h-2 w-2 bg-primary/60 rounded-full animate-bounce"
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: NanobananaMessage }) {
  const isUser = message.role === 'user';
  const { prompt, options, uploadedImages, text, images, error } = message.content;

  return (
    <div className={cn('flex gap-4', isUser ? 'justify-end' : 'justify-start')}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex-shrink-0 flex items-center justify-center">
          <span className="text-white text-xs">🍌</span>
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] rounded-2xl shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground px-5 py-3'
            : 'bg-muted/60 backdrop-blur-sm px-5 py-4'
        )}
      >
        {/* User message: show prompt, uploaded images, and options */}
        {isUser && (
          <div>
            {/* Show uploaded images */}
            {uploadedImages && uploadedImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {uploadedImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.dataUrl}
                    alt="Uploaded"
                    className="h-20 w-20 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
            {prompt && (
              <p className="text-[15px] whitespace-pre-wrap">{prompt}</p>
            )}
            {options && (
              <p className="text-xs opacity-70 mt-2">
                {options.aspectRatio} · {options.imageSize}
              </p>
            )}
          </div>
        )}

        {/* Assistant message: show images and text */}
        {!isUser && (
          <>
            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            {images && images.length > 0 && (
              <div
                className={cn(
                  'grid gap-2',
                  text ? 'mb-3' : '',
                  images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                )}
              >
                {images.map((img, index) => (
                  <a
                    key={index}
                    href={img.dataUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl aspect-square"
                  >
                    <img
                      src={img.dataUrl}
                      alt={`Generated image ${index + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            )}

            {text && (
              <p className="text-[15px] text-foreground whitespace-pre-wrap">
                {text}
              </p>
            )}

            {!error && !images?.length && !text && (
              <p className="text-muted-foreground italic text-sm">
                No content generated
              </p>
            )}
          </>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0 flex items-center justify-center">
          <span className="text-white text-xs font-medium">You</span>
        </div>
      )}
    </div>
  );
}
