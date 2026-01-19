/**
 * @fileoverview New Admin Provider Page
 * @fileoverview 新建管理员提供商页面
 *
 * Form page for creating new admin providers.
 * 创建新管理员提供商的表单页面。
 *
 * @module app/(dashboard)/admin-providers/new/page
 */

import { AdminProviderForm } from '@/components/forms/admin-provider-form';

export default function NewAdminProviderPage() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Add Admin Provider</h1>
        <p className="text-muted-foreground">
          Configure a new provider for admin Magi tools
        </p>
      </div>
      <AdminProviderForm mode="create" />
    </div>
  );
}
