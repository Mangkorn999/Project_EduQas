import type { Metadata } from 'next';
import {Prompt} from 'next/font/google';
import './globals.css';
import AuthInitializer from '@/components/AuthInitializer';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

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
    <html lang="th" className={prompt.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthInitializer />
            <div className="pointer-events-none fixed inset-0 z-0 bg-[var(--bg-page)] dark:bg-[#020617]">
              <div className="absolute right-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-blue-200/25 blur-[120px] dark:bg-cyan-400/10" />
              <div className="absolute bottom-[-140px] left-[-120px] h-[460px] w-[460px] rounded-full bg-slate-200/40 blur-[130px] dark:bg-blue-500/10" />
            </div>
            <div className="relative z-10 flex min-h-screen flex-col text-[var(--text-primary)] transition-colors duration-200">
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
