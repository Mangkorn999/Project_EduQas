'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Languages } from 'lucide-react'

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const toggle = () => {
    const next = locale === 'th' ? 'en' : 'th'
    // This logic assumes the locale is part of the path (e.g., /th/dashboard)
    // If next-intl is configured without locale prefix, this might need adjustment.
    const newPath = pathname.replace(`/${locale}`, `/${next}`)
    router.push(newPath)
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 px-3 h-9 rounded-xl
        bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)]
        border border-[var(--border)]
        text-[var(--text-secondary)] hover:text-[var(--text-primary)]
        text-sm font-medium transition-all duration-200 cursor-pointer"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span>{locale === 'th' ? 'EN' : 'ไทย'}</span>
    </button>
  )
}
