/**
 * @fileoverview Media Card Component
 * @fileoverview 媒体卡片组件
 *
 * Memoized component for individual media items in the library grid.
 * 媒体库网格中单个媒体项目的记忆化组件。
 *
 * @module components/library/media-card
 */

'use client';

import { memo, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, Move01Icon, Download04Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/lib/actions/library';

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function formatAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  const commonRatios: Record<string, string> = {
    '16:9': '16:9', '9:16': '9:16', '4:3': '4:3', '3:4': '3:4',
    '1:1': '1:1', '3:2': '3:2', '2:3': '2:3', '21:9': '21:9',
  };

  const simplified = `${ratioW}:${ratioH}`;
  if (commonRatios[simplified]) return simplified;
  return (width / height).toFixed(2);
}

export type MediaCardProps = {
  item: MediaItem;
  isSelecting: boolean;
  isSelected: boolean;
  dimensions?: { width: number; height: number } | null;
  onToggleSelection: (id: string) => void;
  onImageLoad: (id: string, img: HTMLImageElement) => void;
  onMove: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
};

export const MediaCard = memo(function MediaCard({
  item,
  isSelecting,
  isSelected,
  dimensions,
  onToggleSelection,
  onImageLoad,
  onMove,
  onDelete,
}: MediaCardProps) {
  const handleClick = useCallback(() => {
    if (isSelecting) {
      onToggleSelection(item.id);
    }
  }, [isSelecting, onToggleSelection, item.id]);

  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      onImageLoad(item.id, e.currentTarget);
    },
    [onImageLoad, item.id]
  );

  const handleMoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onMove(item);
    },
    [onMove, item]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(item);
    },
    [onDelete, item]
  );

  const dims = dimensions || (item.width && item.height ? { width: item.width, height: item.height } : null);

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card overflow-hidden shadow-sm',
        isSelecting && isSelected && 'ring-2 ring-primary'
      )}
      onClick={handleClick}
    >
      {/* Selection Checkbox */}
      {isSelecting && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelection(item.id)}
          />
        </div>
      )}

      {/* Thumbnail Area */}
      <div className="aspect-square bg-muted relative">
        {item.mimeType?.startsWith('image/') ? (
          <img
            src={item.url}
            alt={item.alt || item.filename}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
          />
        ) : item.mimeType?.startsWith('video/') ? (
          <video src={item.url} className="w-full h-full object-cover" muted />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
        )}

        {/* Hover Actions (when not selecting) */}
        {!isSelecting && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity flex items-center justify-center gap-2">
            <a
              href={item.url}
              download={item.filename}
              className="rounded-full bg-white p-2.5 text-gray-700 hover:bg-primary hover:text-white motion-safe:transition-colors"
              title="Download"
              onClick={(e) => e.stopPropagation()}
              aria-label={`Download ${item.filename}`}
            >
              <HugeiconsIcon icon={Download04Icon} className="h-4 w-4" strokeWidth={2} />
            </a>
            <button
              className="rounded-full bg-white p-2.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900 motion-safe:transition-colors"
              title="Move to folder"
              onClick={handleMoveClick}
              aria-label={`Move ${item.filename}`}
            >
              <HugeiconsIcon icon={Move01Icon} className="h-4 w-4" strokeWidth={2} />
            </button>
            <button
              className="rounded-full bg-white p-2.5 text-gray-700 hover:bg-destructive hover:text-white motion-safe:transition-colors"
              title="Delete"
              onClick={handleDeleteClick}
              aria-label={`Delete ${item.filename}`}
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* File Metadata */}
      <div className="p-3">
        <p className="font-medium text-sm truncate" title={item.filename}>
          {item.filename}
        </p>
        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{item.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'}</span>
          <span>{formatBytes(item.size)}</span>
        </div>
        {item.mimeType?.startsWith('image/') && dims && (
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{dims.width} × {dims.height}</span>
            <span>{formatAspectRatio(dims.width, dims.height)}</span>
          </div>
        )}
      </div>
    </div>
  );
});
