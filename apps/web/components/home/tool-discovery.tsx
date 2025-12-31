'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Tool {
  id: string;
  title: string;
  slug: string;
  toolType: string;
  thumbnail?: string;
  category: {
    name: string;
    slug: string;
  };
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  tools: Tool[];
}

interface ToolDiscoveryProps {
  categories: Category[];
}

export function ToolDiscovery({ categories }: ToolDiscoveryProps) {
  const t = useTranslations('home.categories');
  const tTools = useTranslations('tools');

  // Use placeholder data if no categories provided
  const defaultCategories: Category[] = categories.length > 0 ? categories : [
    {
      id: '1',
      name: 'AI Stylize',
      slug: 'stylize',
      tools: [
        { id: 't1', title: 'Anime Style', slug: 'anime-style', toolType: 'stylize', category: { name: 'AI Stylize', slug: 'stylize' }, updatedAt: new Date().toISOString() },
        { id: 't2', title: 'Oil Painting', slug: 'oil-painting', toolType: 'stylize', category: { name: 'AI Stylize', slug: 'stylize' }, updatedAt: new Date().toISOString() },
        { id: 't3', title: 'Watercolor', slug: 'watercolor', toolType: 'stylize', category: { name: 'AI Stylize', slug: 'stylize' }, updatedAt: new Date().toISOString() },
      ],
    },
    {
      id: '2',
      name: '3D Generation',
      slug: '3d-gen',
      tools: [
        { id: 't4', title: 'Image to 3D', slug: 'image-to-3d', toolType: '3d_gen', category: { name: '3D Generation', slug: '3d-gen' }, updatedAt: new Date().toISOString() },
        { id: 't5', title: 'Text to 3D', slug: 'text-to-3d', toolType: '3d_gen', category: { name: '3D Generation', slug: '3d-gen' }, updatedAt: new Date().toISOString() },
      ],
    },
    {
      id: '3',
      name: 'Crystal Engrave',
      slug: 'crystal-engrave',
      tools: [
        { id: 't6', title: 'Photo Crystal', slug: 'photo-crystal', toolType: 'crystal_engrave', category: { name: 'Crystal Engrave', slug: 'crystal-engrave' }, updatedAt: new Date().toISOString() },
      ],
    },
  ];

  return (
    <section className="container py-10">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t('title')}
        </h2>
        <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
      </div>

      <div className="space-y-12">
        {defaultCategories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}

function CategorySection({ category }: { category: Category }) {
  const t = useTranslations('common');

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">{category.name}</h3>
        <Link
          href={`/studio?category=${category.slug}`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {t('viewAll')} →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {category.tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const t = useTranslations('tools');

  // Use a stable date format to avoid hydration mismatch
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    return `${month} ${day}`;
  };

  return (
    <Link href={`/studio/${tool.toolType}/${tool.slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
        {/* Thumbnail */}
        <div className="aspect-square bg-muted relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/20" />

          {/* Placeholder icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <ToolIcon type={tool.toolType} className="h-12 w-12 text-muted-foreground/50" />
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="text-sm font-medium bg-background/90 px-3 py-1.5 rounded-full">
              {t('tryNow')}
            </span>
          </div>
        </div>

        <CardContent className="p-3">
          <h4 className="font-medium truncate">{tool.title}</h4>
        </CardContent>

        <CardFooter className="p-3 pt-0">
          <span className="text-xs text-muted-foreground">
            {t('lastUpdated')}: {formatDate(tool.updatedAt)}
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
