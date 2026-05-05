'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-[34px] w-[68px] rounded-full bg-[var(--typeui-search-bg)]" />;

  const isDark = resolvedTheme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative flex h-[34px] w-[68px] cursor-pointer items-center rounded-full p-1 transition-all duration-300",
        "bg-white border border-gray-200 shadow-sm",
        "dark:bg-slate-900 dark:border-slate-800"
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sliding Knob */}
      <motion.div
        className="absolute h-6 w-6 rounded-full bg-[#0066FF] shadow-[0_2px_8px_rgba(0,102,255,0.4)]"
        initial={false}
        animate={{
          x: isDark ? 34 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
      />

      {/* Icons Container */}
      <div className="relative flex w-full items-center justify-around z-10 pointer-events-none">
        <Sun 
          className={cn(
            "h-[15px] w-[15px] transition-colors duration-300",
            !isDark ? "text-white" : "text-gray-400"
          )}
          strokeWidth={2.5}
        />
        <Moon 
          className={cn(
            "h-[15px] w-[15px] transition-colors duration-300",
            isDark ? "text-white" : "text-slate-500"
          )}
          strokeWidth={2.5}
        />
      </div>
    </button>
  );
}
