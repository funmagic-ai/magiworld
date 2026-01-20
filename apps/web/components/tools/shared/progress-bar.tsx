'use client';

import { Button } from '@/components/ui/button';

interface ProgressBarProps {
  progress: number;
  onCancel?: () => void;
  message?: string;
}

export function ProgressBar({ progress, onCancel, message = 'Processing...' }: ProgressBarProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 select-none">
      <div className="w-full max-w-md">
        {/* Progress percentage - above bar */}
        <div className="text-center mb-2">
          <span className="text-2xl font-bold font-mono text-foreground">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-primary transition-all duration-200 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Message and Cancel */}
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {message}
          </p>
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="text-xs h-8 px-4"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
