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
