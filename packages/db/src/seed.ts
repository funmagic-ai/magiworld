import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

type Locale = 'en' | 'ja' | 'pt' | 'zh';

interface LocalizedField {
  en: string;
  ja: string;
  pt: string;
  zh: string;
}

interface ToolTypeSeed {
  slug: string;
  name: LocalizedField;
  description: LocalizedField;
  badgeColor: 'default' | 'secondary' | 'outline';
  componentKey: string;
  order: number;
}

interface CategorySeed {
  slug: string;
  name: LocalizedField;
  icon: string;
  order: number;
}

interface ToolSeed {
  slug: string;
  title: LocalizedField;
  description: LocalizedField;
  toolTypeSlug: string;
  categorySlug: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
}

const toolTypesData: ToolTypeSeed[] = [
  {
    slug: 'stylize',
    name: { en: 'Stylize', ja: 'スタイル変換', pt: 'Estilizar', zh: '风格化' },
    description: {
      en: 'Transform images into artistic styles',
      ja: '画像をアート風に変換',
      pt: 'Transforme imagens em estilos artísticos',
      zh: '将图像转换为艺术风格',
    },
    badgeColor: 'default',
    componentKey: 'StylizeInterface',
    order: 1,
  },
  {
    slug: 'edit',
    name: { en: 'Edit', ja: '編集', pt: 'Editar', zh: '编辑' },
    description: {
      en: 'Edit and enhance your images',
      ja: '画像を編集・強化',
      pt: 'Edite e melhore suas imagens',
      zh: '编辑和增强您的图像',
    },
    badgeColor: 'outline',
    componentKey: 'EditInterface',
    order: 2,
  },
  {
    slug: '3d_gen',
    name: { en: '3D Generation', ja: '3D生成', pt: 'Geração 3D', zh: '3D生成' },
    description: {
      en: 'Generate 3D models from images or text',
      ja: '画像やテキストから3Dモデルを生成',
      pt: 'Gere modelos 3D a partir de imagens ou texto',
      zh: '从图像或文本生成3D模型',
    },
    badgeColor: 'secondary',
    componentKey: 'ThreeDGenInterface',
    order: 3,
  },
  {
    slug: 'crystal_engrave',
    name: { en: 'Crystal Engrave', ja: 'クリスタル刻印', pt: 'Gravação em Cristal', zh: '水晶雕刻' },
    description: {
      en: 'Create crystal engravable 3D designs',
      ja: 'クリスタル刻印用の3Dデザインを作成',
      pt: 'Crie designs 3D para gravação em cristal',
      zh: '创建可用于水晶雕刻的3D设计',
    },
    badgeColor: 'secondary',
    componentKey: 'CrystalEngraveInterface',
    order: 4,
  },
];

const categoriesData: CategorySeed[] = [
  {
    slug: 'image-processing',
    name: { en: 'Image Processing', ja: '画像処理', pt: 'Processamento de Imagem', zh: '图像处理' },
    icon: 'image-02',
    order: 1,
  },
  {
    slug: '3d-modeling',
    name: { en: '3D Modeling', ja: '3Dモデリング', pt: 'Modelagem 3D', zh: '3D建模' },
    icon: 'cube-01',
    order: 2,
  },
  {
    slug: 'fabrication',
    name: { en: 'Fabrication', ja: '製作', pt: 'Fabricação', zh: '制造' },
    icon: 'printer',
    order: 3,
  },
];

