'use client';

import { useRouter } from '@/i18n/navigation';
import { UserIcon, LogOutIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UserButtonProps {
  user: {
    name?: string;
    email?: string;
    picture?: string;
  };
  onSignOut: () => Promise<void>;
  signOutLabel: string;
  profileLabel: string;
}

export function UserButton({ user, onSignOut, signOutLabel, profileLabel }: UserButtonProps) {
  const router = useRouter();
  const displayName = user.name || user.email || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-2')}>
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName}
            width={24}
            height={24}
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
            {initials}
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/profile')}>
          <UserIcon className="mr-2 h-4 w-4" />
          {profileLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={onSignOut}>
          <LogOutIcon className="mr-2 h-4 w-4" />
          {signOutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
