'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon, Upload04Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

type MediaItem = {
  id: string;
  filename: string;
  url: string;
  mimeType?: string | null;
};

interface MediaPickerProps {
  value?: string;
  onChange: (mediaId: string | undefined, url: string | undefined) => void;
  mediaItems: MediaItem[];
  label?: string;
}

export function MediaPicker({
  value,
  onChange,
  mediaItems,
  label = 'Select Media',
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(value);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [tab, setTab] = useState<'library' | 'upload'>('library');

  const selectedMedia = mediaItems.find((m) => m.id === value);

  useEffect(() => {
    setSelectedId(value);
  }, [value]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadPreview(event.target?.result as string);
      setUploadFile(file);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSelect = () => {
    if (tab === 'library' && selectedId) {
      const media = mediaItems.find((m) => m.id === selectedId);
      onChange(selectedId, media?.url);
    } else if (tab === 'upload' && uploadPreview) {
      // For now, we'll pass the data URL as the URL
      // In production, you would upload to S3 first
      onChange(undefined, uploadPreview);
    }
    setOpen(false);
    setUploadPreview(null);
    setUploadFile(null);
  };

  const handleClear = () => {
    onChange(undefined, undefined);
    setSelectedId(undefined);
  };

  return (
    <div className="space-y-2">
      {selectedMedia ? (
        <div className="relative rounded-lg border overflow-hidden">
          <img
            src={selectedMedia.url}
            alt={selectedMedia.filename}
            className="w-full h-32 object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button variant="secondary" size="sm" />}>
                Change
              </DialogTrigger>
              <MediaPickerDialog
                mediaItems={mediaItems}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                tab={tab}
                setTab={setTab}
                uploadPreview={uploadPreview}
                handleFileChange={handleFileChange}
                handleSelect={handleSelect}
              />
            </Dialog>
            <Button variant="destructive" size="sm" onClick={handleClear}>
              Remove
            </Button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
            {selectedMedia.filename}
          </div>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <button
                type="button"
                className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              />
            }
          >
            <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="size-8" />
            <span className="text-sm">{label}</span>
          </DialogTrigger>
          <MediaPickerDialog
            mediaItems={mediaItems}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            tab={tab}
            setTab={setTab}
            uploadPreview={uploadPreview}
            handleFileChange={handleFileChange}
            handleSelect={handleSelect}
          />
        </Dialog>
      )}
    </div>
  );
}

function MediaPickerDialog({
  mediaItems,
  selectedId,
  setSelectedId,
  tab,
  setTab,
  uploadPreview,
  handleFileChange,
  handleSelect,
}: {
  mediaItems: MediaItem[];
  selectedId?: string;
  setSelectedId: (id: string | undefined) => void;
  tab: 'library' | 'upload';
  setTab: (tab: 'library' | 'upload') => void;
  uploadPreview: string | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelect: () => void;
}) {
  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Select Media</DialogTitle>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('library')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'library'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Library
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'upload'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upload
        </button>
      </div>

      {/* Content */}
      {tab === 'library' ? (
        <div className="grid grid-cols-4 gap-2 max-h-80 overflow-y-auto">
          {mediaItems.map((media) => (
            <button
              key={media.id}
              type="button"
              onClick={() => setSelectedId(media.id)}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                selectedId === media.id
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent hover:border-muted-foreground/50'
              }`}
            >
              {media.mimeType?.startsWith('image/') ? (
                <img
                  src={media.url}
                  alt={media.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="size-8 text-muted-foreground" />
                </div>
              )}
            </button>
          ))}
          {mediaItems.length === 0 && (
            <div className="col-span-4 py-8 text-center text-muted-foreground">
              No media files found. Upload one first.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {uploadPreview ? (
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={uploadPreview}
                alt="Upload preview"
                className="w-full h-48 object-contain bg-muted"
              />
            </div>
          ) : (
            <label className="block">
              <div className="w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-12" />
                <span className="text-sm">Click or drag to upload</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          onClick={handleSelect}
          disabled={(tab === 'library' && !selectedId) || (tab === 'upload' && !uploadPreview)}
        >
          {tab === 'upload' ? 'Upload & Select' : 'Select'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
