'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      router.replace('/evaluator');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-psu-navy">PSU EILA</h1>
        <p className="text-sm text-gray-500 mt-2">
          {isLoading ? 'กำลังโหลด...' : 'กำลังนำทางไปยังหน้า evaluator'}
        </p>
      </div>
    </main>
  );
}
