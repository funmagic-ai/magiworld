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
