/**
 * @fileoverview OEM Brand Form Component
 * @fileoverview OEM品牌表单组件
 *
 * Client-side form for creating and editing white-label brand configurations.
 * Supports logo upload with dimension validation, color palette selection,
 * and tool type access control for restricting available features per brand.
 * 用于创建和编辑白标品牌配置的客户端表单。
 * 支持带尺寸验证的Logo上传、颜色调色板选择、以及按品牌限制可用功能的工具类型访问控制。
 *
 * @module components/forms/oem-brand-form
 */

'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  createOemBrand,
  updateOemBrand,
  deleteOemBrand,
  type OemBrandFormData,
  type ThemeConfig,
} from '@/lib/actions/oem-brands';
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
import { oemBrandSchema } from '@/lib/validations/oem-brand';
import { brandPalettes } from '@/lib/brand-palettes';
import { useUploadFiles } from '@better-upload/client';
import { validateFileSize } from '@/lib/utils/file';
import {
  useImageDimensions,
  isSquare,
  validateMinDimensions,
  DEFAULT_RATIO_TOLERANCE,
} from '@/lib/utils/image';
import Image from 'next/image';

type ToolTypeOption = {
  id: string;
  slug: string;
  name: string;
};

type OemBrandData = {
  id: string;
  slug: string;
  name: string;
  softwareId: string;
  themeConfig: ThemeConfig;
  allowedToolTypeIds: string[];
  isActive: boolean;
};

interface OemBrandFormProps {
  initialData?: OemBrandData | null;
  mode: 'create' | 'edit';
  toolTypes: ToolTypeOption[];
}

type FieldErrors = Record<string, string>;

type FormState = {
  errors: FieldErrors;
  success?: boolean;
};

// Logo size requirements / Logo尺寸要求
const LOGO_MIN_SIZE = 80;

