import { setRequestLocale } from 'next-intl/server';
import { HeroSection } from '@/components/home/hero-section';
import { ToolDiscovery } from '@/components/home/tool-discovery';
import { getTools, getHomeConfig, type Locale } from '@/lib/data';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [tools, homeConfig] = await Promise.all([
    getTools(locale as Locale, 12).catch(() => []),
    getHomeConfig(locale as Locale).catch(() => ({ mainBanners: [], sideBanners: [] })),
  ]);

  const mainBanners = homeConfig.mainBanners?.map((banner) => ({
    id: banner.id,
    image: banner.image,
    title: banner.title,
    subtitle: banner.subtitle,
    link: banner.link,
  })) || [];

  const sideBanners = homeConfig.sideBanners?.map((banner) => ({
    id: banner.id,
    image: banner.image,
    title: banner.title,
    link: banner.link,
  })) || [];

  return (
    <div className="flex flex-col">
      <HeroSection mainBanners={mainBanners} sideBanners={sideBanners} />
      <ToolDiscovery tools={tools} />
    </div>
  );
}
