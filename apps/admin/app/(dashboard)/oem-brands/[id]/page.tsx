/**
 * @fileoverview Edit OEM Brand Page
 * @fileoverview 编辑OEM品牌页面
 *
 * Form page for editing existing OEM partner brands.
 * Fetches brand data by ID and populates the form.
 * 编辑现有OEM合作伙伴品牌的表单页面。
 * 通过ID获取品牌数据并填充表单。
 *
 * @module app/(dashboard)/oem-brands/[id]/page
 */

import { notFound } from 'next/navigation';
import { OemBrandForm } from '@/components/forms/oem-brand-form';
import { getOemBrandById } from '@/lib/actions/oem-brands';
import { getToolTypesForSelect } from '@/lib/actions/tools';

interface EditOemBrandPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOemBrandPage({ params }: EditOemBrandPageProps) {
  const { id } = await params;
  const [brand, toolTypes] = await Promise.all([
    getOemBrandById(id),
    getToolTypesForSelect(),
  ]);

  if (!brand) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit OEM Brand</h1>
        <p className="text-muted-foreground">Update brand: {brand.name}</p>
      </div>
      <OemBrandForm mode="edit" initialData={brand} toolTypes={toolTypes} />
    </div>
  );
}
