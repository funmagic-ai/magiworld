/**
 * @fileoverview Fig Me Tool Interface
 * @fileoverview Fig Me 工具界面
 *
 * Progressive reveal layout for creating 3D figurines from user photos:
 * Step 1 (input): Upload photo + select style reference → Transform
 * Step 2 (transformed): View result → Retry or Generate 3D
 * Step 3 (complete): View 3D model → Regenerate or Download
 *
 * 从用户照片创建3D人偶的渐进式布局：
 * 步骤1（输入）：上传照片 + 选择风格参考 → 转换
 * 步骤2（已转换）：查看结果 → 重试或生成3D
 * 步骤3（完成）：查看3D模型 → 重新生成或下载
 *
 * @module components/tools/fig-me
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ImageUploader } from '../shared/image-uploader';
import { ProgressBar } from '../shared/progress-bar';
import { useTask } from '../shared/use-task';
import { useUpload } from '../shared/use-upload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon,
  Delete02Icon,
  Download04Icon,
  Copy01Icon,
  Tick02Icon,
  RefreshIcon,
  ArrowRight01Icon,
  CubeIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

/**
 * Tool data passed from the router
 */
type ToolData = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  referenceImages?: string[] | null;
  configJson?: unknown;
  toolType: {
    slug: string;
    name: string;
    badgeColor: string;
  };
};

export interface FigMeInterfaceProps {
  tool: ToolData;
}

/**
 * Maximum number of reference images to display
 */
const MAX_REFERENCE_IMAGES = 8;

/**
 * Get reference images from the dedicated column
 * Limited to MAX_REFERENCE_IMAGES
 */
function getReferenceImages(images: string[] | null | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .filter((url): url is string => typeof url === 'string')
    .slice(0, MAX_REFERENCE_IMAGES);
}

/**
 * UI state machine for the tool flow
 */
type UIStep = 'input' | 'transforming' | 'transformed' | 'generating3d' | 'complete';

interface TaskState {
  taskId: string | null;
  resultUrl: string | null;
  status: 'idle' | 'processing' | 'success' | 'failed';
  error: string | null;
}

