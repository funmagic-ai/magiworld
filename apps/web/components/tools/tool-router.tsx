'use client';

import { TOOL_REGISTRY, type RegisteredToolSlug } from '@magiworld/types';
import { BackgroundRemoveInterface } from './background-remove';
import { Crystal3DInterface } from './3d-crystal';
import { FigMeInterface } from './fig-me';

type ToolData = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  referenceImages?: string[] | null;
  configJson?: unknown;
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

const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolData }>> = {
  'background-remove': BackgroundRemoveInterface,
  '3d-crystal': Crystal3DInterface,
  'fig-me': FigMeInterface,
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