const toolsData: ToolSeed[] = [
  {
    slug: 'anime-style',
    title: { en: 'Anime Style', ja: 'アニメスタイル', pt: 'Estilo Anime', zh: '动漫风格' },
    description: {
      en: 'Transform photos into anime style artwork',
      ja: '写真をアニメ風アートワークに変換',
      pt: 'Transforme fotos em arte estilo anime',
      zh: '将照片转换为动漫风格艺术作品',
    },
    toolTypeSlug: 'stylize',
    categorySlug: 'image-processing',
    isActive: true,
    isFeatured: true,
    order: 1,
  },
  {
    slug: 'oil-painting',
    title: { en: 'Oil Painting', ja: '油絵風', pt: 'Pintura a Óleo', zh: '油画风格' },
    description: {
      en: 'Convert images to oil painting style',
      ja: '画像を油絵風に変換',
      pt: 'Converta imagens para estilo pintura a óleo',
      zh: '将图像转换为油画风格',
    },
    toolTypeSlug: 'stylize',
    categorySlug: 'image-processing',
    isActive: true,
    isFeatured: true,
    order: 2,
  },
  {
    slug: 'watercolor',
    title: { en: 'Watercolor', ja: '水彩画風', pt: 'Aquarela', zh: '水彩风格' },
    description: {
      en: 'Create beautiful watercolor effects',
      ja: '美しい水彩画効果を作成',
      pt: 'Crie belos efeitos de aquarela',
      zh: '创建美丽的水彩效果',
    },
    toolTypeSlug: 'stylize',
    categorySlug: 'image-processing',
    isActive: true,
    isFeatured: false,
    order: 3,
  },
  {
    slug: 'portrait-edit',
    title: { en: 'Portrait Edit', ja: 'ポートレート編集', pt: 'Edição de Retrato', zh: '肖像编辑' },
    description: {
      en: 'Professional portrait editing tools',
      ja: 'プロ仕様のポートレート編集ツール',
      pt: 'Ferramentas profissionais de edição de retratos',
      zh: '专业肖像编辑工具',
    },
    toolTypeSlug: 'edit',
    categorySlug: 'image-processing',
    isActive: true,
    isFeatured: true,
    order: 4,
  },
  {
    slug: 'background-remove',
    title: { en: 'Background Remove', ja: '背景削除', pt: 'Remover Fundo', zh: '背景移除' },
    description: {
      en: 'Remove backgrounds from images instantly',
      ja: '画像の背景を瞬時に削除',
      pt: 'Remova fundos de imagens instantaneamente',
      zh: '即时移除图像背景',
    },
    toolTypeSlug: 'edit',
    categorySlug: 'image-processing',
    isActive: true,
    isFeatured: false,
    order: 5,
  },
  {
    slug: 'image-to-3d',
    title: { en: 'Image to 3D', ja: '画像から3D', pt: 'Imagem para 3D', zh: '图像转3D' },
    description: {
      en: 'Generate 3D models from a single image',
      ja: '1枚の画像から3Dモデルを生成',
      pt: 'Gere modelos 3D a partir de uma única imagem',
      zh: '从单张图像生成3D模型',
    },
    toolTypeSlug: '3d_gen',
    categorySlug: '3d-modeling',
    isActive: true,
    isFeatured: true,
    order: 6,
  },
  {
    slug: 'text-to-3d',
    title: { en: 'Text to 3D', ja: 'テキストから3D', pt: 'Texto para 3D', zh: '文本转3D' },
    description: {
      en: 'Create 3D models from text descriptions',
      ja: 'テキスト説明から3Dモデルを作成',
      pt: 'Crie modelos 3D a partir de descrições de texto',
      zh: '从文本描述创建3D模型',
    },
    toolTypeSlug: '3d_gen',
    categorySlug: '3d-modeling',
    isActive: true,
    isFeatured: false,
    order: 7,
  },
  {
    slug: 'photo-crystal',
    title: { en: 'Photo Crystal', ja: 'フォトクリスタル', pt: 'Foto Cristal', zh: '照片水晶' },
    description: {
      en: 'Convert photos to crystal-engravable 3D',
      ja: '写真をクリスタル刻印可能な3Dに変換',
      pt: 'Converta fotos para 3D gravável em cristal',
      zh: '将照片转换为可雕刻水晶的3D模型',
    },
    toolTypeSlug: 'crystal_engrave',
    categorySlug: 'fabrication',
    isActive: true,
    isFeatured: true,
    order: 8,
  },
];

const locales: Locale[] = ['en', 'ja', 'pt', 'zh'];

async function seed() {
  console.log('🌱 Starting seed...');

  // Seed Tool Types
  console.log('Seeding tool types...');
  const toolTypeMap: Record<string, string> = {};

  for (const toolType of toolTypesData) {
    const [inserted] = await db.insert(schema.toolTypes).values({
      slug: toolType.slug,
      badgeColor: toolType.badgeColor,
      componentKey: toolType.componentKey,
      order: toolType.order,
      isActive: true,
    }).returning();

    toolTypeMap[toolType.slug] = inserted.id;

    // Insert translations
    for (const locale of locales) {
      await db.insert(schema.toolTypeTranslations).values({
        toolTypeId: inserted.id,
        locale,
        name: toolType.name[locale],
        description: toolType.description[locale],
      });
    }
    console.log(`  Created tool type: ${toolType.slug}`);
  }

  // Seed Categories
  console.log('Seeding categories...');
  const categoryMap: Record<string, string> = {};

  for (const category of categoriesData) {
    const [inserted] = await db.insert(schema.categories).values({
      slug: category.slug,
      icon: category.icon,
      order: category.order,
    }).returning();

    categoryMap[category.slug] = inserted.id;

    // Insert translations
    for (const locale of locales) {
      await db.insert(schema.categoryTranslations).values({
        categoryId: inserted.id,
        locale,
        name: category.name[locale],
      });
    }
    console.log(`  Created category: ${category.slug}`);
  }

  // Seed Tools
  console.log('Seeding tools...');

  for (const tool of toolsData) {
    const toolTypeId = toolTypeMap[tool.toolTypeSlug];
    const categoryId = categoryMap[tool.categorySlug];

    const [inserted] = await db.insert(schema.tools).values({
      slug: tool.slug,
      toolTypeId,
      categoryId,
      isActive: tool.isActive,
      isFeatured: tool.isFeatured,
      order: tool.order,
    }).returning();

    // Insert translations
    for (const locale of locales) {
      await db.insert(schema.toolTranslations).values({
        toolId: inserted.id,
        locale,
        title: tool.title[locale],
        description: tool.description[locale],
      });
    }
    console.log(`  Created tool: ${tool.slug}`);
  }

  console.log('✅ Seed completed successfully!');
  await client.end();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