export function FigMeInterface({ tool }: FigMeInterfaceProps) {
  const t = useTranslations('figMe');

  // Get reference images from the dedicated column
  const referenceImages = getReferenceImages(tool.referenceImages);

  // UI step state
  const [uiStep, setUIStep] = useState<UIStep>('input');

  // Input image state
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputFile, setInputFile] = useState<File | null>(null);
  // Store uploaded URL to avoid re-uploading on retry
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Selected reference image for style transfer (user must actively choose)
  const [selectedReferenceUrl, setSelectedReferenceUrl] = useState<string | null>(null);

  // Transform task state
  const [transformTask, setTransformTask] = useState<TaskState>({
    taskId: null,
    resultUrl: null,
    status: 'idle',
    error: null,
  });

  // 3D task state
  const [task3D, setTask3D] = useState<TaskState>({
    taskId: null,
    resultUrl: null,
    status: 'idle',
    error: null,
  });

  // Hooks
  const transformTaskHook = useTask();
  const task3DHook = useTask();
  const upload = useUpload({ route: 'tools' });

  // Sync transform task hook state
  useEffect(() => {
    if (transformTaskHook.taskId) {
      const newStatus = transformTaskHook.isLoading
        ? 'processing'
        : transformTaskHook.status === 'success'
          ? 'success'
          : transformTaskHook.status === 'failed'
            ? 'failed'
            : transformTask.status;

      setTransformTask((prev) => ({
        ...prev,
        taskId: transformTaskHook.taskId,
        status: newStatus,
        resultUrl: (transformTaskHook.outputData?.resultUrl as string) || prev.resultUrl,
        error: transformTaskHook.error,
      }));

      // Update UI step based on task status
      if (transformTaskHook.isLoading) {
        setUIStep('transforming');
      } else if (transformTaskHook.status === 'success' && transformTaskHook.outputData?.resultUrl) {
        setUIStep('transformed');
      }
    }
  }, [
    transformTaskHook.taskId,
    transformTaskHook.status,
    transformTaskHook.isLoading,
    transformTaskHook.outputData,
    transformTaskHook.error,
    transformTask.status,
  ]);

  // Sync 3D task hook state
  useEffect(() => {
    if (task3DHook.taskId) {
      const newStatus = task3DHook.isLoading
        ? 'processing'
        : task3DHook.status === 'success'
          ? 'success'
          : task3DHook.status === 'failed'
            ? 'failed'
            : task3D.status;

      setTask3D((prev) => ({
        ...prev,
        taskId: task3DHook.taskId,
        status: newStatus,
        resultUrl: (task3DHook.outputData?.resultUrl as string) || prev.resultUrl,
        error: task3DHook.error,
      }));

      // Update UI step based on task status
      if (task3DHook.isLoading) {
        setUIStep('generating3d');
      } else if (task3DHook.status === 'success') {
        setUIStep('complete');
      }
    }
  }, [task3DHook.taskId, task3DHook.status, task3DHook.isLoading, task3DHook.outputData, task3DHook.error, task3D.status]);

  // Handlers
  const handleImageSelect = useCallback((imageDataUrl: string, file: File) => {
    setInputImage(imageDataUrl);
    setInputFile(file);
    // Clear uploaded URL when new image is selected
    setUploadedImageUrl(null);
  }, []);

  const handleClearAll = useCallback(() => {
    setInputImage(null);
    setInputFile(null);
    setUploadedImageUrl(null);
    setUIStep('input');
    setTransformTask({ taskId: null, resultUrl: null, status: 'idle', error: null });
    setTask3D({ taskId: null, resultUrl: null, status: 'idle', error: null });
    transformTaskHook.reset();
    task3DHook.reset();
    upload.reset();
  }, [transformTaskHook, task3DHook, upload]);

  const handleBack = useCallback(() => {
    if (uiStep === 'transformed' || uiStep === 'transforming') {
      // Go back to input, keep the uploaded image
      setUIStep('input');
      setTransformTask({ taskId: null, resultUrl: null, status: 'idle', error: null });
      transformTaskHook.reset();
    } else if (uiStep === 'complete' || uiStep === 'generating3d') {
      // Go back to transformed result
      setUIStep('transformed');
      setTask3D({ taskId: null, resultUrl: null, status: 'idle', error: null });
      task3DHook.reset();
    }
  }, [uiStep, transformTaskHook, task3DHook]);

  const handleTransform = useCallback(async () => {
    if (!inputFile && !uploadedImageUrl) return;

    setTransformTask((prev) => ({ ...prev, status: 'processing', error: null }));
    setUIStep('transforming');

    try {
      // Reuse existing uploaded URL or upload new image
      let imageUrl = uploadedImageUrl;
      if (!imageUrl && inputFile) {
        imageUrl = await upload.upload(inputFile);
        if (!imageUrl) {
          throw new Error('Failed to upload image');
        }
        // Store for retry
        setUploadedImageUrl(imageUrl);
      }

      // Create transform task with reference image
      const taskId = await transformTaskHook.createTask({
        toolId: tool.id,
        inputParams: {
          step: 'transform',
          imageUrl,
          referenceImageUrl: selectedReferenceUrl || undefined,
        },
      });

      if (!taskId) {
        throw new Error(transformTaskHook.error || 'Failed to create task');
      }
    } catch (error) {
      setTransformTask((prev) => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Transform failed',
      }));
      setUIStep('input');
    }
  }, [inputFile, uploadedImageUrl, upload, transformTaskHook, tool.id, selectedReferenceUrl]);

  const handleRetryTransform = useCallback(() => {
    setTransformTask({ taskId: null, resultUrl: null, status: 'idle', error: null });
    setTask3D({ taskId: null, resultUrl: null, status: 'idle', error: null });
    transformTaskHook.reset();
    task3DHook.reset();
    handleTransform();
  }, [transformTaskHook, task3DHook, handleTransform]);

  const handleGenerate3D = useCallback(async () => {
    if (!transformTask.resultUrl || !transformTask.taskId) return;

    setTask3D((prev) => ({ ...prev, status: 'processing', error: null }));
    setUIStep('generating3d');

    try {
      const taskId = await task3DHook.createTask({
        toolId: tool.id,
        inputParams: {
          step: '3d',
          imageUrl: transformTask.resultUrl,
          parentTaskId: transformTask.taskId,
        },
      });

      if (!taskId) {
        throw new Error(task3DHook.error || 'Failed to create 3D task');
      }
    } catch (error) {
      setTask3D((prev) => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : '3D generation failed',
      }));
      setUIStep('transformed');
    }
  }, [transformTask.resultUrl, transformTask.taskId, task3DHook, tool.id]);

  const handleRetry3D = useCallback(() => {
    setTask3D({ taskId: null, resultUrl: null, status: 'idle', error: null });
    task3DHook.reset();
    handleGenerate3D();
  }, [task3DHook, handleGenerate3D]);

  const handleCancelTransform = useCallback(() => {
    transformTaskHook.cancel();
    setTransformTask((prev) => ({ ...prev, status: 'failed', error: 'Cancelled' }));
    setUIStep('input');
  }, [transformTaskHook]);

  const handleCancel3D = useCallback(() => {
    task3DHook.cancel();
    setTask3D((prev) => ({ ...prev, status: 'failed', error: 'Cancelled' }));
    setUIStep('transformed');
  }, [task3DHook]);

  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  const handleCopy = useCallback(async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  }, []);

  // Progress calculations
  const transformProgress = upload.isUploading
    ? upload.progress * 0.2
    : 20 + transformTaskHook.progress * 0.8;

  const task3DProgress = task3DHook.progress;

  const canTransform = inputFile && selectedReferenceUrl && uiStep === 'input';
  const error = transformTask.error || task3D.error || upload.error;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {uiStep !== 'input' && (
              <Button onClick={handleBack} variant="ghost" size="icon" className="shrink-0">
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-5 h-5" />
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{tool.title}</h1>
                <Badge variant={tool.toolType.badgeColor as 'default' | 'secondary' | 'outline'}>
                  {tool.toolType.name}
                </Badge>
              </div>
              {tool.description && <p className="text-muted-foreground text-sm">{tool.description}</p>}
            </div>
          </div>
          {uiStep !== 'input' && (
            <Button onClick={handleClearAll} variant="outline" size="sm" className="gap-1.5 shrink-0">
              <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
              <span className="hidden sm:inline">{t('actions.reset')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Input - Style Selection (Primary) + Upload (Secondary) */}
      {uiStep === 'input' && (
        <div className="space-y-6">
          {/* Style Selection - Primary, prominent section */}
          {referenceImages.length > 0 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-lg font-semibold">{t('sections.referenceStyle.title')}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {referenceImages.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedReferenceUrl(url)}
                      className={cn(
                        'relative aspect-square rounded-xl overflow-hidden border-3 transition-all',
                        'hover:border-primary/50 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                        selectedReferenceUrl === url
                          ? 'border-primary ring-2 ring-primary ring-offset-2 scale-[1.02]'
                          : 'border-muted'
                      )}
                    >
                      <img
                        src={url}
                        alt={`${t('sections.referenceStyle.styleAlt')} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {selectedReferenceUrl === url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="bg-primary rounded-full p-1.5">
                            <HugeiconsIcon icon={Tick02Icon} className="w-5 h-5 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload + Transform - Secondary, compact section */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Compact upload area */}
                <div className="w-full sm:w-48 shrink-0 space-y-2">
                  <h3 className="font-medium text-sm text-muted-foreground">{t('sections.upload.title')}</h3>
                  <ImageUploader
                    onImageSelect={handleImageSelect}
                    previewUrl={inputImage}
                    onClear={() => {
                      setInputImage(null);
                      setInputFile(null);
                    }}
                    className="aspect-square"
                    compact
                  />
                </div>

                {/* Transform button area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
                  <Button
                    onClick={handleTransform}
                    disabled={!canTransform}
                    size="lg"
                    className="gap-2 px-8"
                  >
                    {t('actions.transform')}
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5" />
                  </Button>
                  {!selectedReferenceUrl && referenceImages.length > 0 && (
                    <p className="text-sm text-muted-foreground">{t('hints.selectStyle')}</p>
                  )}
                  {!inputFile && selectedReferenceUrl && (
                    <p className="text-sm text-muted-foreground">{t('hints.uploadPhoto')}</p>
                  )}
                  {!inputFile && !selectedReferenceUrl && referenceImages.length > 0 && (
                    <p className="text-sm text-muted-foreground">{t('hints.selectStyleAndUpload')}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Transforming - Progress */}
      {uiStep === 'transforming' && (
        <Card>
          <CardContent className="p-6">
            <div className="max-w-md mx-auto aspect-square">
              <ProgressBar
                progress={transformProgress}
                onCancel={handleCancelTransform}
                message={upload.isUploading ? t('progress.uploading') : t('progress.transforming')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Transformed - Compare + Decide */}
      {uiStep === 'transformed' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Input thumbnail */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('sections.upload.title')}</h4>
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                  {inputImage && (
                    <img src={inputImage} alt="Original" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>

              {/* Transform result */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('sections.transform.title')}</h4>
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted relative group">
                  {transformTask.resultUrl && (
                    <>
                      <img
                        src={transformTask.resultUrl}
                        alt="Figurine"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => handleDownload(transformTask.resultUrl!, 'figurine-transform.png')}
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <HugeiconsIcon icon={Download04Icon} className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleCopy(transformTask.resultUrl!)}
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <HugeiconsIcon icon={Copy01Icon} className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleRetryTransform} variant="outline" size="lg" className="flex-1 gap-2">
                <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" />
                {t('actions.retry')}
              </Button>
              <Button onClick={handleGenerate3D} size="lg" className="flex-1 gap-2">
                {t('actions.generate3d')}
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Generating 3D - Progress */}
      {uiStep === 'generating3d' && (
        <Card>
          <CardContent className="p-6">
            <div className="max-w-md mx-auto aspect-square">
              <ProgressBar
                progress={task3DProgress}
                onCancel={handleCancel3D}
                message={t('progress.generating3d')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Complete - 3D Result */}
      {uiStep === 'complete' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Figurine thumbnail */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('sections.transform.title')}</h4>
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                  {transformTask.resultUrl && (
                    <img
                      src={transformTask.resultUrl}
                      alt="Figurine"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>

              {/* 3D Model result */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{t('sections.model3d.title')}</h4>
                <div className="aspect-square rounded-lg overflow-hidden border bg-muted relative group">
                  {/* TODO: Replace with 3D model viewer when real 3D SDK is integrated */}
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/10 to-primary/5">
                    <HugeiconsIcon icon={CubeIcon} className="w-16 h-16 text-primary animate-pulse" />
                    <div className="text-center">
                      <p className="font-medium text-primary">{t('sections.model3d.ready')}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('sections.model3d.mockNotice')}
                      </p>
                    </div>
                  </div>
                  {task3D.resultUrl && (
                    <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={() => handleDownload(task3D.resultUrl!, 'figurine-3d.glb')}
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <HugeiconsIcon icon={Download04Icon} className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button onClick={handleRetry3D} variant="outline" size="lg" className="flex-1 gap-2">
                <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" />
                {t('actions.retry3d')}
              </Button>
              <Button
                onClick={() => task3D.resultUrl && handleDownload(task3D.resultUrl, 'figurine-3d.glb')}
                size="lg"
                className="flex-1 gap-2"
                disabled={!task3D.resultUrl}
              >
                <HugeiconsIcon icon={Download04Icon} className="w-5 h-5" />
                {t('actions.download')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
