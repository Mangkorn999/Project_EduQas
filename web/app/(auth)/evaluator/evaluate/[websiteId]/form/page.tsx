'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { EvaluationForm, getWebsiteById } from '../../../_shared';

export default function Page({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = use(params);
  const router = useRouter();
  const website = getWebsiteById(websiteId);

  if (!website) {
    router.push('/evaluator');
    return null;
  }

  return (
    <EvaluationForm
      website={website}
      onBack={() => router.push(`/evaluator/evaluate/${website.id}/gate`)}
      onSubmitConfirmed={() => router.push(`/evaluator/evaluate/${website.id}/success`)}
    />
  );
}

