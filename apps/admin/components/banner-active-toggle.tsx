/**
 * @fileoverview Banner Active Toggle Component
 * @fileoverview 横幅激活状态切换组件
 *
 * Specialized toggle for banner active status in list views.
 * Wraps ActiveToggle with banner-specific toggle action.
 * 用于列表视图中横幅激活状态的专用切换组件。
 * 包装ActiveToggle并使用横幅专用的切换操作。
 *
 * @module components/banner-active-toggle
 */

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
