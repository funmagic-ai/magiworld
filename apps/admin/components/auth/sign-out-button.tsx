/**
 * @fileoverview Sign Out Button Component
 * @fileoverview 登出按钮组件
 *
 * Client-side button for triggering Logto sign-out flow.
 * Receives the sign-out handler as a prop from the server component.
 * 用于触发Logto登出流程的客户端按钮。
 * 从服务端组件接收登出处理器作为prop。
 *
 * @module components/auth/sign-out-button
 */

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
