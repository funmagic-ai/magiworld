import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { AssetsNav } from '@/components/assets/assets-nav';
import { TaskList } from '@/components/ailab/task-list';

interface TasksPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TasksPage({ params }: TasksPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('tasks');
  const tAssets = await getTranslations('assets');

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{tAssets('title')}</h1>
      </div>

      <AssetsNav />

      <div className="mb-4">
        <h2 className="text-xl font-semibold">{t('title')}</h2>
      </div>

      <TaskList locale={locale} />
    </div>
  );
}
