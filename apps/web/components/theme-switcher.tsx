'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { SunIcon, MoonIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const themes = [
  { id: 'neutral', color: 'linear-gradient(135deg, #18181b 50%, #e4e4e7 50%)', label: 'Neutral' },
  { id: 'green', color: '#00E676', label: 'Green' },
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'purple', color: '#a855f7', label: 'Purple' },
  { id: 'orange', color: '#f97316', label: 'Orange' },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5">
          {themes.map((t) => (
            <div
              key={t.id}
              className="h-5 w-5 rounded-full bg-muted animate-pulse"
            />
          ))}
        </div>
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  const currentColorTheme = theme?.replace('-dark', '').replace('-light', '') || 'neutral';
  const isDark = resolvedTheme?.includes('dark') || theme?.includes('dark');

  function handleColorChange(colorId: string): void {
    const newTheme = isDark ? `${colorId}-dark` : colorId;
    setTheme(newTheme);
  }

  function toggleDarkMode(): void {
    const baseColor = currentColorTheme;
    setTheme(isDark ? baseColor : `${baseColor}-dark`);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1.5">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleColorChange(t.id)}
            className={cn(
              "h-5 w-5 rounded-full motion-safe:transition-[transform,opacity] motion-safe:hover:scale-125",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              currentColorTheme === t.id
                ? 'ring-2 ring-offset-2 ring-primary'
                : 'opacity-50 hover:opacity-100'
            )}
            style={{ background: t.color }}
            title={t.label}
            aria-label={`Switch to ${t.label} theme`}
            aria-pressed={currentColorTheme === t.id}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleDarkMode}
        className="h-8 w-8 rounded-full"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <SunIcon className="h-4 w-4" />
        ) : (
          <MoonIcon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
