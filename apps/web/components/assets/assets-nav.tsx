'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  translationKey: string;
  isActive: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    href: '/assets',
    translationKey: 'assets',
    isActive: (pathname) => pathname === '/assets',
  },
  {
    href: '/assets/tasks',
    translationKey: 'myTasks',
    isActive: (pathname) => pathname === '/assets/tasks' || pathname.startsWith('/assets/tasks/'),
  },
];

export function AssetsNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b mb-6">
      {navItems.map((item) => {
        const isActive = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t(item.translationKey)}
          </Link>
        );
      })}
    </nav>
  );
}
