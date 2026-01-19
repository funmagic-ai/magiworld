import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getToolTypeBySlug, getToolsByTypeSlug, type Locale } from '@/lib/data';
import { Link } from '@/i18n/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { getTranslations } from 'next-intl/server';

interface ToolTypePageProps {
  params: Promise<{ locale: string; toolTypeSlug: string }>;
}

export default async function ToolTypePage({ params }: ToolTypePageProps) {
  const { locale, toolTypeSlug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('nav');

  const [toolType, tools] = await Promise.all([
    getToolTypeBySlug(toolTypeSlug, locale as Locale),
    getToolsByTypeSlug(toolTypeSlug, locale as Locale),
  ]);

  if (!toolType) {
    notFound();
  }

  return (
    <div className="container py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/" />}>
              {t('home')}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/ai-lab" />}>
              {t('aiLab')}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{toolType.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{toolType.name}</h1>
        {toolType.description && (
          <p className="mt-2 text-muted-foreground">{toolType.description}</p>
        )}
      </div>

      {tools.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`/ai-lab/${toolTypeSlug}/${tool.slug}`}
              className="group rounded-lg border bg-card overflow-hidden shadow-sm transition-colors hover:bg-accent"
            >
              <div className="aspect-video bg-muted relative">
                {tool.thumbnail ? (
                  <img
                    src={tool.thumbnail.url}
                    alt={tool.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <ToolIcon className="h-12 w-12" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{tool.title}</h3>
                  <Badge variant={tool.toolType.badgeColor as 'default' | 'secondary' | 'outline'}>
                    {tool.toolType.name}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-12 text-center">
          <ToolIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No tools available</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            There are no tools in this category yet.
          </p>
        </div>
      )}
    </div>
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
