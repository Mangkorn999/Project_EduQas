'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getWebsiteById, PreEvaluationCard } from '../../../_shared';

export default function Page({ params }: { params: { websiteId: string } }) {
  const router = useRouter();
  const website = getWebsiteById(params.websiteId);

  if (!website) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff] p-4 text-on-surface">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm max-w-md w-full text-center">
          <div className="text-lg font-bold text-psu-navy mb-2">ไม่พบเว็บไซต์</div>
          <div className="text-sm text-gray-500 mb-6">websiteId: {params.websiteId}</div>
          <button
            onClick={() => router.push('/evaluator')}
            className="bg-psu-navy text-white px-6 py-3 rounded-xl font-bold hover:bg-psu-blue-container transition-all"
          >
            กลับหน้า evaluator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9ff]">
      <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center gap-4 sticky top-0 z-20">
        <button onClick={() => router.push('/evaluator')} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-xl text-psu-navy">EILA Website Evaluation System</h1>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <PreEvaluationCard website={website} onStart={() => router.push(`/evaluator/evaluate/${website.id}/form`)} />
      </main>
    </div>
  );
}

