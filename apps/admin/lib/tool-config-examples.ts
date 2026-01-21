/**
 * @fileoverview Tool Configuration Examples
 * @fileoverview 工具配置示例
 *
 * Provides example configurations and tips for each registered tool.
 * Helps admin users understand how to configure tools correctly.
 * 为每个已注册工具提供示例配置和提示。
 * 帮助管理员用户正确配置工具。
 *
 * @module lib/tool-config-examples
 */

export type ToolSlug = 'background-remove' | '3d-crystal' | 'fig-me';

export interface ToolConfigExample {
  /** Tool slug */
  slug: ToolSlug;
  /** Human-readable description of the tool */
  description: string;
  /** Tips for configuring the tool */
  tips: string[];
  /** Example configuration JSON */
  exampleConfig: Record<string, unknown>;
  /** Required providers for this tool */
  requiredProviders: string[];
}

/**
 * Tool configuration examples and tips
 * 工具配置示例和提示
 */
export const TOOL_CONFIG_EXAMPLES: Record<ToolSlug, ToolConfigExample> = {
  'background-remove': {
    slug: 'background-remove',
    description: 'Remove background from images using AI',
    tips: [
      'Provider is hardcoded to fal_ai in the worker',
      'No special configJson is required for this tool',
      'Make sure fal_ai provider is configured with a valid API key',
    ],
    exampleConfig: {
      provider: 'fal_ai',
    },
    requiredProviders: ['fal_ai'],
  },

  '3d-crystal': {
    slug: '3d-crystal',
    description: 'Convert images to 3D crystal engravings',
    tips: [
      'This tool uses fal_ai for 3D generation',
      'Configure point cloud density in configJson if needed',
    ],
    exampleConfig: {
      provider: 'fal_ai',
      pointCloudDensity: 50000,
    },
    requiredProviders: ['fal_ai'],
  },

  'fig-me': {
    slug: 'fig-me',
    description: 'Create 3D figurines from photos (multi-step tool)',
    tips: [
      'This is a multi-step tool with steps executed in array order:',
      '  1. transform: Converts user photo to figurine style (uses OpenAI GPT-image-1.5)',
      '  2. 3d: Generates 3D model from transformed image (uses magi-3d SDK)',
      '',
      'Steps are stored as an ARRAY to preserve execution order.',
      'Each step must have a unique "name" field.',
      '',
      'Reference images:',
      '  - Upload via "Advanced Config > Reference Images" section (stored in dedicated column)',
      '  - Users can select a reference style when using the tool',
      '',
      'Transform step config:',
      '  - name: "transform" (required)',
      '  - model: Orchestration model for Responses API (default: gpt-4o)',
      '  - imageModel: Image generation model (default: gpt-image-1.5)',
      '  - system: System prompt (role: system) - context and instructions',
      '  - user: User prompt (role: user) - transformation request',
      '  - size: Image dimensions (1024x1024, 1024x1536, 1536x1024, auto)',
      '  - quality: Rendering quality (low, medium, high)',
      '  - format: Output format (png, jpeg, webp)',
      '  - background: transparent or opaque (PNG/WebP only)',
      '  - moderation: Content filtering (auto or low)',
      '  - action: Action mode (auto, edit, generate) - auto is default',
      '',
      '3D step config:',
      '  - name: "3d" (required)',
      '  - provider: "3d_tripo" or "3d_hunyuan" (default: 3d_tripo)',
      '  - format: Output format - "glb", "fbx", "obj" (default: glb)',
      '  - providerOptions: Provider-specific options passed to magi-3d SDK',
      '',
      'Tripo providerOptions:',
      '  - pbr: true/false (enable PBR materials)',
      '  - texture: true/false (enable texture)',
      '  - texture_quality: "standard" or "detailed"',
      '  - geometry_quality: "standard" or "detailed" (v3.0+ only)',
      '  - face_limit: number (max faces, e.g., 50000)',
      '  - quad: true/false (quad mesh)',
      '  - auto_size: true/false (real-world scale in meters)',
      '',
      'Hunyuan providerOptions:',
      '  - EnablePBR: true/false',
      '  - FaceCount: number (40000-1500000)',
      '  - GenerateType: "Normal", "LowPoly", "Geometry", "Sketch"',
      '  - PolygonType: "triangle" or "quadrilateral"',
      '',
      'Required providers in database:',
      '  - openai: For transform step (apiKey)',
      '  - 3d_tripo: For Tripo 3D (apiKey)',
      '  - 3d_hunyuan: For Hunyuan 3D (accessKeyId, secretAccessKey, region)',
    ],
    exampleConfig: {
      steps: [
        {
          name: 'transform',
          provider: 'openai',
          model: 'gpt-4o',
          imageModel: 'gpt-image-1.5',
          system: 'You are an expert at transforming photos into 3D figurine style characters. Create colorful, toy-like images with smooth surfaces suitable for 3D printing.',
          user: 'Transform this photo into a cute 3D figurine. Keep the person\'s distinctive features but stylize them in a chibi/kawaii aesthetic. Use the reference image as a style guide.',
          action: 'auto',
          size: '1024x1024',
          quality: 'high',
          format: 'png',
          background: 'transparent',
          moderation: 'auto',
        },
        {
          name: '3d',
          provider: '3d_tripo',
          format: 'glb',
          providerOptions: {
            pbr: true,
            texture: true,
            texture_quality: 'detailed',
            face_limit: 50000,
          },
        },
      ],
    },
    requiredProviders: ['openai', '3d_tripo'],
  },
};

/**
 * Get configuration example for a tool slug
 * 获取工具slug的配置示例
 */
export function getToolConfigExample(slug: string): ToolConfigExample | undefined {
  return TOOL_CONFIG_EXAMPLES[slug as ToolSlug];
}

/**
 * Format example config as pretty JSON string
 * 将示例配置格式化为美观的JSON字符串
 */
export function formatExampleConfig(slug: string): string {
  const example = TOOL_CONFIG_EXAMPLES[slug as ToolSlug];
  if (!example) return '';
  return JSON.stringify(example.exampleConfig, null, 2);
}
