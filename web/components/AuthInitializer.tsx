'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/authStore'

export default function AuthInitializer() {
  const fetchSession = useAuthStore((s) => s.fetchSession)

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  return null
}
