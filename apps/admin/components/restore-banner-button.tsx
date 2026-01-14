/**
 * @fileoverview Restore Banner Button Component
 * @fileoverview 恢复横幅按钮组件
 *
 * Button to restore a soft-deleted banner from the trash.
 * Uses React transitions for optimistic UI updates.
 * 用于从回收站恢复软删除横幅的按钮。
 * 使用React transitions实现乐观UI更新。
 *
 * @module components/restore-banner-button
 */

'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { restoreBanner } from '@/lib/actions/banners';

interface RestoreBannerButtonProps {
  id: string;
}

export function RestoreBannerButton({ id }: RestoreBannerButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      await restoreBanner(id);
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestore}
      disabled={isPending}
      className="w-full"
    >
      {isPending ? 'Restoring...' : 'Restore'}
    </Button>
  );
}
