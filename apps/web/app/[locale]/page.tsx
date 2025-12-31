import { setRequestLocale } from 'next-intl/server';
import { HeroSection } from '@/components/home/hero-section';
import { ToolDiscovery } from '@/components/home/tool-discovery';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  // TODO: Fetch from Payload CMS
  // const homeConfig = await getHomeConfig();
  // const categories = await getCategories();

  return (
    <div className="flex flex-col">
      {/* Hero Section with Banners */}
      <HeroSection mainBanners={[]} sideBanners={[]} />

      {/* Tool Discovery Section */}
      <ToolDiscovery categories={[]} />
    </div>
  );
}
