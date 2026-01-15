/**
 * @fileoverview Folder Card Component
 * @fileoverview 文件夹卡片组件
 *
 * Memoized component for individual folders in the library grid.
 * 媒体库网格中单个文件夹的记忆化组件。
 *
 * @module components/library/folder-card
 */

'use client';

import { memo, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import { FolderOpenIcon, Delete02Icon } from '@hugeicons/core-free-icons';
import type { FolderWithStats } from '@/lib/actions/library';

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export type FolderCardProps = {
  folder: FolderWithStats;
  onDelete: (folder: FolderWithStats) => void;
};

export const FolderCard = memo(function FolderCard({
  folder,
  onDelete,
}: FolderCardProps) {
  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(folder);
    },
    [onDelete, folder]
  );

  return (
    <Card className="group relative p-4 hover:bg-muted/50 cursor-pointer">
      <Link
        href={`/library?folder=${folder.id}`}
        className="flex flex-col items-center gap-2"
      >
        <HugeiconsIcon
          icon={FolderOpenIcon}
          className="h-12 w-12 text-muted-foreground"
          strokeWidth={1.5}
        />
        <span className="text-sm font-medium truncate max-w-full">
          {folder.name}
        </span>
        <span className="text-xs text-muted-foreground text-center">
          {folder.subfolderCount > 0 &&
            `${folder.subfolderCount} folder${folder.subfolderCount !== 1 ? 's' : ''}`}
          {folder.subfolderCount > 0 && folder.fileCount > 0 && ' · '}
          {folder.fileCount > 0 &&
            `${folder.fileCount} file${folder.fileCount !== 1 ? 's' : ''}`}
          {folder.subfolderCount === 0 && folder.fileCount === 0 && 'Empty'}
        </span>
        {folder.totalSize > 0 && (
          <span className="text-xs text-muted-foreground">
            {formatBytes(folder.totalSize)}
          </span>
        )}
      </Link>
      {/* Delete Folder Button (on hover) */}
      <button
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive"
        onClick={handleDeleteClick}
        title="Delete folder"
        aria-label={`Delete folder ${folder.name}`}
      >
        <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" strokeWidth={2} />
      </button>
    </Card>
  );
});
