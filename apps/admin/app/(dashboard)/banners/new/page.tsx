/**
 * @fileoverview Create Banner Page
 * @fileoverview 创建横幅页面
 *
 * Form page for creating new homepage banners.
 * Includes image upload and multi-locale translations.
 * 创建新首页横幅的表单页面。
 * 包含图片上传和多语言翻译。
 *
 * @module app/(dashboard)/banners/new/page
 */

import { BannerForm } from '@/components/forms/banner-form';

export default async function NewBannerPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Banner</h1>
        <p className="text-muted-foreground">Add a new homepage banner.</p>
      </div>
      <BannerForm mode="create" />
    </div>
  );
}
