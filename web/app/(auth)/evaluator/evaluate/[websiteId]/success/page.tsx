'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { getWebsiteById, SuccessCard, WEBSITES } from '../../../_shared';

export default function Page({ params }: { params: { websiteId: string } }) {
  const router = useRouter();
  const website = getWebsiteById(params.websiteId);

  if (!website) {
    router.push('/evaluator');
    return null;
  }

  const remaining = WEBSITES.filter((w) => w.id !== website.id && w.status !== 'completed');

  return (
    <SuccessCard
      website={website}
      remaining={remaining}
      onEvaluateNext={(site) => router.push(`/evaluator/evaluate/${site.id}/gate`)}
      onDone={() => router.push('/evaluator')}
    />
  );
}

