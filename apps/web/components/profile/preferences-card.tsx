'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SettingsIcon, ChevronDownIcon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { cn } from '@/lib/utils';

export function PreferencesCard() {
  const t = useTranslations('profile');
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Card id="preferences">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                {t('preferences.title')}
              </CardTitle>
              <ChevronDownIcon className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-2 border-b">
              <div className="sm:w-32 shrink-0">
                <span className="text-sm text-muted-foreground">{t('preferences.theme')}</span>
              </div>
              <div className="flex-1">
                <ThemeSwitcher />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-2">
              <div className="sm:w-32 shrink-0">
                <span className="text-sm text-muted-foreground">{t('preferences.language')}</span>
              </div>
              <div className="flex-1">
                <LanguageSwitcher />
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
