'use client';

import { useRef, useCallback } from 'react';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ImageCropperProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImageUrl: string) => void;
  embedded?: boolean;
}

export function ImageCropper({
  imageUrl,
  isOpen,
  onClose,
  onCrop,
  embedded = false,
}: ImageCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);

  const handleCrop = useCallback(() => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 1024,
        maxHeight: 1024,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
      onCrop(croppedUrl);
    }
  }, [onCrop]);

  const handleRotateLeft = () => {
    cropperRef.current?.cropper.rotate(-90);
  };

  const handleRotateRight = () => {
    cropperRef.current?.cropper.rotate(90);
  };

  const handleFlipH = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const scaleX = cropper.getData().scaleX ?? 1;
      cropper.scaleX(-scaleX);
    }
  };

  const handleFlipV = () => {
    const cropper = cropperRef.current?.cropper;
    if (cropper) {
      const scaleY = cropper.getData().scaleY ?? 1;
      cropper.scaleY(-scaleY);
    }
  };

  const handleReset = () => {
    cropperRef.current?.cropper.reset();
  };

  const cropperContent = (
    <>
      <div className={`relative w-full bg-gray-100 dark:bg-gray-800 overflow-hidden ${embedded ? 'h-[400px]' : 'h-[60vh]'}`}>
        {imageUrl && (
          <Cropper
            ref={cropperRef}
            src={imageUrl}
            style={{ height: '100%', width: '100%' }}
            aspectRatio={1}
            viewMode={1}
            autoCropArea={0.8}
            responsive={true}
            restore={false}
            guides={true}
            center={true}
            highlight={true}
            cropBoxMovable={true}
            cropBoxResizable={true}
            toggleDragModeOnDblclick={true}
          />
        )}
      </div>

      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={handleRotateLeft}>
          Rotate Left
        </Button>
        <Button variant="outline" size="sm" onClick={handleRotateRight}>
          Rotate Right
        </Button>
        <Button variant="outline" size="sm" onClick={handleFlipH}>
          Flip H
        </Button>
        <Button variant="outline" size="sm" onClick={handleFlipV}>
          Flip V
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      <div className={`flex gap-2 mt-4 ${embedded ? 'justify-center' : 'justify-end'}`}>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleCrop}>Apply Crop</Button>
      </div>
    </>
  );

  if (embedded) {
    return isOpen ? (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-center">Crop Image</h3>
        {cropperContent}
      </div>
    ) : null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        {cropperContent}
      </DialogContent>
    </Dialog>
  );
}
