'use client';

import { Button } from '@/components/ui/button';

type SignInButtonProps = {
  onSignIn: () => Promise<void>;
  children: React.ReactNode;
};

export function SignInButton({ onSignIn, children }: SignInButtonProps) {
  return (
    <Button size="lg" onClick={() => onSignIn()}>
      {children}
    </Button>
  );
}
