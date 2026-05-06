'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { EvaluationForm, type FormQuestion } from '../../../_shared';

export default function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const router = useRouter();
  const [website, setWebsite] = useState<{ id: string; name: string; url: string } | null>(null);
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [responseId, setResponseId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const load = async () => {
      const res = await apiGet(`/api/v1/forms/${formId}`);
      const form = res.data;
      setWebsite({ id: form.websiteTargetId ?? formId, name: form.websiteName ?? form.title, url: form.websiteUrl ?? '' });
      setQuestions((form.questions ?? []).sort((a: FormQuestion, b: FormQuestion) => a.sortOrder - b.sortOrder));

      // Check for existing draft response
      try {
        const rRes = await apiGet(`/api/v1/responses/forms/${formId}/responses`);
        const existing = (rRes.data ?? [])[0];
        if (existing) {
          if (existing.submittedAt) {
            router.replace(`/evaluator/evaluate/${formId}/success`);
            return;
          }
          setResponseId(existing.id);
        }
      } catch { /* no existing response */ }
      setLoading(false);
    };
    load().catch(() => { router.push('/dashboard'); setLoading(false); });
  }, [formId, router]);

  const collectAnswers = () => {
    if (!formRef.current) return [];
    const fd = new FormData(formRef.current);
    return questions.map(q => {
      const val = fd.get(`q_${q.id}`);
      const isNumeric = ['rating', 'scale_5', 'scale_10', 'number'].includes(q.questionType);
      return {
        questionId: q.id,
        ...(isNumeric ? { valueNumber: val ? Number(val) : undefined } : { valueText: val ? String(val) : undefined }),
      };
    }).filter(a => ('valueNumber' in a && a.valueNumber !== undefined) || ('valueText' in a && a.valueText !== undefined));
  };

  const handleSubmit = async () => {
    const answers = collectAnswers();
    if (responseId) {
      await apiPatch(`/api/v1/responses/${responseId}`, { answers });
    } else {
      const res = await apiPost(`/api/v1/responses/forms/${formId}/responses`, { answers });
      setResponseId(res.data?.id);
    }
    router.push(`/evaluator/evaluate/${formId}/success`);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">กำลังโหลดแบบประเมิน...</div>;
  if (!website) return null;

  return (
    <form ref={formRef}>
      <EvaluationForm
        website={website}
        questions={questions}
        responseId={responseId}
        onBack={() => router.push(`/evaluator/evaluate/${formId}/gate`)}
        onSubmitConfirmed={handleSubmit}
      />
    </form>
  );
}
