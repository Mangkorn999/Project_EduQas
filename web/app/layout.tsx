import type { Metadata } from 'next';
import './globals.css';
import AuthInitializer from '@/components/AuthInitializer';

export const metadata: Metadata = {
  title: 'PSU EILA',
  description: 'ระบบประเมินเว็บไซต์หน่วยงาน',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AuthInitializer />
        {children}
      </body>
    </html>
  );
}
