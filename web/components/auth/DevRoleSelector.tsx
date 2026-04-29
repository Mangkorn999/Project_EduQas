'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import {
  roleOptions,
  isDevEnvironment,
  saveDevRole,
} from '@/lib/auth/dev-login';

export function DevRoleSelector() {
  const router = useRouter();
  const [devRole, setDevRole] = useState<string>('student');

  if (!isDevEnvironment) {
    return null;
  }

  const onDevLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveDevRole(devRole);
    router.push('/callback?mode=dev');
  };

  return (
    <form onSubmit={onDevLogin} className="mt-6 border-t border-gray-100 pt-6">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        <ShieldCheck className="h-4 w-4 text-psu-navy" />
        Role testing (non-production)
      </div>
      <label htmlFor="dev-role" className="mb-2 block text-xs font-medium text-gray-500">
        Select role
      </label>
      <select
        id="dev-role"
        value={devRole}
        onChange={(event) => setDevRole(event.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-psu-navy/20"
      >
        {roleOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
      >
        Continue as {roleOptions.find((role) => role.value === devRole)?.label}
      </button>
    </form>
  );
}
