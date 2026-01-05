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
