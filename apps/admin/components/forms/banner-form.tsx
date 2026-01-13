'use client';

import { useState, useEffect, useActionState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { bannerSchema } from '@/lib/validations/banner';
import { useUploadFiles } from '@better-upload/client';
import {
  DEFAULT_BANNER_TRANSLATIONS,
  BANNER_TRANSLATIONS_EXAMPLE,
} from '@/lib/locales';
import { validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/utils/file';

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

type FormState = {
  errors: FieldErrors;
  success?: boolean;
};

// Expected aspect ratios for each banner type
const EXPECTED_RATIOS = {
  main: { ratio: 21 / 9, label: '21:9' },
  side: { ratio: 16 / 9, label: '16:9' },
} as const;

// Tolerance for aspect ratio comparison (5%)
const RATIO_TOLERANCE = 0.05;

export function BannerForm({ initialData, mode }: BannerFormProps) {
  // Image state: either a URL (existing/pasted) or a pending file
  const [imageUrl, setImageUrl] = useState<string>(initialData?.imageUrl || '');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Image dimension detection
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [bannerType, setBannerType] = useState<'main' | 'side'>(
    (initialData?.type as 'main' | 'side') || 'main'
  );

  // Translations JSON state
  const [translationsJson, setTranslationsJson] = useState<string>(() => {
    if (initialData?.translations && Object.keys(initialData.translations).length > 0) {
      return JSON.stringify(initialData.translations, null, 2);
    }
    return JSON.stringify(DEFAULT_BANNER_TRANSLATIONS, null, 2);
  });

  // Upload hook - used only during form submission
  const { upload } = useUploadFiles({
    route: 'banners',
    api: '/api/upload/cdn',
  });

  // Form action with useActionState for proper pending state
  const handleFormAction = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
    // Parse translations JSON
    let translations: BannerFormData['translations'];
    try {
      translations = JSON.parse(translationsJson);
    } catch {
      return { errors: { translations: 'Invalid JSON format. Please check the syntax.' } };
    }

    // Determine the final image URL
    let finalImageUrl = imageUrl;

    // If there's a pending file, upload it now
    if (pendingFile) {
      try {
        const result = await upload([pendingFile]);

        if (result.files && result.files.length > 0) {
          const uploadedFile = result.files[0];
          finalImageUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL
            ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/${uploadedFile.objectInfo.key}`
            : `https://funmagic-web-public-assets.s3.us-east-2.amazonaws.com/${uploadedFile.objectInfo.key}`;
        } else {
          return { errors: { imageUrl: 'Upload failed - no files returned' } };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload image';
        return { errors: { imageUrl: `Upload failed: ${message}` } };
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
      return { errors: fieldErrors };
    }

    const data: BannerFormData = result.data;

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateBanner(initialData.id, data);
      } else {
        await createBanner(data);
      }
      return { errors: {}, success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('NEXT_REDIRECT')) {
        throw error;
      }
      return { errors: { _form: `Failed to save: ${errorMessage}` } };
    }
  };

  const [formState, formAction, isPending] = useActionState(handleFormAction, { errors: {} });

  // Create/cleanup object URL for local preview and detect dimensions
  useEffect(() => {
    if (pendingFile) {
      const url = URL.createObjectURL(pendingFile);
      setPreviewUrl(url);

      // Detect image dimensions
      const img = new window.Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;

      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl('');
      setImageDimensions(null);
    }
  }, [pendingFile]);

  // Check if image ratio matches expected ratio for current banner type
  const getRatioStatus = () => {
    if (!imageDimensions) return null;
    const actualRatio = imageDimensions.width / imageDimensions.height;
    const expected = EXPECTED_RATIOS[bannerType];
    const diff = Math.abs(actualRatio - expected.ratio) / expected.ratio;
    const isMatch = diff <= RATIO_TOLERANCE;
    return {
      isMatch,
      actualRatio: actualRatio.toFixed(2),
      expectedLabel: expected.label,
      width: imageDimensions.width,
      height: imageDimensions.height,
    };
  };

  const ratioStatus = getRatioStatus();

  // Handle file selection - just store the file, don't upload yet
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size before processing
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.isValid) {
        alert(sizeValidation.error);
        e.target.value = '';
        return;
      }
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
  const [jsonError, setJsonError] = useState<string>('');
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(translationsJson);
      setTranslationsJson(JSON.stringify(parsed, null, 2));
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  // Alias errors from formState for easier access
  const errors = formState.errors;

  async function handleDelete() {
    if (initialData?.id) {
      await deleteBanner(initialData.id);
    }
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
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
              <Select
                name="type"
                defaultValue={initialData?.type || 'main'}
                onValueChange={(value) => setBannerType(value as 'main' | 'side')}
              >
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
              <FieldDescription className="mb-2 text-xs">
                <strong>Recommended size:</strong> Main banner: 1920×823px (21:9), Side banner: 1280×720px (16:9)
              </FieldDescription>
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
                      aria-label="Remove image"
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
                {ratioStatus && (
                  <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    ratioStatus.isMatch
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <span className="font-medium">
                      {ratioStatus.width}×{ratioStatus.height}px
                    </span>
                    <span>
                      (ratio: {ratioStatus.actualRatio})
                    </span>
                    {ratioStatus.isMatch ? (
                      <span className="ml-auto flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Matches {ratioStatus.expectedLabel}
                      </span>
                    ) : (
                      <span className="ml-auto flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Expected {ratioStatus.expectedLabel}
                      </span>
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
                      disabled={isPending}
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
          <Field data-invalid={!!errors.translations || !!errors['translations.en.title'] || !!jsonError}>
            <Textarea
              value={translationsJson}
              onChange={(e) => {
                setTranslationsJson(e.target.value);
                setJsonError(''); // Clear format error on edit
              }}
              placeholder={BANNER_TRANSLATIONS_EXAMPLE}
              rows={12}
              className="font-mono text-sm"
              aria-invalid={!!errors.translations || !!errors['translations.en.title'] || !!jsonError}
            />
            <FieldDescription className="mt-2">
              Required: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">title</code> must be provided for all locales (en, zh, ja, pt).
            </FieldDescription>
            {jsonError && <FieldError>{jsonError}</FieldError>}
            {errors.translations && <FieldError>{errors.translations}</FieldError>}
            {(errors['translations.en.title'] || errors['translations.zh.title'] || errors['translations.ja.title'] || errors['translations.pt.title']) && (
              <FieldError>Title is required for all locales</FieldError>
            )}
          </Field>
        </CardContent>
      </Card>

      {errors._form && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {errors._form}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          {mode === 'edit' && (
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button type="button" variant="destructive" disabled={isPending} />}
              >
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Banner</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this banner? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? (pendingFile ? 'Uploading & Saving...' : 'Saving...')
              : mode === 'create' ? 'Create Banner' : 'Save Changes'
            }
          </Button>
        </div>
      </div>
    </form>
  );
}
