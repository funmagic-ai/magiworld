'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from './language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Logo } from '@/components/logo';
import { SearchIcon, MenuIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface HeaderProps {
  authSlot?: React.ReactNode;
}

export function Header({ authSlot }: HeaderProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'home', match: (p: string) => p === '/' },
    { href: '/ai-lab', label: 'aiLab', match: (p: string) => p === '/ai-lab' || p.startsWith('/ai-lab/') },
    { href: '/assets', label: 'assets', match: (p: string) => p === '/assets' || p.startsWith('/assets/') },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-9 w-9 text-primary" />
            <span className="hidden text-xl font-semibold sm:inline-block">
              Magiworld
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium px-3 py-2 rounded-lg transition-colors",
                  item.match(pathname)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <SearchIcon className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>

          <ThemeSwitcher />
          <LanguageSwitcher />

          <div className="hidden sm:flex items-center gap-2">
            {authSlot}
          </div>

          <Button variant="ghost" size="icon" className="md:hidden">
            <MenuIcon className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
