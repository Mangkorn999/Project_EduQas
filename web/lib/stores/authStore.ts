import { create } from 'zustand'

export type UserRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student'

export type AuthUser = {
  id: string
  name: string
  email?: string
  faculty: string
  role: UserRole
  roles?: UserRole[]
}

type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  fetchSession: () => Promise<void>
  setUserRole: (role: UserRole) => Promise<void>
  logout: () => Promise<void>
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  fetchSession: async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      if (res.status === 401) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }
      if (!res.ok) {
        set({ user: null, isAuthenticated: false, isLoading: false })
        return
      }
      const data = await res.json()
      set({
        user: {
          id: data.id,
          name: data.displayName,
          email: data.email,
          faculty: data.facultyId ?? '',
          role: data.role,
          roles: Array.isArray(data.roles) ? data.roles : undefined,
        },
        isAuthenticated: true,
        isLoading: false,
      })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  setUserRole: async (role: UserRole) => {
    const res = await fetch(`${API_URL}/auth/set-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    })
    if (!res.ok) throw new Error('Failed to set role')
    set((state) => ({
      user: state.user ? { ...state.user, role } : null,
    }))
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' })
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
