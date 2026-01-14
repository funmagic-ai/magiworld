/**
 * @fileoverview Create OEM Brand Page
 * @fileoverview 创建OEM品牌页面
 *
 * Form page for creating new OEM partner brands.
 * Loads tool types for access control configuration.
 * 创建新OEM合作伙伴品牌的表单页面。
 * 加载工具类型用于访问控制配置。
 *
 * @module app/(dashboard)/oem-brands/new/page
 */

import { OemBrandForm } from '@/components/forms/oem-brand-form';
import { getToolTypesForSelect } from '@/lib/actions/tools';

export default async function NewOemBrandPage() {
  const toolTypes = await getToolTypesForSelect();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create OEM Brand</h1>
        <p className="text-muted-foreground">Add a new OEM software brand configuration.</p>
      </div>
      <OemBrandForm mode="create" toolTypes={toolTypes} />
    </div>
  );
}
