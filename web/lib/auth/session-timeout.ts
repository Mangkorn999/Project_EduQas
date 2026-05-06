'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';

const IDLE_MS       = 30 * 60 * 1000;   // FR-AUTH-16: 30 min
const ABSOLUTE_MS   = 8 * 60 * 60 * 1000; // FR-AUTH-17: 8 h
const WARNING_MS    = 5 * 60 * 1000;    // FR-AUTH-18: warn 5 min before
const REFRESH_MS    = 12 * 60 * 1000;   // refresh before 15-min token expires
const TICK_MS       = 1000;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type SessionWarningType = 'idle' | 'absolute' | null;

export interface SessionTimeoutState {
  warningType: SessionWarningType;
  secondsLeft: number;
  extendSession: () => void;
  forceLogout: () => void;
}

export function useSessionTimeout(): SessionTimeoutState {
  const router        = useRouter();
  const pathname      = usePathname();
  const { isAuthenticated, logout } = useAuthStore();

  const [warningType, setWarningType]   = useState<SessionWarningType>(null);
  const [secondsLeft, setSecondsLeft]   = useState(WARNING_MS / 1000);

  const lastActivityRef   = useRef(Date.now());
  const sessionStartRef   = useRef(Date.now());
  const warningStartRef   = useRef<number | null>(null);
  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const doLogout = useCallback(async (reason: 'idle' | 'absolute') => {
    console.info(`[session] timeout: ${reason}`);
    setWarningType(null);
    await logout();
    router.replace(`/login?redirect=${encodeURIComponent(pathname)}&reason=${reason}`);
  }, [logout, router, pathname]);

  const extendSession = useCallback(async () => {
    // Refresh tokens to extend both access and refresh cookie
    try {
      await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }

    lastActivityRef.current = Date.now();
    // If the absolute timeout hasn't expired just reset idle warning
    const elapsed = Date.now() - sessionStartRef.current;
    if (elapsed >= ABSOLUTE_MS) {
      // past absolute limit — can't extend
      return;
    }

    setWarningType(null);
    warningStartRef.current = null;
  }, []);

  const forceLogout = useCallback(() => doLogout('idle'), [doLogout]);

  // Reset last activity on user interaction
  useEffect(() => {
    if (!isAuthenticated) return;

    const reset = () => { lastActivityRef.current = Date.now(); };
    const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'pointerdown'];
    EVENTS.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    return () => EVENTS.forEach(ev => document.removeEventListener(ev, reset));
  }, [isAuthenticated]);

  // Auto-refresh access token
  useEffect(() => {
    if (!isAuthenticated) return;

    const doRefresh = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (res.status === 401) {
          // Refresh token gone — force logout immediately
          setWarningType(null);
          await logout();
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}&reason=expired`);
        }
      } catch { /* network error — will retry next cycle */ }
    };

    refreshTimerRef.current = setInterval(doRefresh, REFRESH_MS);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [isAuthenticated, logout, router, pathname]);

  // Idle + absolute timeout check
  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    sessionStartRef.current = Date.now();
    lastActivityRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const now             = Date.now();
      const idleElapsed     = now - lastActivityRef.current;
      const absoluteElapsed = now - sessionStartRef.current;

      // Absolute timeout takes precedence
      if (absoluteElapsed >= ABSOLUTE_MS) {
        clearInterval(timerRef.current!);
        doLogout('absolute');
        return;
      }

      const absTimeLeft = ABSOLUTE_MS - absoluteElapsed;
      if (absTimeLeft <= WARNING_MS && warningType !== 'absolute') {
        if (warningStartRef.current === null) warningStartRef.current = now;
        setWarningType('absolute');
        setSecondsLeft(Math.ceil(absTimeLeft / 1000));
        return;
      }

      // Idle timeout
      if (idleElapsed >= IDLE_MS) {
        clearInterval(timerRef.current!);
        doLogout('idle');
        return;
      }

      const idleTimeLeft = IDLE_MS - idleElapsed;
      if (idleTimeLeft <= WARNING_MS && warningType !== 'idle' && warningType !== 'absolute') {
        if (warningStartRef.current === null) warningStartRef.current = now;
        setWarningType('idle');
      }

      if (warningType) {
        if (warningType === 'idle') {
          setSecondsLeft(Math.max(0, Math.ceil((IDLE_MS - idleElapsed) / 1000)));
        } else if (warningType === 'absolute') {
          setSecondsLeft(Math.max(0, Math.ceil(absTimeLeft / 1000)));
        }
      }

      // Dismiss warning if user became active again (idle case)
      if (warningType === 'idle' && idleElapsed < WARNING_MS) {
        setWarningType(null);
        warningStartRef.current = null;
      }
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, doLogout, warningType]);

  return { warningType, secondsLeft, extendSession, forceLogout };
}
