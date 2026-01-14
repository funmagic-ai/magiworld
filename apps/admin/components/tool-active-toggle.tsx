/**
 * @fileoverview Tool Active Toggle Component
 * @fileoverview 工具激活状态切换组件
 *
 * Specialized toggle for tool active status in list views.
 * Wraps ActiveToggle with tool-specific toggle action.
 * 用于列表视图中工具激活状态的专用切换组件。
 * 包装ActiveToggle并使用工具专用的切换操作。
 *
 * @module components/tool-active-toggle
 */

'use client';

import { ActiveToggle } from './active-toggle';
import { toggleToolActive } from '@/lib/actions/tools';

interface ToolActiveToggleProps {
  id: string;
  isActive: boolean;
  disabled?: boolean;
}

export function ToolActiveToggle({ id, isActive, disabled }: ToolActiveToggleProps) {
  return (
    <ActiveToggle
      id={id}
      isActive={isActive}
      onToggle={toggleToolActive}
      disabled={disabled}
    />
  );
}
