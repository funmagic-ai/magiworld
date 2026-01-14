/**
 * @fileoverview Active Toggle Component
 * @fileoverview 激活状态切换组件
 *
 * Generic toggle switch for enabling/disabling items.
 * Accepts a callback for the actual toggle action.
 * 用于启用/禁用项目的通用切换开关。
 * 接收回调函数执行实际的切换操作。
 *
 * @module components/active-toggle
 */

'use client';

import { useTransition } from 'react';
import { Switch } from '@/components/ui/switch';

interface ActiveToggleProps {
  id: string;
  isActive: boolean;
  onToggle: (id: string, isActive: boolean) => Promise<void>;
  disabled?: boolean;
}

export function ActiveToggle({ id, isActive, onToggle, disabled = false }: ActiveToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      await onToggle(id, checked);
    });
  };

  return (
    <Switch
      checked={isActive}
      onCheckedChange={handleToggle}
      disabled={isPending || disabled}
      className="data-[state=checked]:bg-green-500"
    />
  );
}
