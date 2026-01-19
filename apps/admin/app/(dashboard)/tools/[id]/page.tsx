/**
 * @fileoverview Edit Tool Page
 * @fileoverview 编辑工具页面
 *
 * Form page for editing existing AI tools.
 * Fetches tool data by ID and populates the form.
 * Provider/model selection is handled by tool processors in worker code.
 * 编辑现有AI工具的表单页面。
 * 通过ID获取工具数据并填充表单。
 * Provider/模型选择由worker代码中的工具处理器处理。
 *
 * @module app/(dashboard)/tools/[id]/page
 */

import { notFound } from 'next/navigation';
import { ToolForm } from '@/components/forms/tool-form';
import { getToolById, getToolTypesForSelect } from '@/lib/actions/tools';

interface EditToolPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditToolPage({ params }: EditToolPageProps) {
  const { id } = await params;
  const [tool, toolTypes] = await Promise.all([
    getToolById(id),
    getToolTypesForSelect(),
  ]);

  if (!tool) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Tool</h1>
        <p className="text-muted-foreground">Update tool: {tool.slug}</p>
      </div>
      <ToolForm mode="edit" initialData={tool} toolTypes={toolTypes} />
    </div>
  );
}
