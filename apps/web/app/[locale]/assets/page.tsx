import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { AssetGrid } from '@/components/assets/asset-grid';
import { AssetsNav } from '@/components/assets/assets-nav';

interface AssetsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AssetsPage({ params }: AssetsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('assets');

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
      </div>

      <AssetsNav />

      <AssetGrid locale={locale} />
    </div>
  );
}
