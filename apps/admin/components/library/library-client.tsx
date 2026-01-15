/**
 * @fileoverview Library Client Component
 * @fileoverview 媒体库客户端组件
 *
 * Client-side component for the media library with folder navigation,
 * file selection, upload support, and drag-and-drop organization.
 * 媒体库的客户端组件，支持文件夹导航、
 * 文件选择、上传功能和拖放整理。
 *
 * @module components/library/library-client
 */

'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { UploadDropzone } from '@/components/upload-dropzone';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  FolderOpenIcon,
  FolderAddIcon,
  Home01Icon,
  ArrowRight01Icon,
  CloudUploadIcon,
  Delete02Icon,
  Move01Icon,
  CheckmarkSquare02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import {
  createFolder,
  deleteFolder,
  deleteMedia,
  deleteMediaBatch,
  moveMedia,
  moveMediaBatch,
  type Folder,
  type FolderWithStats,
  type MediaItem,
} from '@/lib/actions/library';
import { cn } from '@/lib/utils';
import { MediaCard } from './media-card';
import { FolderCard } from './folder-card';
import { FolderPicker } from './folder-picker';

type LibraryClientProps = {
  folders: FolderWithStats[];
  media: MediaItem[];
  currentFolder: Folder | null;
  breadcrumbs: Folder[];
  allFolders: Folder[];
  stats: {
    totalFolders: number;
    totalFiles: number;
    totalSize: number;
  };
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export function LibraryClient({
  folders,
  media,
  currentFolder,
  breadcrumbs,
  allFolders,
  stats,
}: LibraryClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Selection state
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  // Dialog states
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);

  // Error states
  const [folderError, setFolderError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Delete confirmation state
  const [folderToDelete, setFolderToDelete] = useState<FolderWithStats | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<MediaItem | null>(null);

  // Single item move state
  const [mediaToMove, setMediaToMove] = useState<MediaItem | null>(null);

  // Client-side calculated image dimensions
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const handleImageLoad = useCallback((id: string, img: HTMLImageElement) => {
    setImageDimensions((prev) => ({
      ...prev,
      [id]: { width: img.naturalWidth, height: img.naturalHeight },
    }));
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedMedia(new Set(media.map((m) => m.id)));
  }, [media]);

  const clearSelection = useCallback(() => {
    setSelectedMedia(new Set());
    setIsSelecting(false);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    setFolderError(null);

    startTransition(async () => {
      try {
        await createFolder(newFolderName, currentFolder?.id);
        setNewFolderName('');
        setShowNewFolder(false);
        router.refresh();
      } catch (error) {
        setFolderError(error instanceof Error ? error.message : 'Failed to create folder');
      }
    });
  }, [newFolderName, currentFolder, router]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedMedia.size === 0) return;

    startTransition(async () => {
      await deleteMediaBatch(Array.from(selectedMedia));
      clearSelection();
      router.refresh();
    });
  }, [selectedMedia, clearSelection, router]);

  const handleMoveSelected = useCallback(async () => {
    if (selectedMedia.size === 0) return;
    setMoveError(null);

    startTransition(async () => {
      try {
        const result = await moveMediaBatch(Array.from(selectedMedia), moveTargetId);
        // Show info if files were renamed
        if (result.renamed.length > 0) {
          console.info('Some files were renamed to avoid duplicates:', result.renamed);
        }
        setShowMoveDialog(false);
        clearSelection();
        router.refresh();
      } catch (error) {
        setMoveError(error instanceof Error ? error.message : 'Failed to move files');
      }
    });
  }, [selectedMedia, moveTargetId, clearSelection, router]);

  const handleConfirmDeleteFolder = useCallback(async () => {
    if (!folderToDelete) return;

    startTransition(async () => {
      await deleteFolder(folderToDelete.id);
      setFolderToDelete(null);
      router.refresh();
    });
  }, [folderToDelete, router]);

  const handleConfirmDeleteMedia = useCallback(async () => {
    if (!mediaToDelete) return;

    startTransition(async () => {
      await deleteMedia(mediaToDelete.id);
      setMediaToDelete(null);
      router.refresh();
    });
  }, [mediaToDelete, router]);

  const handleMoveSingleMedia = useCallback(async () => {
    if (!mediaToMove) return;
    setMoveError(null);

    startTransition(async () => {
      try {
        await moveMedia(mediaToMove.id, moveTargetId);
        setMediaToMove(null);
        router.refresh();
      } catch (error) {
        setMoveError(error instanceof Error ? error.message : 'Failed to move file');
      }
    });
  }, [mediaToMove, moveTargetId, router]);

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false);
    router.refresh();
  }, [router]);

  const handleMoveClick = useCallback((item: MediaItem) => {
    setMediaToMove(item);
    setMoveTargetId(null);
  }, []);

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Library</h1>
          <p className="text-muted-foreground">
            {stats.totalFolders} folder{stats.totalFolders !== 1 ? 's' : ''} · {stats.totalFiles} file{stats.totalFiles !== 1 ? 's' : ''} · {formatBytes(stats.totalSize)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* New Folder Button */}
          <Dialog open={showNewFolder} onOpenChange={(open) => {
            setShowNewFolder(open);
            if (open) setFolderError(null);
          }}>
            <DialogTrigger render={<Button variant="outline" />}>
              <HugeiconsIcon icon={FolderAddIcon} className="h-4 w-4 mr-2" strokeWidth={2} />
              New Folder
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
              </DialogHeader>
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              {folderError && (
                <p className="text-sm text-destructive">{folderError}</p>
              )}
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || isPending}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Upload Button */}
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger render={<Button />}>
              <HugeiconsIcon icon={CloudUploadIcon} className="h-4 w-4 mr-2" strokeWidth={2} />
              Upload
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
              </DialogHeader>
              <UploadDropzone
                route="assets"
                folderId={currentFolder?.id}
                onUploadComplete={handleUploadComplete}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="mb-4 flex items-center gap-1 text-sm">
        <Link
          href="/library"
          className={cn(
            'flex items-center gap-1 hover:text-foreground',
            !currentFolder ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          <HugeiconsIcon icon={Home01Icon} className="h-4 w-4" strokeWidth={2} />
          Root
        </Link>
        {breadcrumbs.map((folder) => (
          <div key={folder.id} className="flex items-center gap-1">
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              className="h-4 w-4 text-muted-foreground"
              strokeWidth={2}
            />
            <Link
              href={`/library?folder=${folder.id}`}
              className={cn(
                'hover:text-foreground',
                folder.id === currentFolder?.id
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              {folder.name}
            </Link>
          </div>
        ))}
      </div>

      {/* Selection Toolbar */}
      {isSelecting && (
        <Card className="mb-4 p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedMedia.size} selected
            </span>
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {/* Move */}
            <Dialog open={showMoveDialog} onOpenChange={(open) => {
              setShowMoveDialog(open);
              if (open) setMoveError(null);
            }}>
              <DialogTrigger
                render={<Button variant="outline" size="sm" disabled={selectedMedia.size === 0} />}
              >
                <HugeiconsIcon icon={Move01Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
                Move
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Move to Folder</DialogTitle>
                </DialogHeader>
                <FolderPicker
                  folders={allFolders}
                  selectedId={moveTargetId}
                  onSelect={setMoveTargetId}
                />
                {moveError && (
                  <p className="text-sm text-destructive">{moveError}</p>
                )}
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <Button onClick={handleMoveSelected} disabled={isPending}>
                    Move
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete */}
            <Button
              variant="destructive"
              size="sm"
              disabled={selectedMedia.size === 0 || isPending}
              onClick={handleDeleteSelected}
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
              Delete
            </Button>

            {/* Cancel Selection */}
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <HugeiconsIcon icon={Cancel01Icon} className="h-4 w-4" strokeWidth={2} />
            </Button>
          </div>
        </Card>
      )}

      {/* Toggle Selection Mode - Only show when there are files */}
      {!isSelecting && media.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsSelecting(true)}
          >
            <HugeiconsIcon icon={CheckmarkSquare02Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
            Multi-Select
          </Button>
          <span className="text-xs text-muted-foreground">
            Select multiple files for batch operations
          </span>
        </div>
      )}

      {/* Folders Grid */}
      {folders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Folders</h2>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onDelete={setFolderToDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Media Grid */}
      <div>
        {media.length > 0 && (
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Files</h2>
        )}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSelecting={isSelecting}
              isSelected={selectedMedia.has(item.id)}
              dimensions={imageDimensions[item.id]}
              onToggleSelection={toggleSelection}
              onImageLoad={handleImageLoad}
              onMove={handleMoveClick}
              onDelete={setMediaToDelete}
            />
          ))}

          {/* Empty State */}
          {media.length === 0 && folders.length === 0 && (
            <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
              <HugeiconsIcon
                icon={FolderOpenIcon}
                className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50"
                strokeWidth={1.5}
              />
              <p className="mb-4">This folder is empty.</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setShowNewFolder(true)}>
                  <HugeiconsIcon icon={FolderAddIcon} className="h-4 w-4 mr-2" strokeWidth={2} />
                  New Folder
                </Button>
                <Button onClick={() => setShowUpload(true)}>
                  <HugeiconsIcon icon={CloudUploadIcon} className="h-4 w-4 mr-2" strokeWidth={2} />
                  Upload Files
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={!!folderToDelete} onOpenChange={(open) => !open && setFolderToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete <strong>{folderToDelete?.name}</strong>?
            </p>
            {folderToDelete && (folderToDelete.subfolderCount > 0 || folderToDelete.fileCount > 0) && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <p className="font-medium">This will permanently delete:</p>
                <ul className="mt-2 list-disc list-inside">
                  {folderToDelete.subfolderCount > 0 && (
                    <li>{folderToDelete.subfolderCount} subfolder{folderToDelete.subfolderCount !== 1 ? 's' : ''}</li>
                  )}
                  {folderToDelete.fileCount > 0 && (
                    <li>{folderToDelete.fileCount} file{folderToDelete.fileCount !== 1 ? 's' : ''} ({formatBytes(folderToDelete.totalSize)})</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteFolder}
              disabled={isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Media Confirmation Dialog */}
      <Dialog open={!!mediaToDelete} onOpenChange={(open) => !open && setMediaToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              Are you sure you want to delete <strong>{mediaToDelete?.filename}</strong>?
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteMedia}
              disabled={isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Single Media Dialog */}
      <Dialog
        open={!!mediaToMove}
        onOpenChange={(open) => {
          if (!open) {
            setMediaToMove(null);
            setMoveError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Moving <strong>{mediaToMove?.filename}</strong> to:
          </p>
          <FolderPicker
            folders={allFolders}
            selectedId={moveTargetId}
            onSelect={setMoveTargetId}
          />
          {moveError && (
            <p className="text-sm text-destructive">{moveError}</p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleMoveSingleMedia} disabled={isPending}>
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
