'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { PreEvaluationCard } from '../../../_shared';

export default function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const router = useRouter();
  const [website, setWebsite] = useState<{ id: string; name: string; url: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(`/api/v1/forms/${formId}`)
      .then(res => {
        const form = res.data;
        setWebsite({
          id: form.websiteTargetId ?? formId,
          name: form.websiteName ?? form.title,
          url: form.websiteUrl ?? '',
        });
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [formId, router]);

  const handleStart = async () => {
    try {
      await apiPost(`/api/v1/responses/forms/${formId}/website-open`, {});
    } catch {
      // non-blocking — proceed even if log fails
    }
    router.push(`/evaluator/evaluate/${formId}/form`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">กำลังโหลด...</div>;
  if (!website) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff]">
      <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center gap-4 sticky top-0 z-20">
        <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-xl text-psu-navy">EILA Website Evaluation</h1>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <PreEvaluationCard website={website} onStart={handleStart} />
      </main>
    </div>
  );
}
