'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';

interface Banner {
  id: string;
  image?: string;
  title: string;
  subtitle?: string;
  link?: string;
}

interface HeroSectionProps {
  mainBanners: Banner[];
  sideBanners: Banner[];
}

export function HeroSection({ mainBanners, sideBanners }: HeroSectionProps) {
  // Don't render if no banners from database
  if (mainBanners.length === 0 && sideBanners.length === 0) {
    return null;
  }

  return (
    <section className="container py-4 lg:py-6">
      {/* Desktop Layout: 12-column grid */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-3 lg:items-stretch">
        {/* Main Carousel - 8 columns */}
        <div className="lg:col-span-8">
          {mainBanners.length > 0 && <MainCarousel banners={mainBanners} />}
        </div>

        {/* Side Banners - 4 columns, stacked to match main carousel height */}
        <div className="lg:col-span-4 flex flex-col gap-3 h-full">
          {sideBanners.map((banner) => (
            <SideBanner key={banner.id} banner={banner} />
          ))}
        </div>
      </div>

      {/* Mobile Layout: Stacked */}
      <div className="lg:hidden space-y-3">
        {/* Main Carousel - Full width */}
        {mainBanners.length > 0 && <MainCarousel banners={mainBanners} />}

        {/* Side Banners - 2 column grid */}
        {sideBanners.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {sideBanners.map((banner) => (
              <SideBanner key={banner.id} banner={banner} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MainCarousel({ banners }: { banners: Banner[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  // Auto-play effect
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [banners.length, isPaused, goToNext]);

  const banner = banners[currentIndex];

  return (
    <div
      className="relative aspect-[21/9] overflow-hidden rounded-lg bg-muted"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides Container */}
      <div
        className="absolute inset-0 flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((b, index) => (
          <div key={b.id} className="relative w-full h-full flex-shrink-0">
            {/* Banner Image */}
            {b.image ? (
              <Image
                src={b.image}
                alt={b.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 66vw"
                priority={index === 0}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
            )}
          </div>
        ))}
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

      {/* Content overlay - bottom left aligned */}
      <div className="absolute inset-0 flex flex-col items-start justify-end p-4 md:p-6 lg:p-8">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight mb-1 text-white drop-shadow-md">
          {banner.title}
        </h1>
        {banner.subtitle && (
          <p className="text-sm md:text-base text-white/90 max-w-xl drop-shadow mb-3">
            {banner.subtitle}
          </p>
        )}
        {banner.link && (
          <Link
            href={banner.link}
            className="inline-flex items-center justify-center rounded-md bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary hover:border-primary hover:text-primary-foreground"
          >
            Get Started
          </Link>
        )}
      </div>

      {/* Carousel dots indicator - positioned at bottom right */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 lg:bottom-8 lg:right-8 flex gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SideBanner({ banner }: { banner: Banner }) {
  const content = (
    <div className="relative aspect-[16/9] lg:aspect-auto lg:flex-1 overflow-hidden rounded-lg bg-muted group cursor-pointer">
      {/* Banner Image */}
      {banner.image ? (
        <Image
          src={banner.image}
          alt={banner.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 1024px) 50vw, 33vw"
        />
      ) : (
        /* Fallback gradient */
        <div className="absolute inset-0 bg-gradient-to-br from-secondary via-muted to-background transition-transform group-hover:scale-105" />
      )}

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end p-3">
        <h3 className="text-sm font-semibold text-white drop-shadow">{banner.title}</h3>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors" />
    </div>
  );

  if (banner.link) {
    return (
      <Link href={banner.link} className="lg:flex-1 lg:flex lg:flex-col">
        {content}
      </Link>
    );
  }

  return content;
}
