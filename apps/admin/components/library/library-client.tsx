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
import { Checkbox } from '@/components/ui/checkbox';
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
  Download04Icon,
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

/**
 * Calculate and format aspect ratio from dimensions
 */
function formatAspectRatio(width: number, height: number): string {
  // Find GCD to simplify ratio
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  // Common ratios mapping
  const commonRatios: Record<string, string> = {
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
    '1:1': '1:1',
    '3:2': '3:2',
    '2:3': '2:3',
    '21:9': '21:9',
  };

  const simplified = `${ratioW}:${ratioH}`;
  if (commonRatios[simplified]) {
    return simplified;
  }

  // For non-standard ratios, show decimal
  const decimal = width / height;
  return decimal.toFixed(2);
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
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <button
                    className={cn(
                      'w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left',
                      moveTargetId === null && 'bg-muted'
                    )}
                    onClick={() => setMoveTargetId(null)}
                  >
                    <HugeiconsIcon icon={Home01Icon} className="h-4 w-4" strokeWidth={2} />
                    Root
                  </button>
                  {allFolders.map((folder) => (
                    <button
                      key={folder.id}
                      className={cn(
                        'w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left',
                        moveTargetId === folder.id && 'bg-muted'
                      )}
                      onClick={() => setMoveTargetId(folder.id)}
                    >
                      <HugeiconsIcon icon={FolderOpenIcon} className="h-4 w-4" strokeWidth={2} />
                      {folder.name}
                    </button>
                  ))}
                </div>
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
              <Card
                key={folder.id}
                className="group relative p-4 hover:bg-muted/50 cursor-pointer"
              >
                <Link
                  href={`/library?folder=${folder.id}`}
                  className="flex flex-col items-center gap-2"
                >
                  <HugeiconsIcon
                    icon={FolderOpenIcon}
                    className="h-12 w-12 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <span className="text-sm font-medium truncate max-w-full">
                    {folder.name}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">
                    {folder.subfolderCount > 0 && `${folder.subfolderCount} folder${folder.subfolderCount !== 1 ? 's' : ''}`}
                    {folder.subfolderCount > 0 && folder.fileCount > 0 && ' · '}
                    {folder.fileCount > 0 && `${folder.fileCount} file${folder.fileCount !== 1 ? 's' : ''}`}
                    {folder.subfolderCount === 0 && folder.fileCount === 0 && 'Empty'}
                  </span>
                  {folder.totalSize > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(folder.totalSize)}
                    </span>
                  )}
                </Link>
                {/* Delete Folder Button (on hover) */}
                <button
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFolderToDelete(folder);
                  }}
                  title="Delete folder"
                >
                  <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" strokeWidth={2} />
                </button>
              </Card>
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
            <div
              key={item.id}
              className={cn(
                'group relative rounded-lg border bg-card overflow-hidden shadow-sm',
                isSelecting && selectedMedia.has(item.id) && 'ring-2 ring-primary'
              )}
              onClick={() => isSelecting && toggleSelection(item.id)}
            >
              {/* Selection Checkbox */}
              {isSelecting && (
                <div className="absolute top-2 left-2 z-10">
                  <Checkbox
                    checked={selectedMedia.has(item.id)}
                    onCheckedChange={() => toggleSelection(item.id)}
                  />
                </div>
              )}

              {/* Thumbnail Area */}
              <div className="aspect-square bg-muted relative">
                {item.mimeType?.startsWith('image/') ? (
                  <img
                    src={item.url}
                    alt={item.alt || item.filename}
                    className="w-full h-full object-cover"
                    onLoad={(e) => handleImageLoad(item.id, e.currentTarget)}
                  />
                ) : item.mimeType?.startsWith('video/') ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                )}

                {/* Hover Actions (when not selecting) */}
                {!isSelecting && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {/* Download */}
                    <a
                      href={item.url}
                      download={item.filename}
                      className="rounded-full bg-white p-2.5 text-gray-700 hover:bg-primary hover:text-white transition-colors"
                      title="Download"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HugeiconsIcon icon={Download04Icon} className="h-4 w-4" strokeWidth={2} />
                    </a>
                    {/* Move */}
                    <button
                      className="rounded-full bg-white p-2.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      title="Move to folder"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMediaToMove(item);
                        setMoveTargetId(null);
                      }}
                    >
                      <HugeiconsIcon icon={Move01Icon} className="h-4 w-4" strokeWidth={2} />
                    </button>
                    {/* Delete */}
                    <button
                      className="rounded-full bg-white p-2.5 text-gray-700 hover:bg-destructive hover:text-white transition-colors"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMediaToDelete(item);
                      }}
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>

              {/* File Metadata */}
              <div className="p-3">
                <p className="font-medium text-sm truncate" title={item.filename}>
                  {item.filename}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'}</span>
                  <span>{formatBytes(item.size)}</span>
                </div>
                {/* Show dimensions and ratio - prefer client-calculated, fallback to DB values */}
                {item.mimeType?.startsWith('image/') && (() => {
                  const dims = imageDimensions[item.id] || (item.width && item.height ? { width: item.width, height: item.height } : null);
                  if (!dims) return null;
                  return (
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{dims.width} × {dims.height}</span>
                      <span>{formatAspectRatio(dims.width, dims.height)}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
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
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <button
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left',
                moveTargetId === null && 'bg-muted'
              )}
              onClick={() => setMoveTargetId(null)}
            >
              <HugeiconsIcon icon={Home01Icon} className="h-4 w-4" strokeWidth={2} />
              Root
            </button>
            {allFolders.map((folder) => (
              <button
                key={folder.id}
                className={cn(
                  'w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left',
                  moveTargetId === folder.id && 'bg-muted'
                )}
                onClick={() => setMoveTargetId(folder.id)}
              >
                <HugeiconsIcon icon={FolderOpenIcon} className="h-4 w-4" strokeWidth={2} />
                {folder.name}
              </button>
            ))}
          </div>
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
