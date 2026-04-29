'use client';

const DEV_ROLE_STORAGE_KEY = 'eila.dev.login.role';

export const isDevEnvironment =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ENABLE_ROLE_TESTING === 'true';

export const roleOptions: Array<{ value: string; label: string }> = [
  { value: 'super_admin', label: 'super_admin' },
  { value: 'admin', label: 'admin' },
  { value: 'executive', label: 'executive' },
  { value: 'teacher', label: 'teacher' },
  { value: 'staff', label: 'staff' },
  { value: 'student', label: 'student' },
];

export function saveDevRole(role: string) {
  if (!isDevEnvironment || typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEV_ROLE_STORAGE_KEY, role);
}

export function readDevRole(): string | null {
  if (!isDevEnvironment || typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(DEV_ROLE_STORAGE_KEY);
  if (raw && ['super_admin', 'admin', 'executive', 'teacher', 'staff', 'student'].includes(raw)) {
    return raw;
  }
  return null;
}

export function clearDevRole() {
  if (!isDevEnvironment || typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DEV_ROLE_STORAGE_KEY);
}
