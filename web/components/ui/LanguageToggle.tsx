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
      className="flex h-11 cursor-pointer items-center gap-1.5 rounded-[10px]
        border border-[var(--typeui-search-border)] bg-[var(--typeui-search-bg)] px-3
        text-sm font-medium text-[var(--typeui-subtext)] transition-colors duration-150
        hover:bg-[var(--typeui-divider)] hover:text-[var(--typeui-text)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--typeui-primary)]
        motion-reduce:transition-none"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span>{locale === 'th' ? 'TH' : 'EN'}</span>
    </button>
  )
}
