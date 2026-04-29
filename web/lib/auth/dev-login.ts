'use client';

import type { UserRole } from './AuthContext';

const DEV_ROLE_STORAGE_KEY = 'eila.dev.login.role';

export const isDevEnvironment = process.env.NODE_ENV !== 'production';

export const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'super_admin', label: 'super_admin' },
  { value: 'admin', label: 'admin' },
  { value: 'executive', label: 'executive' },
  { value: 'user', label: 'user' },
];

export function saveDevRole(role: UserRole) {
  if (!isDevEnvironment || typeof window === 'undefined') return;
  window.sessionStorage.setItem(DEV_ROLE_STORAGE_KEY, role);
}

export function readDevRole(): UserRole | null {
  if (!isDevEnvironment || typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(DEV_ROLE_STORAGE_KEY);
  if (raw === 'super_admin' || raw === 'admin' || raw === 'executive' || raw === 'user') {
    return raw;
  }
  return null;
}

export function clearDevRole() {
  if (!isDevEnvironment || typeof window === 'undefined') return;
  window.sessionStorage.removeItem(DEV_ROLE_STORAGE_KEY);
}
