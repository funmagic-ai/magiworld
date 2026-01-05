'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldError,
} from '@/components/ui/field';
import { createBanner, updateBanner, deleteBanner, type BannerFormData } from '@/lib/actions/banners';
import { bannerSchema } from '@/lib/validations/banner';
import { useUploadFiles } from '@better-upload/client';
import {
  DEFAULT_BANNER_TRANSLATIONS,
  BANNER_TRANSLATIONS_EXAMPLE,
} from '@/lib/locales';

type TranslationData = {
  title: string;
  subtitle?: string;
};

type BannerData = {
  id: string;
  type: string;
  imageUrl: string | null;
  link: string | null;
  order: number;
  isActive: boolean;
  translations: Record<string, TranslationData>;
};

interface BannerFormProps {
  initialData?: BannerData | null;
  mode: 'create' | 'edit';
}

const BANNER_TYPES = [
  { value: 'main', label: 'Main (Carousel)' },
  { value: 'side', label: 'Side (Sidebar)' },
] as const;

type FieldErrors = Record<string, string>;

export function BannerForm({ initialData, mode }: BannerFormProps) {
  // Image state: either a URL (existing/pasted) or a pending file
  const [imageUrl, setImageUrl] = useState<string>(initialData?.imageUrl || '');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Translations JSON state
  const [translationsJson, setTranslationsJson] = useState<string>(() => {
    if (initialData?.translations && Object.keys(initialData.translations).length > 0) {
      return JSON.stringify(initialData.translations, null, 2);
    }
    return JSON.stringify(DEFAULT_BANNER_TRANSLATIONS, null, 2);
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload hook - used only during form submission
  const { upload } = useUploadFiles({
    route: 'banners',
    api: '/api/upload/cdn',
  });

  // Create/cleanup object URL for local preview
  useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl('');
    }
  }, [pendingFile]);

  // Handle file selection - just store the file, don't upload yet
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingFile(file);
      setImageUrl(''); // Clear any existing URL
    }
    e.target.value = '';
  };

  // Clear the pending file or existing URL
  const handleClearImage = () => {
    setPendingFile(null);
    setImageUrl('');
  };

  // The display URL is either the local preview or the remote URL
  const displayUrl = previewUrl || imageUrl;

  // Format JSON with proper indentation
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(translationsJson);
      setTranslationsJson(JSON.stringify(parsed, null, 2));
      setErrors((prev) => ({ ...prev, translations: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, translations: 'Invalid JSON format' }));
    }
  };

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setErrors({});

    // Parse translations JSON
    let translations: BannerFormData['translations'];
    try {
      translations = JSON.parse(translationsJson);
    } catch {
      setErrors({ translations: 'Invalid JSON format. Please check the syntax.' });
      setIsSubmitting(false);
      return;
    }

    // Determine the final image URL
    let finalImageUrl = imageUrl;

    // If there's a pending file, upload it now
    if (pendingFile) {
      try {
        const result = await upload([pendingFile]);

        if (result.files && result.files.length > 0) {
          const uploadedFile = result.files[0];
          // Build CDN URL from the uploaded file
          finalImageUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL
            ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/${uploadedFile.objectInfo.key}`
            : `https://magiworld-cdn.s3.us-east-2.amazonaws.com/${uploadedFile.objectInfo.key}`;
        }
      } catch (error) {
        setErrors({ imageUrl: 'Failed to upload image' });
        setIsSubmitting(false);
        return;
      }
    }

    const rawData = {
      type: formData.get('type') as string,
      imageUrl: finalImageUrl || undefined,
      link: formData.get('link') as string || undefined,
      order: parseInt(formData.get('order') as string) || 0,
      isActive: formData.get('isActive') === 'on',
      translations,
    };

    const result = bannerSchema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    const data: BannerFormData = result.data;

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateBanner(initialData.id, data);
      } else {
        await createBanner(data);
      }
    } catch (error) {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (initialData?.id && confirm('Are you sure you want to delete this banner?')) {
      await deleteBanner(initialData.id);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.type}>
              <FieldLabel htmlFor="type">
                Banner Type <span className="text-destructive">*</span>
              </FieldLabel>
              <Select name="type" defaultValue={initialData?.type || 'main'}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select banner type" />
                </SelectTrigger>
                <SelectContent>
                  {BANNER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Main banners appear in carousel, side banners in sidebar</FieldDescription>
              {errors.type && <FieldError>{errors.type}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.imageUrl}>
              <FieldLabel>Banner Image</FieldLabel>
              <div className="space-y-3">
                {displayUrl && (
                  <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={displayUrl}
                      alt="Banner preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                    {pendingFile && (
                      <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                        Will upload on save
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                    {displayUrl ? 'Change Image' : 'Select Image'}
                  </label>
                  {!displayUrl && (
                    <span className="text-sm text-muted-foreground">or paste URL below</span>
                  )}
                </div>
                {!pendingFile && (
                  <Input
                    placeholder="https://cdn.example.com/banner.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                )}
              </div>
              <FieldDescription>
                {pendingFile
                  ? `Selected: ${pendingFile.name} (${(pendingFile.size / 1024).toFixed(1)} KB)`
                  : 'Upload a new image or paste a CDN URL'
                }
              </FieldDescription>
              {errors.imageUrl && <FieldError>{errors.imageUrl}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.link}>
              <FieldLabel htmlFor="link">Link URL</FieldLabel>
              <Input
                id="link"
                name="link"
                defaultValue={initialData?.link || ''}
                placeholder="https://example.com or /studio/edit"
                aria-invalid={!!errors.link}
              />
              <FieldDescription>Where users go when clicking the banner</FieldDescription>
              {errors.link && <FieldError>{errors.link}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.order}>
              <FieldLabel htmlFor="order">Display Order</FieldLabel>
              <Input
                id="order"
                name="order"
                type="number"
                defaultValue={initialData?.order || 0}
                min={0}
                aria-invalid={!!errors.order}
              />
              {errors.order && <FieldError>{errors.order}</FieldError>}
            </Field>

            <Field orientation="horizontal">
              <FieldLabel htmlFor="isActive">Active</FieldLabel>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={initialData?.isActive ?? true}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Translations (JSON) <span className="text-destructive">*</span>
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={handleFormatJson}>
              Format JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Field data-invalid={!!errors.translations || !!errors['translations.en.title']}>
            <Textarea
              value={translationsJson}
              onChange={(e) => setTranslationsJson(e.target.value)}
              placeholder={BANNER_TRANSLATIONS_EXAMPLE}
              rows={12}
              className="font-mono text-sm"
              aria-invalid={!!errors.translations || !!errors['translations.en.title']}
            />
            <FieldDescription className="mt-2">
              Required: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">title</code> must be provided for all locales (en, zh, ja, pt).
            </FieldDescription>
            {errors.translations && <FieldError>{errors.translations}</FieldError>}
            {(errors['translations.en.title'] || errors['translations.zh.title'] || errors['translations.ja.title'] || errors['translations.pt.title']) && (
              <FieldError>Title is required for all locales</FieldError>
            )}
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          {mode === 'edit' && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? (pendingFile ? 'Uploading & Saving...' : 'Saving...')
              : mode === 'create' ? 'Create Banner' : 'Save Changes'
            }
          </Button>
        </div>
      </div>
    </form>
  );
}
