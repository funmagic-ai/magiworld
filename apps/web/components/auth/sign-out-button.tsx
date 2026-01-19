'use client';

import { Button } from '@/components/ui/button';

interface SignOutButtonProps {
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}

export function SignOutButton({ onSignOut, children }: SignOutButtonProps) {
  return (
    <Button variant="ghost" size="sm" onClick={onSignOut}>
      {children}
    </Button>
  );
}
