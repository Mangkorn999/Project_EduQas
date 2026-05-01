import type { Metadata } from 'next';
import { Crimson_Text, EB_Garamond, Inter, Noto_Sans_Thai } from 'next/font/google'
import './globals.css';
import AuthInitializer from '@/components/AuthInitializer';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-thai',
  display: 'swap',
})

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

const crimsonText = Crimson_Text({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-crimson',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PSU EILA',
  description: 'ระบบประเมินเว็บไซต์หน่วยงาน',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansThai.variable} ${ebGaramond.variable} ${crimsonText.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthInitializer />
            <div className="min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200">
              <main className="flex-1">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
