import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { getToolBySlug, type Locale } from '@/lib/data';
import { ToolRouter } from '@/components/tools/tool-router';
import { ToolBreadcrumb } from '@/components/tools/tool-breadcrumb';

interface ToolPageProps {
  params: Promise<{ locale: string; toolTypeSlug: string; slug: string }>;
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { locale, toolTypeSlug, slug } = await params;
  setRequestLocale(locale);

  const tool = await getToolBySlug(slug, locale as Locale);

  // Validate tool exists and matches the toolTypeSlug in URL
  if (!tool || tool.toolType.slug !== toolTypeSlug) {
    notFound();
  }

  return (
    <div className="container py-8">
      <ToolBreadcrumb toolType={tool.toolType} toolTitle={tool.title} />
      <ToolRouter tool={tool} />
    </div>
  );
}
