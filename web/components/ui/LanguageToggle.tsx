'use client'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Languages } from 'lucide-react'

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()

  const toggle = () => {
    const next = locale === 'th' ? 'en' : 'th'
    document.cookie = `EILA_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
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
      <span>{locale === 'th' ? 'TH' : 'EN'}</span>
    </button>
  )
}
