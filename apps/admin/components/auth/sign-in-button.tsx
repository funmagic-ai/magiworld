/**
 * @fileoverview Sign In Button Component
 * @fileoverview 登录按钮组件
 *
 * Client-side button for triggering Logto sign-in flow.
 * Receives the sign-in handler as a prop from the server component.
 * 用于触发Logto登录流程的客户端按钮。
 * 从服务端组件接收登录处理器作为prop。
 *
 * @module components/auth/sign-in-button
 */

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
