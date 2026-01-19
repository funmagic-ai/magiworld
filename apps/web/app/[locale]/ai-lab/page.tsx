import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { getTools, type Locale } from '@/lib/data';
import { AILabNav } from '@/components/ailab/ailab-nav';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AILabPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AILabPage({ params }: AILabPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home.categories');
  const tTools = await getTranslations('tools');

  const tools = await getTools(locale as Locale);

  return (
    <div className="container py-8">
      <AILabNav />

      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {tools.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} tTools={tTools} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <ToolIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No tools available</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Check back later for new AI tools.
          </p>
        </div>
      )}
    </div>
  );
}

interface ToolCardProps {
  tool: {
    id: string;
    slug: string;
    title: string;
    thumbnail?: { url: string };
    toolType: {
      slug: string;
      name: string;
      badgeColor: string;
    };
    updatedAt: string;
  };
  tTools: ReturnType<typeof getTranslations> extends Promise<infer T> ? T : never;
}

function ToolCard({ tool, tTools }: ToolCardProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = date.getUTCDate();
    return `${month} ${day}`;
  };

  return (
    <Link href={`/ai-lab/${tool.toolType.slug}/${tool.slug}`}>
      <Card className="group overflow-hidden transition-[box-shadow,transform] hover:shadow-md hover:-translate-y-0.5">
        <div className="aspect-square bg-muted relative overflow-hidden">
          {tool.thumbnail?.url ? (
            <img
              src={tool.thumbnail.url}
              alt={tool.title}
              width={200}
              height={200}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ToolIcon className="h-10 w-10 text-muted-foreground/50" />
              </div>
            </>
          )}

          <div className="absolute top-2 left-2">
            <Badge variant={tool.toolType.badgeColor as 'default' | 'secondary' | 'outline'} className="text-xs">
              {tool.toolType.name}
            </Badge>
          </div>

          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <span className="text-xs font-medium bg-background/90 px-2 py-1 rounded-full">
              {tTools('tryNow')}
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

function ToolIcon({ className }: { className?: string }) {
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
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
