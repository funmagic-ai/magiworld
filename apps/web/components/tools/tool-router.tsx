'use client';

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
    componentKey: string;
  };
  updatedAt: string;
};

interface ToolRouterProps {
  tool: ToolData;
}

const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolData }>> = {
  'background-remove': BackgroundRemoveInterface,
};

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
