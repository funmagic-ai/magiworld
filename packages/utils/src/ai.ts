/**
 * @fileoverview AI Provider Types and Utilities
 * @fileoverview AI提供商类型和工具
 *
 * Shared types for AI provider integrations.
 * Used by tool developers to ensure consistent output formats.
 * 用于AI提供商集成的共享类型。
 * 供工具开发者使用以确保一致的输出格式。
 *
 * @module @magiworld/utils/ai
 */

// ============================================
// Provider Types
// ============================================

/**
 * Supported AI providers
 * 支持的AI提供商
 */
export type AIProvider = 'fal_ai' | 'google' | 'openai' | 'anthropic';

// ============================================
// Image Generation Types
// ============================================

/**
 * Image generation result
 * 图像生成结果
 *
 * Standard format for all image generation operations.
 * 所有图像生成操作的标准格式。
 */
export interface AIImageResult {
  /** Base64-encoded image data (without data URL prefix) */
  base64?: string;
  /** URL to the generated image */
  url?: string;
  /** MIME type of the image */
  mimeType?: string;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
}

/**
 * Multiple images result
 * 多图像结果
 */
export interface AIImagesResult {
  /** Array of generated images */
  images: AIImageResult[];
  /** Optional text response from the model */
  text?: string;
}

// ============================================
// Text Generation Types
// ============================================

/**
 * Text generation result
 * 文本生成结果
 */
export interface AITextResult {
  /** Generated text content */
  text: string;
  /** Usage statistics */
  usage?: AIUsageStats;
}

// ============================================
// Usage & Error Types
// ============================================

/**
 * AI API usage statistics
 * AI API使用统计
 */
export interface AIUsageStats {
  /** Provider name */
  provider: AIProvider;
  /** Model identifier */
  model: string;
  /** API call latency in milliseconds */
  latencyMs?: number;
  /** Input tokens consumed (for text models) */
  inputTokens?: number;
  /** Output tokens generated (for text models) */
  outputTokens?: number;
  /** Total tokens (for text models) */
  totalTokens?: number;
}

/**
 * AI API error with provider context
 * 带提供商上下文的AI API错误
 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly provider: AIProvider,
    public readonly code?: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Convert base64 data URL to raw base64
 * 将base64数据URL转换为原始base64
 *
 * @param dataUrl - Data URL string (e.g., "data:image/png;base64,...")
 * @returns Raw base64 string without prefix
 *
 * @example
 * ```typescript
 * const raw = stripDataUrlPrefix('data:image/png;base64,iVBORw0...');
 * // Returns: 'iVBORw0...'
 * ```
 */
export function stripDataUrlPrefix(dataUrl: string): string {
  if (dataUrl.includes('base64,')) {
    return dataUrl.split('base64,')[1];
  }
  return dataUrl;
}

/**
 * Create data URL from raw base64 and MIME type
 * 从原始base64和MIME类型创建数据URL
 *
 * @param base64 - Raw base64 string
 * @param mimeType - MIME type (default: 'image/png')
 * @returns Complete data URL
 *
 * @example
 * ```typescript
 * const dataUrl = toDataUrl('iVBORw0...', 'image/png');
 * // Returns: 'data:image/png;base64,iVBORw0...'
 * ```
 */
export function toDataUrl(base64: string, mimeType: string = 'image/png'): string {
  if (base64.startsWith('data:')) {
    return base64;
  }
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Extract MIME type from data URL
 * 从数据URL提取MIME类型
 *
 * @param dataUrl - Data URL string
 * @returns MIME type or 'application/octet-stream' if not found
 */
export function getMimeTypeFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match?.[1] ?? 'application/octet-stream';
}

/**
 * Convert Buffer to base64 string
 * 将Buffer转换为base64字符串
 */
export function bufferToBase64(buffer: Buffer | Uint8Array): string {
  if (buffer instanceof Buffer) {
    return buffer.toString('base64');
  }
  return Buffer.from(buffer).toString('base64');
}

/**
 * Convert base64 string to Buffer
 * 将base64字符串转换为Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  const raw = stripDataUrlPrefix(base64);
  return Buffer.from(raw, 'base64');
}
