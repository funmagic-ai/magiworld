/**
 * @fileoverview New Provider Page
 * @fileoverview 新建提供商页面
 *
 * Form page for creating new AI providers.
 * 创建新AI提供商的表单页面。
 *
 * @module app/(dashboard)/providers/new/page
 */

import { ProviderForm } from '@/components/forms/provider-form';

export default function NewProviderPage() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Provider</h1>
        <p className="text-muted-foreground">Add a new AI provider to the platform.</p>
      </div>
      <ProviderForm mode="create" />
    </div>
  );
}
