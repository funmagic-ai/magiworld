'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from '@/components/ui/field';
import { createMedia } from '@/lib/actions/media';

export default function MediaUploadPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    filename: string;
    mimeType: string;
    size: number;
    width?: number;
    height?: number;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);

      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setFileInfo({
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          width: img.width,
          height: img.height,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  async function handleSubmit(formData: FormData) {
    if (!fileInfo || !preview) return;

    setUploading(true);
    try {
      // For now, we'll use a placeholder URL
      // In production, you would upload to S3 first
      const url = formData.get('url') as string || preview;
      const alt = formData.get('alt') as string;

      await createMedia({
        filename: fileInfo.filename,
        url,
        alt: alt || undefined,
        mimeType: fileInfo.mimeType,
        width: fileInfo.width,
        height: fileInfo.height,
        size: fileInfo.size,
      });
    } catch (error) {
      console.error('Upload failed:', error);
      setUploading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Upload Media</h1>
        <p className="text-muted-foreground">Add a new media file to the library.</p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
                ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${preview ? 'border-solid' : ''}
              `}
            >
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <div className="text-sm text-muted-foreground">
                    {fileInfo?.filename} • {fileInfo?.width}x{fileInfo?.height} • {formatBytes(fileInfo?.size || 0)}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPreview(null);
                      setFileInfo(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-muted-foreground">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                      <line x1="16" y1="5" x2="22" y2="5" />
                      <line x1="19" y1="2" x2="19" y2="8" />
                    </svg>
                    <p>Drag and drop an image here, or click to select</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardHeader>
              <CardTitle>Media Details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="url">URL (optional)</FieldLabel>
                  <Input
                    id="url"
                    name="url"
                    placeholder="https://cdn.example.com/image.jpg"
                  />
                  <FieldDescription>
                    Leave empty to use uploaded file. In production, enter the S3 URL after upload.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="alt">Alt Text</FieldLabel>
                  <Input
                    id="alt"
                    name="alt"
                    placeholder="Describe the image for accessibility"
                  />
                  <FieldDescription>Alternative text for screen readers</FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={!preview || uploading}>
            {uploading ? 'Uploading...' : 'Upload Media'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}
