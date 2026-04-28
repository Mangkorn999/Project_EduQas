'use client';

import React, { use } from 'react';
import { FormBuilder } from '@/components/form-builder/FormBuilder';

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return <FormBuilder formId={id} />;
}
