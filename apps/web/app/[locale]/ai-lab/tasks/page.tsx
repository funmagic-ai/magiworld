import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { AILabNav } from '@/components/ailab/ailab-nav';
import { TaskList } from '@/components/ailab/task-list';

interface TasksPageProps {
  params: Promise<{ locale: string }>;
}

export default async function TasksPage({ params }: TasksPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('tasks');

  return (
    <div className="container py-8">
      <AILabNav />

      <div className="mb-6">
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
      </div>

      <TaskList locale={locale} />
    </div>
  );
}
