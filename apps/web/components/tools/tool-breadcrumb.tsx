'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface ToolBreadcrumbProps {
  toolType: {
    slug: string;
    name: string;
  };
  toolTitle: string;
}

export function ToolBreadcrumb({ toolType, toolTitle }: ToolBreadcrumbProps) {
  const t = useTranslations('nav');

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/" />}>
            {t('home')}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/studio" />}>
            {t('studio')}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href={`/studio/${toolType.slug}`} />}>
            {toolType.name}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{toolTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
