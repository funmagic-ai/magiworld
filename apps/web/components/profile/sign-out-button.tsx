'use client';

import { Button } from '@/components/ui/button';

type SignOutButtonProps = {
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
};

export function SignOutButton({ onSignOut, children }: SignOutButtonProps) {
  return (
    <Button variant="destructive" onClick={() => onSignOut()}>
      {children}
    </Button>
  );
}
