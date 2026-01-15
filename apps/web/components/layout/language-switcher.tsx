'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const localeNames: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  pt: 'Português',
  zh: '中文',
};

const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  ja: '🇯🇵',
  pt: '🇧🇷',
  zh: '🇨🇳',
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3"
        aria-label={`Change language, current: ${localeNames[locale]}`}
      >
        <span aria-hidden="true">{localeFlags[locale]}</span>
        <span className="hidden sm:inline">{localeNames[locale]}</span>
        <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeFlags[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
