'use client';

/**
 * @fileoverview Magi Layout Component
 *
 * Responsive two-column layout for the Magi AI tools page.
 * Desktop: Left sidebar for tool navigation, main area for tool UI.
 * Mobile: Hamburger menu with slide-out sheet for tool navigation.
 *
 * @module apps/admin/components/ai/magi-layout
 */

import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { HugeiconsIcon } from '@hugeicons/react';
import { Wrench01Icon, Menu01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export interface MagiTool {
  id: string;
  name: string;
  description: string;
  icon: typeof Wrench01Icon;
  category: 'image' | 'video' | 'audio';
}

interface MagiLayoutProps {
  tools: MagiTool[];
  selectedToolId: string;
  onSelectTool: (toolId: string) => void;
  children: ReactNode;
}

/**
 * Tool list component - shared between sidebar and sheet
 */
function ToolList({
  tools,
  selectedToolId,
  onSelectTool,
  onItemClick,
}: {
  tools: MagiTool[];
  selectedToolId: string;
  onSelectTool: (toolId: string) => void;
  onItemClick?: () => void;
}) {
  const imageTools = tools.filter((t) => t.category === 'image');

  const handleSelect = (toolId: string) => {
    onSelectTool(toolId);
    onItemClick?.();
  };

  return (
    <nav className="p-3">
      {/* Image Tools */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Image
        </h3>
        <ul className="space-y-1">
          {imageTools.map((tool) => {
            const isSelected = selectedToolId === tool.id;
            return (
              <li key={tool.id}>
                <button
                  onClick={() => handleSelect(tool.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <HugeiconsIcon
                    icon={tool.icon}
                    className="h-5 w-5 flex-shrink-0"
                    strokeWidth={2}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tool.name}</p>
                    <p
                      className={cn(
                        'text-xs truncate',
                        isSelected
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {tool.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Placeholder for future categories */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Video
        </h3>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          Coming soon...
        </div>
      </div>
    </nav>
  );
}

/**
 * Sidebar header component
 */
function SidebarHeader() {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <HugeiconsIcon
            icon={Wrench01Icon}
            className="h-5 w-5 text-primary"
            strokeWidth={2}
          />
        </div>
        <div>
          <h1 className="font-bold">Magi</h1>
          <p className="text-xs text-muted-foreground">AI Tools</p>
        </div>
      </div>
    </div>
  );
}

export function MagiLayout({
  tools,
  selectedToolId,
  onSelectTool,
  children,
}: MagiLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedTool = tools.find((t) => t.id === selectedToolId);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden border-b bg-background sticky top-0 z-40">
        <div className="flex items-center gap-3 p-3">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" />
              }
            >
              <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" strokeWidth={2} />
              <span className="sr-only">Open menu</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="p-0 border-b">
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <HugeiconsIcon
                        icon={Wrench01Icon}
                        className="h-5 w-5 text-primary"
                        strokeWidth={2}
                      />
                    </div>
                    <div>
                      <SheetTitle>Magi</SheetTitle>
                      <p className="text-xs text-muted-foreground">AI Tools</p>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              <ToolList
                tools={tools}
                selectedToolId={selectedToolId}
                onSelectTool={onSelectTool}
                onItemClick={() => setSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* Current tool indicator */}
          {selectedTool && (
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={selectedTool.icon}
                className="h-5 w-5 text-primary"
                strokeWidth={2}
              />
              <span className="font-medium text-sm">{selectedTool.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r bg-muted/30 flex-shrink-0">
        <SidebarHeader />
        <ToolList
          tools={tools}
          selectedToolId={selectedToolId}
          onSelectTool={onSelectTool}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="max-w-3xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}

/**
 * Tool header component
 */
interface ToolHeaderProps {
  tool: MagiTool;
}

export function ToolHeader({ tool }: ToolHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10">
          <HugeiconsIcon
            icon={tool.icon}
            className="h-5 w-5 sm:h-6 sm:w-6 text-primary"
            strokeWidth={2}
          />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold">{tool.name}</h2>
          <p className="text-sm text-muted-foreground hidden sm:block">{tool.description}</p>
        </div>
      </div>
    </div>
  );
}
