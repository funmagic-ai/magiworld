/**
 * @fileoverview Create Tool Type Page
 * @fileoverview 创建工具类型页面
 *
 * Form page for creating new tool type classifications.
 * Includes badge color selection and translations.
 * 创建新工具类型分类的表单页面。
 * 包含徽章颜色选择和翻译。
 *
 * @module app/(dashboard)/tool-types/new/page
 */

import { ToolTypeForm } from '@/components/forms/tool-type-form';

export default function NewToolTypePage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Tool Type</h1>
        <p className="text-muted-foreground">Add a new tool type classification.</p>
      </div>
      <ToolTypeForm mode="create" />
    </div>
  );
}
