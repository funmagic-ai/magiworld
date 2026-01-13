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
