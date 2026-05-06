'use client';

import Link from 'next/link';
import {AnimatePresence, motion} from 'framer-motion';
import {useTranslations} from 'next-intl';
import {Search, type LucideIcon} from 'lucide-react';

type CommandPaletteItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type CommandPaletteProps = {
  items: CommandPaletteItem[];
  open: boolean;
  onClose: () => void;
};

export function CommandPalette({items, open, onClose}: CommandPaletteProps) {
  const t = useTranslations();
  
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[10%] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{scale: 0.95, opacity: 0, y: -10}}
            animate={{scale: 1, opacity: 1, y: 0}}
            exit={{scale: 0.95, opacity: 0}}
            transition={{duration: 0.2}}
            onClick={(event) => event.stopPropagation()}
            className="w-[min(640px,calc(100vw-32px))] rounded-2xl border border-white/10 bg-[#0b1220]/90 shadow-[0_0_40px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <Search className="h-4 w-4 text-white/40" />
              <input
                autoFocus
                placeholder={t('forms.search') || 'Search...'}
                className="w-full bg-transparent text-white outline-none placeholder:text-white/30"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.97]"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
