/**
 * @fileoverview Edit Admin Provider Page
 * @fileoverview 编辑管理员提供商页面
 *
 * Form page for editing existing admin providers.
 * 编辑现有管理员提供商的表单页面。
 *
 * @module app/(dashboard)/admin-providers/[id]/page
 */

import { notFound } from 'next/navigation';
import { AdminProviderForm } from '@/components/forms/admin-provider-form';
import { getAdminProviderById } from '@/lib/actions/admin-providers';

interface EditAdminProviderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAdminProviderPage({ params }: EditAdminProviderPageProps) {
  const { id } = await params;
  const provider = await getAdminProviderById(id);

  if (!provider) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Admin Provider</h1>
        <p className="text-muted-foreground">Update provider: {provider.slug}</p>
      </div>
      <AdminProviderForm mode="edit" initialData={provider} />
    </div>
  );
}
