/**
 * @fileoverview Restore Tool Button Component
 * @fileoverview 恢复工具按钮组件
 *
 * Button to restore a soft-deleted AI tool from the trash.
 * Uses React transitions for optimistic UI updates.
 * 用于从回收站恢复软删除AI工具的按钮。
 * 使用React transitions实现乐观UI更新。
 *
 * @module components/restore-tool-button
 */

'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { restoreTool } from '@/lib/actions/tools';

interface RestoreToolButtonProps {
  id: string;
}

export function RestoreToolButton({ id }: RestoreToolButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      await restoreTool(id);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestore}
      disabled={isPending}
    >
      {isPending ? 'Restoring...' : 'Restore'}
    </Button>
  );
}
