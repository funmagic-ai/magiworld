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
