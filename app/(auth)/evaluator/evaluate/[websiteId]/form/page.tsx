'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EvaluationForm, getWebsiteById } from '../../../_shared';

export default function Page({ params }: { params: { websiteId: string } }) {
  const router = useRouter();
  const website = getWebsiteById(params.websiteId);

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

