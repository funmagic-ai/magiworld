// Tool Types
export type ToolType = 'stylize' | 'edit' | '3d_gen' | 'crystal_engrave';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  order: number;
}

export interface Tool {
  id: string;
  title: string;
  slug: string;
  description?: string;
  category: Category;
  thumbnail?: Media;
  toolType: ToolType;
  promptTemplate?: string;
  configJson?: Record<string, unknown>;
  aiEndpoint?: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Task Types (managed by Drizzle in web app, not CMS)
export type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';
export type OutputType = 'image' | 'model_3d' | 'fabrication';

export interface TaskOutputData {
  previewUrl?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  glbUrl?: string;
  pointCloudDensity?: number;
  [key: string]: unknown;
}

export interface Task {
  id: string;
  userId: string;           // External user ID (Logto)
  toolSlug: string;         // Reference to Tool by slug
  inputParams?: Record<string, unknown>;
  outputType?: OutputType;
  outputData?: TaskOutputData;
  status: TaskStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface User {
  id: string;
  email: string;
  externalId?: string;
  createdAt: string;
  updatedAt: string;
}

// Media Types
export interface Media {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

// Home Config Types
export interface Banner {
  image: Media;
  title: string;
  subtitle?: string;
  link?: Tool;
}

export interface HomeConfig {
  mainBanners: Banner[];
  sideBanners: Banner[];
}
