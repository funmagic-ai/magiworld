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
