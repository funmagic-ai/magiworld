import { notFound } from 'next/navigation';
import { BannerForm } from '@/components/forms/banner-form';
import { getBannerById } from '@/lib/actions/banners';

interface EditBannerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBannerPage({ params }: EditBannerPageProps) {
  const { id } = await params;
  const banner = await getBannerById(id);

  if (!banner) {
    notFound();
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Banner</h1>
        <p className="text-muted-foreground">Update banner settings.</p>
      </div>
      <BannerForm mode="edit" initialData={banner} />
    </div>
  );
}
