'use client';

import { createContext, useMemo, useState } from 'react';

export type AuthUser = {
  id: string;
  name: string;
  faculty: string;
  role: 'student' | 'staff' | 'teacher';
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const mockUser: AuthUser = {
  id: 'mock-user-1',
  name: 'สมชาย รักไทย',
  faculty: 'คณะวิศวกรรมศาสตร์',
  role: 'staff',
};

export function AuthProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, setUser] = useState<AuthUser | null>(mockUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading: false,
      logout: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
