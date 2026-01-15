'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

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

  const handleColorChange = (colorId: string) => {
    const newTheme = isDark ? `${colorId}-dark` : colorId;
    setTheme(newTheme);
  };

  const toggleDarkMode = () => {
    const baseColor = currentColorTheme;
    if (isDark) {
      setTheme(baseColor);
    } else {
      setTheme(`${baseColor}-dark`);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Color Theme Picker */}
      <div className="flex gap-1.5">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleColorChange(t.id)}
            className={`h-5 w-5 rounded-full transition-[transform,opacity] motion-safe:hover:scale-125 ${
              currentColorTheme === t.id
                ? 'ring-2 ring-offset-2 ring-primary'
                : 'opacity-50 hover:opacity-100'
            }`}
            style={{ background: t.color }}
            title={t.label}
            aria-label={`Switch to ${t.label} theme`}
            aria-pressed={currentColorTheme === t.id}
          />
        ))}
      </div>

      {/* Dark/Light Mode Toggle */}
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

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}
