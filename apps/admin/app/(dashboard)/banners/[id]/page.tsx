/**
 * @fileoverview Edit Banner Page
 * @fileoverview 编辑横幅页面
 *
 * Form page for editing existing homepage banners.
 * Fetches banner data by ID and populates the form.
 * 编辑现有首页横幅的表单页面。
 * 通过ID获取横幅数据并填充表单。
 *
 * @module app/(dashboard)/banners/[id]/page
 */

import { notFound } from 'next/navigation';
import { BannerForm } from '@/components/forms/banner-form';
import { getBannerById } from '@/lib/actions/banners';

interface EditBannerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBannerPage({ params }: EditBannerPageProps) {
  const { id } = await params;
  const banner = await getBannerById(id);

  if (!banner) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Banner</h1>
        <p className="text-muted-foreground">Update banner settings.</p>
      </div>
      <BannerForm mode="edit" initialData={banner} />
    </div>
  );
}
