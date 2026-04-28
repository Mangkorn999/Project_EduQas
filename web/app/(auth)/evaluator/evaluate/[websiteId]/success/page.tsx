'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { getWebsiteById, SuccessCard, WEBSITES } from '../../../_shared';

export default function Page({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const website = getWebsiteById(websiteId);

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

