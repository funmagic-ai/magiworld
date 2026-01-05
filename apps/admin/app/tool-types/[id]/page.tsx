import { notFound } from 'next/navigation';
import { ToolTypeForm } from '@/components/forms/tool-type-form';
import { getToolTypeById } from '@/lib/actions/tool-types';

interface EditToolTypePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditToolTypePage({ params }: EditToolTypePageProps) {
  const { id } = await params;
  const toolType = await getToolTypeById(id);

  if (!toolType) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Tool Type</h1>
        <p className="text-muted-foreground">Update tool type: {toolType.slug}</p>
      </div>
      <ToolTypeForm mode="edit" initialData={toolType} />
    </div>
  );
}