export function OemBrandForm({ initialData, mode, toolTypes }: OemBrandFormProps) {
  // Theme config state
  const [palette, setPalette] = useState(initialData?.themeConfig?.palette || 'neutral');
  const [brandName, setBrandName] = useState(initialData?.themeConfig?.brandName || '');
  const [slug, setSlug] = useState(initialData?.slug || '');

  // Logo state: either a URL (existing) or a pending file
  // Logo状态：现有的URL或待上传文件
  const [logoUrl, setLogoUrl] = useState<string>(initialData?.themeConfig?.logo || '');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string>('');

  // Use centralized image dimension detection hook / 使用集中的图片尺寸检测Hook
  const { dimensions: logoDimensions, previewUrl } = useImageDimensions(pendingFile);

  // Allowed tool types state
  const [selectedToolTypeIds, setSelectedToolTypeIds] = useState<string[]>(
    initialData?.allowedToolTypeIds || []
  );

  // Upload hook - used only during form submission
  const { upload } = useUploadFiles({
    route: 'brands',
    api: '/api/upload/cdn',
  });

  const handleToolTypeToggle = (toolTypeId: string, checked: boolean) => {
    setSelectedToolTypeIds((prev) =>
      checked ? [...prev, toolTypeId] : prev.filter((id) => id !== toolTypeId)
    );
  };

  // Validate logo dimensions using centralized utilities
  // 使用集中的工具函数验证Logo尺寸
  const validateLogoDimensions = (width: number, height: number): string | null => {
    const dimensions = { width, height };

    // Check if square / 检查是否正方形
    if (!isSquare(dimensions, DEFAULT_RATIO_TOLERANCE)) {
      const ratio = width / height;
      return `Logo must be square. Current ratio: ${ratio.toFixed(2)}:1`;
    }

    // Check minimum size / 检查最小尺寸
    const minCheck = validateMinDimensions(dimensions, LOGO_MIN_SIZE);
    if (!minCheck.isValid) {
      return minCheck.error || null;
    }

    return null;
  };

  // Get logo size status for display
  const getLogoSizeStatus = () => {
    if (!logoDimensions) return null;
    const error = validateLogoDimensions(logoDimensions.width, logoDimensions.height);
    return {
      isValid: !error,
      error,
      width: logoDimensions.width,
      height: logoDimensions.height,
    };
  };

  const logoSizeStatus = getLogoSizeStatus();

  // Handle file selection - validate dimensions before accepting
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

      // Create a temporary image to check dimensions
      const img = new window.Image();
      const tempUrl = URL.createObjectURL(file);

      img.onload = () => {
        const dimensionError = validateLogoDimensions(img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(tempUrl);

        if (dimensionError) {
          setLogoError(dimensionError);
          // Still set the file to show preview with error
          setPendingFile(file);
          setLogoUrl('');
        } else {
          setLogoError('');
          setPendingFile(file);
          setLogoUrl('');
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        alert('Failed to load image. Please try a different file.');
      };

      img.src = tempUrl;
    }
    e.target.value = '';
  };

  // Clear the pending file or existing URL / 清除待上传文件或现有URL
  const handleClearLogo = () => {
    setPendingFile(null);
    setLogoUrl('');
    setLogoError('');
  };

  // The display URL is either the local preview or the remote URL
  const displayUrl = previewUrl || logoUrl;

  // Check if logo has validation errors (blocks form submission)
  const hasLogoError = !!logoError || !!(logoSizeStatus && !logoSizeStatus.isValid);

  // Form action with useActionState for proper pending state
  const handleFormAction = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
    // Check logo dimensions before submitting
    if (pendingFile && hasLogoError) {
      return { errors: { logo: logoError || 'Logo dimensions are invalid' } };
    }

    // Determine the final logo URL
    let finalLogoUrl = logoUrl;

    // If there's a pending file, upload it now
    if (pendingFile) {
      try {
        const result = await upload([pendingFile]);

        if (result.files && result.files.length > 0) {
          const uploadedFile = result.files[0];
          const cdnUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
          if (!cdnUrl) {
            return { errors: { logo: 'NEXT_PUBLIC_CLOUDFRONT_URL is not configured' } };
          }
          finalLogoUrl = `${cdnUrl}/${uploadedFile.objectInfo.key}`;
        } else {
          return { errors: { logo: 'Upload failed - no files returned' } };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload logo';
        return { errors: { logo: `Upload failed: ${message}` } };
      }
    }

    const themeConfig: ThemeConfig = {
      palette: palette || 'neutral',
      logo: finalLogoUrl || undefined,
      brandName: brandName || undefined,
    };

    const rawData = {
      slug: formData.get('slug') as string,
      name: formData.get('name') as string,
      softwareId: formData.get('softwareId') as string,
      themeConfig,
      allowedToolTypeIds: selectedToolTypeIds,
      isActive: formData.get('isActive') === 'on',
    };

    const result = oemBrandSchema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      return { errors: fieldErrors };
    }

    const data: OemBrandFormData = result.data;

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateOemBrand(initialData.id, data);
      } else {
        await createOemBrand(data);
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
  const errors = formState.errors;

  async function handleDelete() {
    if (initialData?.id) {
      await deleteOemBrand(initialData.id);
    }
  }

  const selectedPalette = brandPalettes[palette] || brandPalettes.neutral;

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.slug}>
              <FieldLabel htmlFor="slug">
                Slug <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g., partner-a, oem-brand-1"
                aria-invalid={!!errors.slug}
              />
              <FieldDescription>URL-friendly identifier (lowercase, hyphens only)</FieldDescription>
              {errors.slug && <FieldError>{errors.slug}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">
                Name <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name || ''}
                placeholder="e.g., Partner A Studio"
                aria-invalid={!!errors.name}
              />
              <FieldDescription>Display name for internal use</FieldDescription>
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.softwareId}>
              <FieldLabel htmlFor="softwareId">
                Software ID <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="softwareId"
                name="softwareId"
                defaultValue={initialData?.softwareId || ''}
                placeholder="e.g., PARTNER_A_2024"
                disabled={mode === 'edit'}
                aria-invalid={!!errors.softwareId}
              />
              <FieldDescription>
                Unique identifier sent by desktop software.
                {mode === 'edit' && ' Cannot be changed after creation.'}
              </FieldDescription>
              {errors.softwareId && <FieldError>{errors.softwareId}</FieldError>}
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
          <CardTitle>Theme Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="palette">Color Palette</FieldLabel>
              <Select value={palette} onValueChange={(value) => value && setPalette(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a color palette" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(brandPalettes).map(([key, pal]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full border"
                          style={{ backgroundColor: pal.previewColor }}
                        />
                        {pal.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Primary color theme for the brand
              </FieldDescription>
              {/* Color preview */}
              <div className="mt-3 flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-lg border"
                  style={{ backgroundColor: selectedPalette.previewColor }}
                />
                <div className="text-sm">
                  <div className="font-medium">{selectedPalette.name}</div>
                  <div className="text-muted-foreground font-mono text-xs">
                    Theme: {selectedPalette.themeClass}
                  </div>
                </div>
              </div>
            </Field>

            <Field data-invalid={!!errors.logo || hasLogoError}>
              <FieldLabel>Brand Logo</FieldLabel>
              <FieldDescription className="mb-2 text-xs">
                Square image. Recommended: 256×256px, minimum {LOGO_MIN_SIZE}×{LOGO_MIN_SIZE}px. SVG or PNG preferred.
              </FieldDescription>
              <div className="space-y-3">
                {displayUrl && (
                  <div className="relative inline-block">
                    <div className="h-20 w-20 overflow-hidden rounded-lg border bg-muted">
                      <Image
                        src={displayUrl}
                        alt="Brand logo"
                        fill
                        className="object-contain p-2"
                        style={{ position: 'absolute' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleClearLogo}
                      aria-label="Remove logo"
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive shadow-sm hover:bg-destructive/90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}
                {!displayUrl && (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {/* Size status indicator */}
                {logoSizeStatus && (
                  <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                    logoSizeStatus.isValid
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    <span className="font-medium">
                      {logoSizeStatus.width}×{logoSizeStatus.height}px
                    </span>
                    {logoSizeStatus.isValid ? (
                      <span className="ml-auto flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Valid
                      </span>
                    ) : (
                      <span className="ml-auto flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Invalid
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <label className={`inline-flex items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
                    !slug || isPending
                      ? 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
                      : 'cursor-pointer bg-background hover:bg-accent hover:text-accent-foreground'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={isPending || !slug}
                    />
                    {displayUrl ? 'Change Logo' : 'Select Logo'}
                  </label>
                </div>
              </div>
              <FieldDescription>
                {!slug
                  ? 'Enter a slug first to enable upload'
                  : pendingFile
                    ? `Selected: ${pendingFile.name} (${(pendingFile.size / 1024).toFixed(1)} KB)`
                    : 'PNG, JPG, SVG or WebP (max 2MB)'
                }
              </FieldDescription>
              {(errors.logo || logoError) && <FieldError>{errors.logo || logoError}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="brandName">Brand Display Name</FieldLabel>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Partner Studio"
              />
              <FieldDescription>Name shown in the software header/footer</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allowed Tool Types</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldDescription className="mb-4">
            Select which tool types this brand can access. Leave empty to allow all tool types.
          </FieldDescription>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {toolTypes.map((toolType) => (
              <label
                key={toolType.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <Checkbox
                  checked={selectedToolTypeIds.includes(toolType.id)}
                  onCheckedChange={(checked) =>
                    handleToolTypeToggle(toolType.id, checked as boolean)
                  }
                />
                <div>
                  <div className="font-medium">{toolType.name}</div>
                  <div className="text-xs text-muted-foreground">{toolType.slug}</div>
                </div>
              </label>
            ))}
          </div>
          {toolTypes.length === 0 && (
            <p className="text-sm text-muted-foreground">No tool types available.</p>
          )}
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
                  <AlertDialogTitle>Delete OEM Brand</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this OEM brand? This action cannot be undone.
                    Users registered through this brand will retain their data but the brand
                    configuration will be removed.
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
          <Button type="submit" disabled={isPending || hasLogoError}>
            {isPending
              ? (pendingFile ? 'Uploading & Saving...' : 'Saving...')
              : mode === 'create' ? 'Create Brand' : 'Save Changes'
            }
          </Button>
        </div>
      </div>
    </form>
  );
}
