'use client';

import { Button } from '@/components/ui/button';

type SignOutButtonProps = {
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
};

export function SignOutButton({
  onSignOut,
  children,
  variant = 'ghost',
  size = 'sm',
}: SignOutButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={() => onSignOut()}>
      {children}
    </Button>
  );
}
