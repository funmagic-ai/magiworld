'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

export type GenerationStatus = 'loading' | 'complete' | 'error';

export interface Generation {
  id: string;
  status: GenerationStatus;
  progress: number;
  imageUrl?: string;
  prompt?: string;
  createdAt: Date;
}

interface GenerationHistoryProps {
  generations: Generation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function GenerationHistory({
  generations,
  selectedId,
  onSelect,
  onCancel,
  onDelete,
  className,
}: GenerationHistoryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  if (generations.length === 0) {
    return (
      <div className={cn('flex flex-col w-full', className)}>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">History</h4>
        <div className="flex items-center justify-center w-full h-20 text-muted-foreground text-sm border rounded-lg bg-muted/20">
          No generations yet
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col w-full', className)}>
      <h4 className="text-xs font-medium text-muted-foreground mb-2">History</h4>
      <div className="w-full flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {generations.map((gen, index) => (
          <div
            key={gen.id}
            onClick={() => onSelect(gen.id)}
            className={cn(
              'relative flex-shrink-0 w-20 h-20 overflow-hidden rounded-lg transition-all cursor-pointer group border-2',
              selectedId === gen.id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-transparent hover:border-muted-foreground/50',
              index === 0 && 'animate-in fade-in-0 slide-in-from-left-4 duration-500'
            )}
            role="button"
            tabIndex={0}
            aria-label={`Generation ${index + 1}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(gen.id);
              }
            }}
          >
            {gen.status === 'loading' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50 rounded-lg">
                <span className="text-sm font-mono font-semibold text-foreground/80">
                  {Math.round(gen.progress)}%
                </span>
                {onCancel && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancel(gen.id);
                    }}
                    className="mt-1 text-[10px] px-2 py-0.5 bg-muted hover:bg-primary text-muted-foreground hover:text-primary-foreground transition-all rounded"
                    aria-label="Cancel generation"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : gen.status === 'error' ? (
              <div className="absolute inset-0 bg-muted/50 flex items-center justify-center rounded-lg">
                <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6 text-destructive" />
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(gen.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-background/70 hover:bg-destructive text-muted-foreground hover:text-destructive-foreground opacity-100 transition-all rounded z-10"
                    aria-label="Delete generation"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(gen.id);
                    }}
                    className="absolute top-1 right-1 p-1 bg-background/70 hover:bg-destructive text-muted-foreground hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-all rounded z-10"
                    aria-label="Delete generation"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" />
                  </button>
                )}
                {gen.imageUrl && (
                  <>
                    <Image
                      src={gen.imageUrl}
                      alt={gen.prompt || 'Generated image'}
                      fill
                      sizes="80px"
                      className={cn(
                        'object-cover transition-opacity duration-300 rounded-lg',
                        loadedImages.has(gen.id) ? 'opacity-100' : 'opacity-0'
                      )}
                      onLoad={() => {
                        setLoadedImages((prev) => new Set(prev).add(gen.id));
                      }}
                    />
                    {!loadedImages.has(gen.id) && (
                      <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
