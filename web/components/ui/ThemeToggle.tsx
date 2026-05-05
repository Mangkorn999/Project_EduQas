'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-[10px]
        border border-[var(--typeui-search-border)] bg-[var(--typeui-search-bg)]
        text-[var(--typeui-subtext)] transition-colors duration-150
        hover:bg-[var(--typeui-divider)] hover:text-[var(--typeui-text)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--typeui-primary)]
        motion-reduce:transition-none"
      aria-label="Toggle theme"
    >
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
    </button>
  )
}
