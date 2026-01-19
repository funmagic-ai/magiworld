'use client';

import { Button } from '@/components/ui/button';

interface SignInButtonProps {
  onSignIn: () => Promise<void>;
  children: React.ReactNode;
}

export function SignInButton({ onSignIn, children }: SignInButtonProps) {
  return (
    <Button size="sm" onClick={onSignIn}>
      {children}
    </Button>
  );
}
