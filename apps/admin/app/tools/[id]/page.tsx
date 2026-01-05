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
        <h1 className="text-3xl font-bold tracking-tight">Edit Tool</h1>
        <p className="text-muted-foreground">Update tool: {tool.slug}</p>
      </div>
      <ToolForm mode="edit" initialData={tool} toolTypes={toolTypes} />
    </div>
  );
}
