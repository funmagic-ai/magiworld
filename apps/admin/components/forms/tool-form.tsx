'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
  FieldError,
} from '@/components/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { createTool, updateTool, deleteTool, type ToolFormData } from '@/lib/actions/tools';
import { toolSchema, validToolSlugs } from '@/lib/validations/tool';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useUploadFiles } from '@better-upload/client';
import {
  DEFAULT_TOOL_TRANSLATIONS,
  TOOL_TRANSLATIONS_EXAMPLE,
} from '@/lib/locales';
import { validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/utils/file';

type TranslationData = {
  title: string;
  description?: string;
  promptTemplate?: string;
};

type ToolData = {
  id: string;
  slug: string;
  toolTypeId: string;
  thumbnailUrl: string | null;
  promptTemplate: string | null;
  configJson: unknown;
  aiEndpoint: string | null;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  translations: Record<string, TranslationData>;
};

type ToolTypeOption = {
  id: string;
  slug: string;
  name: string;
};

interface ToolFormProps {
  initialData?: ToolData | null;
  toolTypes: ToolTypeOption[];
  mode: 'create' | 'edit';
}

type FieldErrors = Record<string, string>;

export function ToolForm({ initialData, toolTypes, mode }: ToolFormProps) {
  // Thumbnail state: either a URL (existing/pasted) or a pending file
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialData?.thumbnailUrl || '');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Translations JSON state
  const [translationsJson, setTranslationsJson] = useState<string>(() => {
    if (initialData?.translations && Object.keys(initialData.translations).length > 0) {
      return JSON.stringify(initialData.translations, null, 2);
    }
    return JSON.stringify(DEFAULT_TOOL_TRANSLATIONS, null, 2);
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Controlled state for comboboxes
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [slugOpen, setSlugOpen] = useState(false);
  const [toolTypeId, setToolTypeId] = useState(initialData?.toolTypeId || '');
  const [toolTypeOpen, setToolTypeOpen] = useState(false);

  // Upload hook - used only during form submission
  const { upload } = useUploadFiles({
    route: 'tools',
    api: '/api/upload/cdn',
  });

  // Image dimension detection
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

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

  // Check if image ratio is 1:1 (square) - 5% tolerance
  const getRatioStatus = () => {
    if (!imageDimensions) return null;
    const actualRatio = imageDimensions.width / imageDimensions.height;
    const expectedRatio = 1; // 1:1 square
    const diff = Math.abs(actualRatio - expectedRatio) / expectedRatio;
    const isMatch = diff <= 0.05;
    return {
      isMatch,
      actualRatio: actualRatio.toFixed(2),
      width: imageDimensions.width,
      height: imageDimensions.height,
    };
  };

  const ratioStatus = getRatioStatus();

  // Get selected tool type name for display
  const selectedToolType = toolTypes.find(t => t.id === toolTypeId);

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
      setThumbnailUrl(''); // Clear any existing URL
    }
    e.target.value = '';
  };

  // Clear the pending file or existing URL
  const handleClearThumbnail = () => {
    setPendingFile(null);
    setThumbnailUrl('');
  };

  // The display URL is either the local preview or the remote URL
  const displayUrl = previewUrl || thumbnailUrl;

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
    // Prevent double-submit with ref check (synchronous)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setErrors({});

    // Parse config JSON
    let configJson: Record<string, unknown> | undefined;
    const configJsonStr = formData.get('configJson') as string;
    if (configJsonStr) {
      try {
        configJson = JSON.parse(configJsonStr);
      } catch {
        setErrors({ configJson: 'Invalid JSON format' });
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
    }

    // Parse translations JSON
    let translations: ToolFormData['translations'];
    try {
      translations = JSON.parse(translationsJson);
    } catch {
      setErrors({ translations: 'Invalid JSON format. Please check the syntax.' });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // Determine the final thumbnail URL
    let finalThumbnailUrl = thumbnailUrl;

    // If there's a pending file, upload it now
    if (pendingFile) {
      try {
        const slugValue = formData.get('slug') as string;
        const result = await upload([pendingFile], {
          metadata: { toolId: slugValue || 'misc', type: 'thumbnails' }
        });

        if (result.files && result.files.length > 0) {
          const uploadedFile = result.files[0];
          // Build CDN URL from the uploaded file
          finalThumbnailUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL
            ? `${process.env.NEXT_PUBLIC_CLOUDFRONT_URL}/${uploadedFile.objectInfo.key}`
            : `https://magiworld-cdn.s3.us-east-2.amazonaws.com/${uploadedFile.objectInfo.key}`;
        }
      } catch (error) {
        setErrors({ thumbnailUrl: 'Failed to upload thumbnail' });
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
    }

    const rawData = {
      slug: formData.get('slug') as string,
      toolTypeId: formData.get('toolTypeId') as string,
      thumbnailUrl: finalThumbnailUrl || undefined,
      promptTemplate: formData.get('promptTemplate') as string || undefined,
      configJson,
      aiEndpoint: formData.get('aiEndpoint') as string || undefined,
      isActive: formData.get('isActive') === 'on',
      isFeatured: formData.get('isFeatured') === 'on',
      order: parseInt(formData.get('order') as string) || 0,
      translations,
    };

    const result = toolSchema.safeParse(rawData);

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const data: ToolFormData = result.data;

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateTool(initialData.id, data);
      } else {
        await createTool(data);
      }
    } catch (error) {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (initialData?.id && confirm('Are you sure you want to delete this tool?')) {
      await deleteTool(initialData.id);
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
            <Field data-invalid={!!errors.slug}>
              <FieldLabel>
                Tool Component <span className="text-destructive">*</span>
              </FieldLabel>
              <input type="hidden" name="slug" value={slug} />
              <Popover open={slugOpen} onOpenChange={setSlugOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    !slug && "text-muted-foreground"
                  )}
                  aria-invalid={!!errors.slug}
                >
                  {slug || "Select a component..."}
                  <HugeiconsIcon icon={ArrowDown01Icon} className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[--trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search components..." />
                    <CommandList>
                      <CommandEmpty>No component found.</CommandEmpty>
                      <CommandGroup>
                        {validToolSlugs.map((s) => (
                          <CommandItem
                            key={s}
                            value={s}
                            onSelect={() => {
                              setSlug(s);
                              setSlugOpen(false);
                            }}
                            data-checked={slug === s}
                          >
                            {s}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FieldDescription>
                Only registered tool components are available
              </FieldDescription>
              {errors.slug && <FieldError>{errors.slug}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.toolTypeId}>
              <FieldLabel>
                Tool Type <span className="text-destructive">*</span>
              </FieldLabel>
              <input type="hidden" name="toolTypeId" value={toolTypeId} />
              <Popover open={toolTypeOpen} onOpenChange={setToolTypeOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    !toolTypeId && "text-muted-foreground"
                  )}
                  aria-invalid={!!errors.toolTypeId}
                >
                  {selectedToolType?.name || "Select a tool type..."}
                  <HugeiconsIcon icon={ArrowDown01Icon} className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent className="w-[--trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search tool types..." />
                    <CommandList>
                      <CommandEmpty>No tool type found.</CommandEmpty>
                      <CommandGroup>
                        {toolTypes.map((type) => (
                          <CommandItem
                            key={type.id}
                            value={type.name}
                            onSelect={() => {
                              setToolTypeId(type.id);
                              setToolTypeOpen(false);
                            }}
                            data-checked={toolTypeId === type.id}
                          >
                            {type.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.toolTypeId && <FieldError>{errors.toolTypeId}</FieldError>}
            </Field>

            <Field data-invalid={!!errors.thumbnailUrl}>
              <FieldLabel>Thumbnail</FieldLabel>
              <FieldDescription className="mb-2 text-xs">
                <strong>Recommended size:</strong> 500×500px (1:1 square)
              </FieldDescription>
              <div className="space-y-3">
                {displayUrl && (
                  <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-muted">
                    <img
                      src={displayUrl}
                      alt="Thumbnail preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleClearThumbnail}
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
                        Square (1:1)
                      </span>
                    ) : (
                      <span className="ml-auto flex items-center gap-1">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Expected 1:1 square
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
                    placeholder="https://cdn.example.com/thumbnail.jpg"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                  />
                )}
              </div>
              <FieldDescription>
                {pendingFile
                  ? `Selected: ${pendingFile.name} (${(pendingFile.size / 1024).toFixed(1)} KB)`
                  : 'Square image for tool card display'
                }
              </FieldDescription>
              {errors.thumbnailUrl && <FieldError>{errors.thumbnailUrl}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="aiEndpoint">AI Endpoint</FieldLabel>
              <Input
                id="aiEndpoint"
                name="aiEndpoint"
                defaultValue={initialData?.aiEndpoint || ''}
                placeholder="/api/ai/process"
              />
              <FieldDescription>API endpoint for AI processing</FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="promptTemplate">Default Prompt Template</FieldLabel>
              <Textarea
                id="promptTemplate"
                name="promptTemplate"
                defaultValue={initialData?.promptTemplate || ''}
                placeholder="Enter default prompt template..."
                rows={3}
              />
            </Field>

            <Field data-invalid={!!errors.configJson}>
              <FieldLabel htmlFor="configJson">Config JSON</FieldLabel>
              <Textarea
                id="configJson"
                name="configJson"
                defaultValue={initialData?.configJson ? JSON.stringify(initialData.configJson as Record<string, unknown>, null, 2) : ''}
                placeholder='{"key": "value"}'
                rows={4}
                className="font-mono text-sm"
                aria-invalid={!!errors.configJson}
              />
              <FieldDescription>Tool-specific configuration in JSON format</FieldDescription>
              {errors.configJson && <FieldError>{errors.configJson}</FieldError>}
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

            <Field orientation="horizontal">
              <FieldLabel htmlFor="isFeatured">Featured</FieldLabel>
              <Switch
                id="isFeatured"
                name="isFeatured"
                defaultChecked={initialData?.isFeatured ?? false}
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
              placeholder={TOOL_TRANSLATIONS_EXAMPLE}
              rows={14}
              className="font-mono text-sm"
              aria-invalid={!!errors.translations || !!errors['translations.en.title']}
            />
            <FieldDescription className="mt-2">
              Required: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">title</code> must be provided for all locales (en, zh, ja, pt).
              Other fields (description, promptTemplate) are optional.
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
              : mode === 'create' ? 'Create Tool' : 'Save Changes'
            }
          </Button>
        </div>
      </div>
    </form>
  );
}
