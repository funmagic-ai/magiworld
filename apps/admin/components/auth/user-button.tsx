/**
 * @fileoverview User Button Component
 * @fileoverview 用户按钮组件
 *
 * Displays current user avatar/name in sidebar with dropdown menu.
 * Provides sign-out action and user info display.
 * 在侧边栏显示当前用户头像/名称，带下拉菜单。
 * 提供登出操作和用户信息显示。
 *
 * @module components/auth/user-button
 */

'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type UserButtonProps = {
  user: {
    name?: string;
    email?: string;
    picture?: string;
  };
  onSignOut: () => Promise<void>;
};

export function UserButton({ user, onSignOut }: UserButtonProps) {
  const displayName = user.name || user.email || 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
        )}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName}
            className="h-8 w-8 shrink-0 rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
            {initials}
          </div>
        )}
        <div className="flex-1 overflow-hidden group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-medium">{user.name || 'Admin User'}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name || 'Admin User'}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-destructive" onClick={() => onSignOut()}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}
