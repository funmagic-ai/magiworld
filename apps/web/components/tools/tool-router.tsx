'use client';

import { TOOL_REGISTRY, type RegisteredToolSlug } from '@magiworld/types';
import { BackgroundRemoveInterface } from './background-remove';

type ToolData = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  promptTemplate?: string | null;
  configJson?: unknown;
  aiEndpoint?: string | null;
  thumbnail?: { id: string; url: string };
  toolType: {
    slug: string;
    name: string;
    badgeColor: string;
  };
  updatedAt: string;
};

interface ToolRouterProps {
  tool: ToolData;
}

/**
 * Map of registered tool slugs to their UI components.
 * This must stay in sync with TOOL_REGISTRY in @magiworld/types.
 *
 * When adding a new tool:
 * 1. Add the slug to TOOL_REGISTRY in packages/types/src/index.ts
 * 2. Create the component in apps/web/components/tools/{slug}/
 * 3. Import and register the component here
 */
const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolData }>> = {
  'background-remove': BackgroundRemoveInterface,
};

// Validate at build time that all registered slugs have components
if (process.env.NODE_ENV === 'development') {
  TOOL_REGISTRY.forEach((slug) => {
    if (!TOOL_COMPONENTS[slug]) {
      console.warn(`Warning: Tool slug "${slug}" is registered but has no component`);
    }
  });
}

export function ToolRouter({ tool }: ToolRouterProps) {
  // Route by tool slug - each tool can have its own specific component
  const Component = TOOL_COMPONENTS[tool.slug];

  if (!Component) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Tool Not Available</h2>
        <p className="text-muted-foreground">
          The interface for "{tool.slug}" is not yet implemented.
        </p>
      </div>
    );
  }

  return <Component tool={tool} />;
}
