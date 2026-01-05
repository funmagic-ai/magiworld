'use client';

import { ActiveToggle } from './active-toggle';
import { toggleBannerActive } from '@/lib/actions/banners';

interface BannerActiveToggleProps {
  id: string;
  isActive: boolean;
  disabled?: boolean;
}

export function BannerActiveToggle({ id, isActive, disabled }: BannerActiveToggleProps) {
  return (
    <ActiveToggle
      id={id}
      isActive={isActive}
      onToggle={toggleBannerActive}
      disabled={disabled}
    />
  );
}
