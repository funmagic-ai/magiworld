/**
 * @fileoverview AI Tool Form Component
 * @fileoverview AI工具表单组件
 *
 * Client-side form for creating and editing AI tools with component selection,
 * thumbnail upload, configuration JSON, and multi-locale translations.
 * Tool slugs are restricted to registered components in the web app.
 * 用于创建和编辑AI工具的客户端表单，支持组件选择、
 * 缩略图上传、配置JSON、以及多语言翻译。工具slug限制为web应用中已注册的组件。
 *
 * @module components/forms/tool-form
 */

'use client';

import { useState, useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
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
import { createTool, updateTool, deleteTool, type ToolFormData, type PriceConfig } from '@/lib/actions/tools';
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
import { toolSchema, validToolSlugs } from '@/lib/validations/tool';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useUploadFiles } from '@better-upload/client';
import {
  DEFAULT_TOOL_TRANSLATIONS,
  TOOL_TRANSLATIONS_EXAMPLE,
} from '@/lib/locales';
import { TOOL_CONFIG_EXAMPLES, type ToolSlug } from '@/lib/tool-config-examples';
import { validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/utils/file';
import { useImageDimensions, validateAspectRatio, ASPECT_RATIOS, DEFAULT_RATIO_TOLERANCE } from '@/lib/utils/image';

type TranslationData = {
  title: string;
  description?: string;
};

type ToolData = {
  id: string;
  slug: string;
  toolTypeId: string;
  priceConfig: unknown;
  thumbnailUrl: string | null;
  referenceImages: string[] | null;
  configJson: unknown;
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

type FormState = {
  errors: FieldErrors;
  success?: boolean;
};

export function ToolForm({ initialData, toolTypes, mode }: ToolFormProps) {
  // Thumbnail state: either a URL (existing/pasted) or a pending file
  // 缩略图状态：现有/粘贴的URL或待上传文件
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(initialData?.thumbnailUrl || '');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Use centralized image dimension detection hook / 使用集中的图片尺寸检测Hook
  const { dimensions: imageDimensions, previewUrl } = useImageDimensions(pendingFile);

  // Translations JSON state
  const [translationsJson, setTranslationsJson] = useState<string>(() => {
    if (initialData?.translations && Object.keys(initialData.translations).length > 0) {
      return JSON.stringify(initialData.translations, null, 2);
    }
    return JSON.stringify(DEFAULT_TOOL_TRANSLATIONS, null, 2);
  });

  // Controlled state for comboboxes
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [slugOpen, setSlugOpen] = useState(false);
  const [toolTypeId, setToolTypeId] = useState(initialData?.toolTypeId || '');
  const [toolTypeOpen, setToolTypeOpen] = useState(false);

  // Price config state
  const [priceConfigJson, setPriceConfigJson] = useState<string>(() => {
    if (initialData?.priceConfig) {
      return JSON.stringify(initialData.priceConfig, null, 2);
    }
    return JSON.stringify({ type: 'request', cost_per_call: 0.003 }, null, 2);
  });

  // Config JSON state (controlled for format button)
  const [configJson, setConfigJson] = useState<string>(() => {
    if (initialData?.configJson) {
      return JSON.stringify(initialData.configJson as Record<string, unknown>, null, 2);
    }
    return '';
  });
  const [configJsonError, setConfigJsonError] = useState<string>('');

  // Reference images state (for tools that support style references)
  // Read from the dedicated referenceImages column
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>(() => {
    return initialData?.referenceImages || [];
  });
  const [pendingReferenceFiles, setPendingReferenceFiles] = useState<File[]>([]);
  const [referencePreviewUrls, setReferencePreviewUrls] = useState<string[]>([]);

  // Upload hook - used only during form submission
  const { upload } = useUploadFiles({
    route: 'tools',
    api: '/api/upload/cdn',
  });

  // Form action with useActionState for proper pending state
  const handleFormAction = async (_prevState: FormState, formData: FormData): Promise<FormState> => {
    // Parse config JSON
    let configJson: Record<string, unknown> | undefined;
    const configJsonStr = formData.get('configJson') as string;
    if (configJsonStr) {
      try {
        configJson = JSON.parse(configJsonStr);
      } catch {
        return { errors: { configJson: 'Invalid JSON format' } };
      }
    }

    // Parse translations JSON
    let translations: ToolFormData['translations'];
    try {
      translations = JSON.parse(translationsJson);
    } catch {
      return { errors: { translations: 'Invalid JSON format. Please check the syntax.' } };
    }

    // Parse price config JSON
    let priceConfig: PriceConfig | undefined;
    if (priceConfigJson.trim()) {
      try {
        priceConfig = JSON.parse(priceConfigJson);
      } catch {
        return { errors: { priceConfig: 'Invalid JSON format for price config' } };
      }
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
          const cdnUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
          if (!cdnUrl) {
            return { errors: { thumbnailUrl: 'NEXT_PUBLIC_CLOUDFRONT_URL is not configured' } };
          }
          finalThumbnailUrl = `${cdnUrl}/${uploadedFile.objectInfo.key}`;
        } else {
          return { errors: { thumbnailUrl: 'Upload failed - no files returned' } };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload thumbnail';
        return { errors: { thumbnailUrl: `Upload failed: ${message}` } };
      }
    }

    // Upload pending reference images and merge with existing URLs
    let finalReferenceImageUrls = [...referenceImageUrls];
    if (pendingReferenceFiles.length > 0) {
      try {
        const slugValue = formData.get('slug') as string;
        const result = await upload(pendingReferenceFiles, {
          metadata: { toolId: slugValue || 'misc', type: 'reference-images' }
        });

        if (result.files && result.files.length > 0) {
          const cdnUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
          if (!cdnUrl) {
            return { errors: { referenceImages: 'NEXT_PUBLIC_CLOUDFRONT_URL is not configured' } };
          }
          const newUrls = result.files.map(f => `${cdnUrl}/${f.objectInfo.key}`);
          finalReferenceImageUrls = [...finalReferenceImageUrls, ...newUrls];
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to upload reference images';
        return { errors: { referenceImages: `Upload failed: ${message}` } };
      }
    }

    const rawData = {
      slug: formData.get('slug') as string,
      toolTypeId: formData.get('toolTypeId') as string,
      priceConfig,
      thumbnailUrl: finalThumbnailUrl || undefined,
      referenceImages: finalReferenceImageUrls.length > 0 ? finalReferenceImageUrls : undefined,
      configJson,
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
      return { errors: fieldErrors };
    }

    const data: ToolFormData = result.data;

    try {
      if (mode === 'edit' && initialData?.id) {
        await updateTool(initialData.id, data);
      } else {
        await createTool(data);
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

  // Alias errors from formState for easier access
  const errors = formState.errors;

  // Check if image ratio is 1:1 (square) / 检查图片比例是否为1:1（正方形）
  const getRatioStatus = () => {
    if (!imageDimensions) return null;
    const { ratio, label } = ASPECT_RATIOS['1:1'];
    return validateAspectRatio(imageDimensions, ratio, label, DEFAULT_RATIO_TOLERANCE);
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

  // Format JSON with proper indentation (for translations)
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

  // Format Config JSON with proper indentation
  const handleFormatConfigJson = () => {
    if (!configJson.trim()) {
      setConfigJsonError('');
      return;
    }
    try {
      const parsed = JSON.parse(configJson);
      setConfigJson(JSON.stringify(parsed, null, 2));
      setConfigJsonError('');
    } catch {
      setConfigJsonError('Invalid JSON format - please fix the syntax');
    }
  };

  // Reference image handlers
  const handleReferenceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    for (const file of files) {
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.isValid) {
        alert(`${file.name}: ${sizeValidation.error}`);
        continue;
      }
      validFiles.push(file);
      // Create preview URL
      newPreviewUrls.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setPendingReferenceFiles((prev) => [...prev, ...validFiles]);
      setReferencePreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    }
    e.target.value = '';
  };

  const handleRemoveReferenceUrl = (index: number) => {
    setReferenceImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemovePendingReference = (index: number) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(referencePreviewUrls[index]);
    setPendingReferenceFiles((prev) => prev.filter((_, i) => i !== index));
    setReferencePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // State for Advanced Config collapsible
  const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false);

  async function handleDelete() {
    if (initialData?.id) {
      await deleteTool(initialData.id);
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
                      width={448}
                      height={252}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleClearThumbnail}
                      aria-label="Remove thumbnail"
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
                      (ratio: {ratioStatus.actualRatioFormatted})
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
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="sr-only"
                      disabled={isPending}
                      aria-label={displayUrl ? 'Change thumbnail image' : 'Select thumbnail image'}
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

            <Field data-invalid={!!errors.configJson || !!configJsonError}>
              <div className="flex items-center justify-between mb-2">
                <FieldLabel htmlFor="configJson" className="mb-0">Config JSON</FieldLabel>
                <Button type="button" variant="outline" size="sm" onClick={handleFormatConfigJson}>
                  Format JSON
                </Button>
              </div>
              <Textarea
                id="configJson"
                name="configJson"
                value={configJson}
                onChange={(e) => {
                  setConfigJson(e.target.value);
                  setConfigJsonError('');
                }}
                placeholder='{"key": "value"}'
                rows={8}
                className="font-mono text-sm"
                aria-invalid={!!errors.configJson || !!configJsonError}
              />
              <FieldDescription>Tool-specific configuration in JSON format</FieldDescription>
              {configJsonError && <FieldError>{configJsonError}</FieldError>}
              {errors.configJson && <FieldError>{errors.configJson}</FieldError>}

              {/* Advanced Config Collapsible */}
              <Collapsible open={advancedConfigOpen} onOpenChange={setAdvancedConfigOpen} className="mt-4">
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-left text-sm font-medium hover:bg-muted transition-colors">
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Advanced Config
                  </span>
                  <svg
                    className={cn("h-4 w-4 transition-transform", advancedConfigOpen && "rotate-180")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-6">
                  {/* Configuration Tips */}
                  {slug && TOOL_CONFIG_EXAMPLES[slug as ToolSlug] && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-blue-800 dark:text-blue-200">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Configuration Tips for "{slug}"
                      </h4>
                      <p className="mb-3 text-sm text-blue-700 dark:text-blue-300">
                        {TOOL_CONFIG_EXAMPLES[slug as ToolSlug].description}
                      </p>
                      <ul className="mb-4 space-y-1 text-sm text-blue-700 dark:text-blue-300">
                        {TOOL_CONFIG_EXAMPLES[slug as ToolSlug].tips.map((tip, i) => (
                          <li key={i} className={tip === '' ? 'h-2' : 'flex items-start gap-2'}>
                            {tip && (
                              <>
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" />
                                <span className="whitespace-pre-wrap font-mono text-xs">{tip}</span>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Example Configuration:
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setConfigJson(JSON.stringify(
                                TOOL_CONFIG_EXAMPLES[slug as ToolSlug].exampleConfig,
                                null,
                                2
                              ));
                              setConfigJsonError('');
                            }}
                          >
                            Use Example
                          </Button>
                        </div>
                        <pre className="overflow-x-auto rounded bg-blue-100 p-3 text-xs text-blue-900 dark:bg-blue-900 dark:text-blue-100">
                          {JSON.stringify(TOOL_CONFIG_EXAMPLES[slug as ToolSlug].exampleConfig, null, 2)}
                        </pre>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          <strong>Required Providers:</strong>{' '}
                          {TOOL_CONFIG_EXAMPLES[slug as ToolSlug].requiredProviders.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reference Images Section */}
                  <div className="rounded-lg border p-4" data-invalid={!!errors.referenceImages}>
                    <h4 className="mb-3 flex items-center gap-2 font-semibold">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Reference Images
                    </h4>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Upload reference images to guide AI transformations. These images help the model understand the desired style or aesthetic.
                    </p>

                    {/* Display existing uploaded reference images */}
                    {referenceImageUrls.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-muted-foreground">Uploaded Images:</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {referenceImageUrls.map((url, index) => (
                            <div key={`uploaded-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                              <img
                                src={url}
                                alt={`Reference ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveReferenceUrl(index)}
                                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label={`Remove reference image ${index + 1}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                              <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                                Saved
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Display pending reference images (to be uploaded on save) */}
                    {pendingReferenceFiles.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-sm font-medium text-amber-600">Pending Upload ({pendingReferenceFiles.length}):</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {referencePreviewUrls.map((url, index) => (
                            <div key={`pending-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-amber-400 bg-amber-50">
                              <img
                                src={url}
                                alt={`Pending ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePendingReference(index)}
                                className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label={`Remove pending image ${index + 1}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                              <div className="absolute bottom-1 left-1 rounded bg-amber-600 px-1.5 py-0.5 text-xs text-white">
                                Will upload on save
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Upload button */}
                    <div className="flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleReferenceFileSelect}
                          className="sr-only"
                          disabled={isPending}
                          aria-label="Add reference images"
                        />
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Reference Images
                      </label>
                      <span className="text-sm text-muted-foreground">
                        Max {MAX_FILE_SIZE_MB} MB each
                      </span>
                    </div>

                    {errors.referenceImages && <FieldError className="mt-2">{errors.referenceImages}</FieldError>}

                    <div className="mt-4 rounded-lg border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
                      <strong>Tip:</strong> Upload reference images showing the desired style. Users can select one when using the tool.
                      Reference images are stored in a dedicated column for reliable ordering.
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={!!errors.priceConfig}>
              <FieldLabel htmlFor="priceConfig">Price Configuration (JSON)</FieldLabel>
              <Textarea
                id="priceConfig"
                value={priceConfigJson}
                onChange={(e) => setPriceConfigJson(e.target.value)}
                placeholder='{"type": "request", "cost_per_call": 0.003}'
                rows={4}
                className="font-mono text-sm"
                aria-invalid={!!errors.priceConfig}
              />
              <FieldDescription>
                Pricing structure. Types: <code className="rounded bg-muted px-1 text-xs">token</code> (input_per_1k, output_per_1k),
                <code className="rounded bg-muted px-1 text-xs">request</code> (cost_per_call),
                <code className="rounded bg-muted px-1 text-xs">image</code> (cost_per_image),
                <code className="rounded bg-muted px-1 text-xs">second</code> (cost_per_second).
                Provider/model selection is handled in tool processor code.
              </FieldDescription>
              {errors.priceConfig && <FieldError>{errors.priceConfig}</FieldError>}
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
                setJsonError('');
              }}
              placeholder={TOOL_TRANSLATIONS_EXAMPLE}
              rows={14}
              className="font-mono text-sm"
              aria-invalid={!!errors.translations || !!errors['translations.en.title'] || !!jsonError}
            />
            <FieldDescription className="mt-2">
              Required: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">title</code> must be provided for all locales (en, zh, ja, pt).
              The <code className="rounded bg-muted px-1.5 py-0.5 text-xs">description</code> field is optional.
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
                  <AlertDialogTitle>Delete Tool</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this tool? This action cannot be undone.
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
              : mode === 'create' ? 'Create Tool' : 'Save Changes'
            }
          </Button>
        </div>
      </div>
    </form>
  );
}
