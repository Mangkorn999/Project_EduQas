'use client'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const activeTheme = theme === 'dark' ? 'dark' : 'light'

  return (
    <button
      type="button"
      onClick={() => setTheme(activeTheme === 'dark' ? 'light' : 'dark')}
      className="focus-ring flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/20 bg-white/90 text-[#001d59] shadow-[0_8px_22px_rgba(0,0,0,0.12)] transition-all duration-200 hover:bg-[#00D9FF] hover:text-[#001d59] hover:shadow-[0_8px_22px_rgba(0,217,255,0.28)] dark:bg-white/10 dark:text-white dark:hover:bg-[#7C3AED] dark:hover:text-white dark:hover:shadow-[0_8px_22px_rgba(124,58,237,0.28)]"
      aria-label="Toggle theme"
    >
      {activeTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
