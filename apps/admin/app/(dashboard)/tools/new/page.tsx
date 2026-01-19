/**
 * @fileoverview Create Tool Page
 * @fileoverview 创建工具页面
 *
 * Form page for creating new AI tools.
 * Loads tool types for category selection.
 * Provider/model selection is handled by tool processors in worker code.
 * 创建新AI工具的表单页面。
 * 加载工具类型用于分类选择。
 * Provider/模型选择由worker代码中的工具处理器处理。
 *
 * @module app/(dashboard)/tools/new/page
 */

import { ToolForm } from '@/components/forms/tool-form';
import { getToolTypesForSelect } from '@/lib/actions/tools';

export default async function NewToolPage() {
  const toolTypes = await getToolTypesForSelect();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Tool</h1>
        <p className="text-muted-foreground">Add a new AI tool.</p>
      </div>
      <ToolForm mode="create" toolTypes={toolTypes} />
    </div>
  );
}
