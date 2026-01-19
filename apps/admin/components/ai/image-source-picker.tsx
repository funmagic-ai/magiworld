/**
 * @fileoverview Image Source Picker Component
 * @fileoverview 图片来源选择器组件
 *
 * Allows users to either upload an image or select from the library.
 * Provides a unified interface for image input across AI tools.
 * 允许用户上传图片或从媒体库选择图片。
 * 为所有AI工具提供统一的图片输入界面。
 *
 * @module components/ai/image-source-picker
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Upload04Icon,
  FolderLibraryIcon,
  Cancel01Icon,
  Home01Icon,
  ArrowRight01Icon,
  Folder01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import { getFolderContents, signUrl, type Folder, type MediaItem } from '@/lib/actions/library';
import { validateFileSize, MAX_FILE_SIZE_MB } from '@/lib/utils/file';
import { useUpload } from './hooks/use-upload';

export interface SelectedImage {
  url: string;
  filename: string;
  source: 'upload' | 'library';
  mediaId?: string;
}

interface ImageSourcePickerProps {
  value?: SelectedImage | null;
  onChange: (image: SelectedImage | null) => void;
  disabled?: boolean;
}

export function ImageSourcePicker({ value, onChange, disabled }: ImageSourcePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const { upload, isUploading, progress, error, reset: resetUpload } = useUpload();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size before processing
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.isValid) {
      alert(sizeValidation.error);
      return;
    }

    // Upload to S3 and get CloudFront URL
    const uploadedUrl = await upload(file);
    if (uploadedUrl) {
      // Sign the URL for display (private CloudFront requires signed URLs)
      const signedUrl = await signUrl(uploadedUrl);
      onChange({
        url: signedUrl,
        filename: file.name,
        source: 'upload',
      });
    }
  }, [onChange, upload]);

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

  const handleLibrarySelect = (item: MediaItem) => {
    onChange({
      url: item.url,
      filename: item.filename,
      source: 'library',
      mediaId: item.id,
    });
    setShowLibrary(false);
  };

  const handleClear = () => {
    onChange(null);
    resetUpload();
  };

  // If image is selected, show preview
  if (value) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-32 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <img
                src={value.url}
                alt={value.filename}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{value.filename}</p>
              <p className="text-sm text-muted-foreground">
                {value.source === 'upload' ? 'Uploaded' : 'From Library'}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleClear}
                disabled={disabled}
              >
                <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
                Remove
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No image selected - show picker (or uploading state)
  return (
    <Card>
      <CardContent className="p-4">
        {/* Show upload progress or error */}
        {(isUploading || error) && (
          <div className="mb-4 p-4 rounded-lg border bg-muted/50">
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    className="h-4 w-4 animate-spin text-primary"
                    strokeWidth={2}
                  />
                  <span className="text-sm font-medium">Uploading...</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
            {error && (
              <div className="text-sm text-destructive">
                Upload failed: {error}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Upload Option */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${disabled || isUploading ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={disabled || isUploading}
            />
            <HugeiconsIcon
              icon={Upload04Icon}
              className="h-8 w-8 mx-auto mb-2 text-muted-foreground"
              strokeWidth={2}
            />
            <p className="text-sm font-medium">Upload Image</p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag & drop or click (max {MAX_FILE_SIZE_MB}MB)
            </p>
          </div>

          {/* Library Option */}
          <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
            <DialogTrigger
              disabled={disabled || isUploading}
              render={
                <button
                  type="button"
                  className={`
                    border-2 border-dashed rounded-lg p-6 text-center transition-colors
                    border-muted-foreground/25 hover:border-primary/50
                    ${disabled || isUploading ? 'opacity-50 pointer-events-none' : ''}
                  `}
                />
              }
            >
              <HugeiconsIcon
                icon={FolderLibraryIcon}
                className="h-8 w-8 mx-auto mb-2 text-muted-foreground"
                strokeWidth={2}
              />
              <p className="text-sm font-medium">Select from Library</p>
              <p className="text-xs text-muted-foreground mt-1">
                Browse your media files
              </p>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Select Image from Library</DialogTitle>
              </DialogHeader>
              <LibraryBrowser onSelect={handleLibrarySelect} />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Library browser component for the modal
 */
interface LibraryBrowserProps {
  onSelect: (item: MediaItem) => void;
}

function LibraryBrowser({ onSelect }: LibraryBrowserProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInMagiFolder, setIsInMagiFolder] = useState(false);

  // Load folder contents
  const loadFolder = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const contents = await getFolderContents(folderId);

      // Check if we're inside the magi folder hierarchy
      const inMagi = contents.currentFolder?.name === 'magi' ||
        contents.breadcrumbs.some(b => b.name === 'magi');
      setIsInMagiFolder(inMagi);

      // Sort date folders (yyyymmdd) in descending order when inside magi folder
      let sortedFolders = contents.folders;
      if (inMagi || contents.currentFolder?.name === 'magi') {
        sortedFolders = [...contents.folders].sort((a, b) => {
          // Check if folder names are date strings (all digits)
          const aIsDate = /^\d{8}$/.test(a.name);
          const bIsDate = /^\d{8}$/.test(b.name);
          if (aIsDate && bIsDate) {
            return b.name.localeCompare(a.name); // Descending order
          }
          return a.name.localeCompare(b.name); // Default alphabetical
        });
      }

      setFolders(sortedFolders);
      setMedia(contents.media.filter(m => m.mimeType?.startsWith('image/')));
      setBreadcrumbs(contents.breadcrumbs);
      setCurrentFolderId(folderId);
    } catch (error) {
      console.error('Failed to load folder:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFolder(null);
  }, [loadFolder]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm pb-3 border-b">
        <button
          onClick={() => loadFolder(null)}
          className={`flex items-center gap-1 hover:text-foreground ${
            !currentFolderId ? 'text-foreground font-medium' : 'text-muted-foreground'
          }`}
        >
          <HugeiconsIcon icon={Home01Icon} className="h-4 w-4" strokeWidth={2} />
          Root
        </button>
        {breadcrumbs.map((folder) => (
          <div key={folder.id} className="flex items-center gap-1">
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={2}
            />
            <button
              onClick={() => loadFolder(folder.id)}
              className={`hover:text-foreground ${
                folder.id === currentFolderId
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Folders */}
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => loadFolder(folder.id)}
                className="flex flex-col items-center p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <HugeiconsIcon
                  icon={Folder01Icon}
                  className="h-12 w-12 text-muted-foreground"
                  strokeWidth={1.5}
                />
                <span className="text-sm mt-2 truncate w-full text-center">
                  {folder.name}
                </span>
              </button>
            ))}

            {/* Media */}
            {media.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="group relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
              >
                <img
                  src={item.url}
                  alt={item.alt || item.filename}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Select
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                  <p className="text-white text-xs truncate">{item.filename}</p>
                </div>
              </button>
            ))}

            {/* Empty state */}
            {folders.length === 0 && media.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No images in this folder
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
