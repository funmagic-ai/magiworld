import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthStatus } from '@/components/auth/auth-status';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming locale is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client side
  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="neutral"
          enableSystem={false}
          themes={['neutral', 'green', 'blue', 'purple', 'orange', 'neutral-dark', 'green-dark', 'blue-dark', 'purple-dark', 'orange-dark']}
        >
          <NextIntlClientProvider messages={messages}>
            <div className="relative flex min-h-dvh flex-col">
              <Header authSlot={<AuthStatus />} />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
