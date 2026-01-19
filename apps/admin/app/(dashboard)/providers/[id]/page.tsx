/**
 * @fileoverview Edit Provider Page
 * @fileoverview 编辑提供商页面
 *
 * Form page for editing existing AI providers.
 * Fetches provider data by ID and populates the form.
 * 编辑现有AI提供商的表单页面。
 * 通过ID获取提供商数据并填充表单。
 *
 * @module app/(dashboard)/providers/[id]/page
 */

import { notFound } from 'next/navigation';
import { ProviderForm } from '@/components/forms/provider-form';
import { getProviderById } from '@/lib/actions/providers';

interface EditProviderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProviderPage({ params }: EditProviderPageProps) {
  const { id } = await params;
  const provider = await getProviderById(id);

  if (!provider) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Provider</h1>
        <p className="text-muted-foreground">Update provider: {provider.slug}</p>
      </div>
      <ProviderForm mode="edit" initialData={provider} />
    </div>
  );
}
