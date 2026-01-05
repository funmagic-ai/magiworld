'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ToolListItem } from '@magiworld/types';

interface ToolDiscoveryProps {
  tools: ToolListItem[];
}

export function ToolDiscovery({ tools }: ToolDiscoveryProps) {
  const t = useTranslations('home.categories');

  // Don't render if no tools from database
  if (tools.length === 0) {
    return null;
  }

  return (
    <section className="container py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl">
          {t('title')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function ToolCard({ tool }: { tool: ToolListItem }) {
  const t = useTranslations('tools');

  // Use a stable date format to avoid hydration mismatch
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    return `${month} ${day}`;
  };

  return (
    <Link href={`/studio/${tool.toolType.slug}/${tool.slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
        {/* Thumbnail */}
        <div className="aspect-square bg-muted relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/20" />

          {/* Tool Type Badge - name is already localized from database */}
          <div className="absolute top-2 left-2">
            <Badge variant={tool.toolType.badgeColor} className="text-xs">
              {tool.toolType.name}
            </Badge>
          </div>

          {/* Placeholder icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <ToolIcon type={tool.toolType.slug} className="h-10 w-10 text-muted-foreground/50" />
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="text-xs font-medium bg-background/90 px-2 py-1 rounded-full">
              {t('tryNow')}
            </span>
          </div>
        </div>

        <CardContent className="p-2">
          <h4 className="text-sm font-medium truncate">{tool.title}</h4>
        </CardContent>

        <CardFooter className="p-2 pt-0">
          <span className="text-xs text-muted-foreground">
            {formatDate(tool.updatedAt)}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}

function ToolIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'stylize':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      );
    case 'edit':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case '3d_gen':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'crystal_engrave':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
          <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
          <line x1="12" y1="22" x2="12" y2="8.5" />
          <line x1="22" y1="8.5" x2="12" y2="8.5" />
          <line x1="2" y1="8.5" x2="12" y2="8.5" />
        </svg>
      );
    default:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
  }
}
