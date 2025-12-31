'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:h-16 md:flex-row md:py-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>&copy; {currentYear} Magiworld.</span>
          <span>{t('rights')}</span>
        </div>

        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            {t('privacy')}
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            {t('terms')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
