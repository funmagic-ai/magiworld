/**
 * @fileoverview Folder Picker Component
 * @fileoverview 文件夹选择器组件
 *
 * Memoized component for selecting a target folder in move dialogs.
 * 移动对话框中用于选择目标文件夹的记忆化组件。
 *
 * @module components/library/folder-picker
 */

'use client';

import { memo, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Home01Icon, FolderOpenIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import type { Folder } from '@/lib/actions/library';

export type FolderPickerProps = {
  folders: Folder[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export const FolderPicker = memo(function FolderPicker({
  folders,
  selectedId,
  onSelect,
}: FolderPickerProps) {
  const handleRootClick = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto" role="listbox" aria-label="Select folder">
      <button
        role="option"
        aria-selected={selectedId === null}
        className={cn(
          'w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left',
          selectedId === null && 'bg-muted'
        )}
        onClick={handleRootClick}
      >
        <HugeiconsIcon icon={Home01Icon} className="h-4 w-4" strokeWidth={2} />
        Root
      </button>
      {folders.map((folder) => (
        <FolderPickerItem
          key={folder.id}
          folder={folder}
          isSelected={selectedId === folder.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});

type FolderPickerItemProps = {
  folder: Folder;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
};

const FolderPickerItem = memo(function FolderPickerItem({
  folder,
  isSelected,
  onSelect,
}: FolderPickerItemProps) {
  const handleClick = useCallback(() => {
    onSelect(folder.id);
  }, [onSelect, folder.id]);

  return (
    <button
      role="option"
      aria-selected={isSelected}
      className={cn(
        'w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left',
        isSelected && 'bg-muted'
      )}
      onClick={handleClick}
    >
      <HugeiconsIcon icon={FolderOpenIcon} className="h-4 w-4" strokeWidth={2} />
      {folder.name}
    </button>
  );
});
