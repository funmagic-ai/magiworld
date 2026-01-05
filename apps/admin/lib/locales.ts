/**
 * @fileoverview Locale Configuration
 *
 * Defines supported locales for internationalization.
 * Used for translation validation and form defaults.
 */

export const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'pt'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  zh: '中文 (Chinese)',
  ja: '日本語 (Japanese)',
  pt: 'Português (Portuguese)',
};

/**
 * Default translations template for banners.
 * Used as placeholder/example in JSON textarea.
 */
export const DEFAULT_BANNER_TRANSLATIONS = {
  en: { title: '', subtitle: '' },
  zh: { title: '', subtitle: '' },
  ja: { title: '', subtitle: '' },
  pt: { title: '', subtitle: '' },
};

/**
 * Default translations template for tools.
 * Used as placeholder/example in JSON textarea.
 */
export const DEFAULT_TOOL_TRANSLATIONS = {
  en: { title: '', description: '', promptTemplate: '' },
  zh: { title: '', description: '', promptTemplate: '' },
  ja: { title: '', description: '', promptTemplate: '' },
  pt: { title: '', description: '', promptTemplate: '' },
};

/**
 * Example JSON for banner translations (for placeholder text).
 */
export const BANNER_TRANSLATIONS_EXAMPLE = `{
  "en": { "title": "Welcome to Magiworld", "subtitle": "Create amazing AI art" },
  "zh": { "title": "欢迎来到魔法世界", "subtitle": "创作惊艳的AI艺术" },
  "ja": { "title": "Magiworldへようこそ", "subtitle": "素晴らしいAIアートを作成" },
  "pt": { "title": "Bem-vindo ao Magiworld", "subtitle": "Crie arte AI incrível" }
}`;

/**
 * Example JSON for tool translations (for placeholder text).
 */
export const TOOL_TRANSLATIONS_EXAMPLE = `{
  "en": { "title": "Anime Style", "description": "Transform your photos into anime art" },
  "zh": { "title": "动漫风格", "description": "将照片转换为动漫艺术" },
  "ja": { "title": "アニメスタイル", "description": "写真をアニメアートに変換" },
  "pt": { "title": "Estilo Anime", "description": "Transforme suas fotos em arte anime" }
}`;

/**
 * Default translations template for tool types.
 * Used as placeholder/example in JSON textarea.
 */
export const DEFAULT_TOOL_TYPE_TRANSLATIONS = {
  en: { name: '', description: '' },
  zh: { name: '', description: '' },
  ja: { name: '', description: '' },
  pt: { name: '', description: '' },
};

/**
 * Example JSON for tool type translations (for placeholder text).
 */
export const TOOL_TYPE_TRANSLATIONS_EXAMPLE = `{
  "en": { "name": "Edit", "description": "Image editing tools" },
  "zh": { "name": "编辑", "description": "图片编辑工具" },
  "ja": { "name": "編集", "description": "画像編集ツール" },
  "pt": { "name": "Editar", "description": "Ferramentas de edição de imagem" }
}`;
