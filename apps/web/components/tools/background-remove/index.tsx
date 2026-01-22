
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ImageUploader } from '../shared/image-uploader';
import { ResultPreview } from './result-preview';
import { GenerationHistory, type Generation } from '../shared/generation-history';
import { useTask } from '../shared/use-task';
import { useUpload } from '../shared/use-upload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';

type ToolData = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  toolType: {
    slug: string;
    name: string;
    badgeColor: string;
  };
};

interface BackgroundRemoveInterfaceProps {
  tool: ToolData;
}

export function BackgroundRemoveInterface({ tool }: BackgroundRemoveInterfaceProps) {
  const t = useTranslations('bgRemove');

  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const task = useTask();
  const upload = useUpload({ route: 'tools' });

  const selectedGeneration = generations.find((g) => g.id === selectedGenerationId);
  const isUploading = upload.isUploading;
  const isProcessing = task.isLoading || isUploading;
  const progress = isUploading ? upload.progress * 0.2 : 20 + task.progress * 0.8;

  const resultImage = task.outputData?.resultUrl ||
    (selectedGeneration?.status === 'complete' ? selectedGeneration.imageUrl : null);

  useEffect(() => {
    if (task.taskId && task.status === 'success' && task.outputData?.resultUrl) {
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === task.taskId
            ? {
                ...g,
                status: 'complete' as const,
                progress: 100,
                imageUrl: task.outputData?.resultUrl as string,
              }
            : g
        )
      );
    } else if (task.taskId && task.status === 'failed') {
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === task.taskId
            ? { ...g, status: 'error' as const, progress: 0 }
            : g
        )
      );
    } else if (task.taskId && task.status === 'processing') {
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === task.taskId
            ? { ...g, progress: task.progress }
            : g
        )
      );
    }
  }, [task.taskId, task.status, task.progress, task.outputData?.resultUrl]);

  const handleImageSelect = useCallback((imageDataUrl: string, file: File) => {
    setInputImage(imageDataUrl);
    setInputFile(file);
    task.reset();
  }, [task]);

  const handleClearInput = useCallback(() => {
    setInputImage(null);
    setInputFile(null);
    task.reset();
  }, [task]);

  const handleProcess = useCallback(async () => {
    if (!inputFile) return;

    const generationId = crypto.randomUUID();
    const newGeneration: Generation = {
      id: generationId,
      status: 'loading',
      progress: 0,
      createdAt: new Date(),
    };

    setGenerations((prev) => [newGeneration, ...prev]);
    setSelectedGenerationId(generationId);

    try {
      const uploadResult = await upload.upload(inputFile);
      if (!uploadResult) {
        throw new Error('Failed to upload image');
      }

      setGenerations((prev) =>
        prev.map((g) =>
          g.id === generationId ? { ...g, progress: 20 } : g
        )
      );
      // Use UNSIGNED URL for task creation (never expires in database)
      const taskId = await task.createTask({
        toolId: tool.id,
        inputParams: {
          imageUrl: uploadResult.unsignedUrl,
        },
      });

      if (!taskId) {
        throw new Error(task.error || 'Failed to create task');
      }

      setGenerations((prev) =>
        prev.map((g) =>
          g.id === generationId ? { ...g, id: taskId } : g
        )
      );
      setSelectedGenerationId(taskId);
    } catch (error) {
      setGenerations((prev) =>
        prev.map((g) =>
          g.id === generationId
            ? { ...g, status: 'error' as const, progress: 0 }
            : g
        )
      );
      console.error('Processing error:', error);
    }
  }, [inputFile, upload, task, tool.id]);

  const handleCancelProcessing = useCallback((id: string) => {
    task.cancel();
    setGenerations((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, status: 'error' as const, progress: 0 } : g
      )
    );
  }, [task]);

  const handleDeleteGeneration = useCallback((id: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== id));
    if (selectedGenerationId === id) {
      const remaining = generations.filter((g) => g.id !== id);
      setSelectedGenerationId(remaining[0]?.id ?? null);
    }
  }, [generations, selectedGenerationId]);

  const handleReset = useCallback(() => {
    setInputImage(null);
    setInputFile(null);
    task.reset();
    upload.reset();
  }, [task, upload]);

  const handleDownload = useCallback(async () => {
    if (!resultImage) return;

    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'background-removed.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(resultImage, '_blank');
    }
  }, [resultImage]);

  const handleCopy = useCallback(async () => {
    if (!resultImage) return;

    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
    } catch (error) {
      console.error('Failed to copy image:', error);
    }
  }, [resultImage]);

  const handleUseAsInput = useCallback(() => {
    if (resultImage) {
      setInputImage(resultImage);
      setInputFile(null);
      task.reset();
      setIsSaved(false);
    }
  }, [resultImage, task]);

  const handleSave = useCallback(async () => {
    if (!task.taskId || isSaved) return;

    try {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.taskId }),
      });

      if (response.ok) {
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Failed to save asset:', error);
    }
  }, [task.taskId, isSaved]);

  useEffect(() => {
    if (task.taskId) {
      setIsSaved(false);
    }
  }, [task.taskId]);

  const canProcess = inputFile && !isProcessing;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{tool.title}</h1>
            <Badge variant={tool.toolType.badgeColor as 'default' | 'secondary' | 'outline'}>
              {tool.toolType.name}
            </Badge>
          </div>
          {inputImage && (
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>
        {tool.description && (
          <p className="text-muted-foreground">{tool.description}</p>
        )}
      </div>

      {/* Error display */}
      {(task.error || upload.error) && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {task.error || upload.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t('upload.title')}</h2>
          </div>
          <div className="aspect-square lg:aspect-[4/3]">
            <ImageUploader
              onImageSelect={handleImageSelect}
              previewUrl={inputImage}
              onClear={handleClearInput}
              disabled={isProcessing}
              className="h-full"
            />
          </div>
          <Button
            onClick={handleProcess}
            disabled={!canProcess}
            size="lg"
            className="w-full"
          >
            {isProcessing ? t('actions.processing') : t('actions.process')}
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">{t('result.title')}</h2>
          </div>
          <div className="aspect-square lg:aspect-[4/3]">
            <ResultPreview
              originalImage={inputImage}
              resultImage={resultImage ?? null}
              isProcessing={isProcessing}
              progress={progress}
              isSaved={isSaved}
              onCancel={() => selectedGenerationId && handleCancelProcessing(selectedGenerationId)}
              onDownload={handleDownload}
              onCopy={handleCopy}
              onUseAsInput={handleUseAsInput}
              onSave={task.taskId && task.status === 'success' ? handleSave : undefined}
            />
          </div>
        </div>
      </div>

      {generations.length > 0 && (
        <GenerationHistory
          generations={generations}
          selectedId={selectedGenerationId ?? undefined}
          onSelect={setSelectedGenerationId}
          onCancel={handleCancelProcessing}
          onDelete={handleDeleteGeneration}
        />
      )}
    </div>
  );
}
