import type {Config} from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      fontFamily: {
        prompt: ['Prompt', 'sans-serif'],
      },
      colors: {
        'psu-blue': {
          dark: '#001d59',
          base: '#003087',
          light: '#0047AB',
        },
        gold: '#FFD700',
        semantic: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
      },
      spacing: {
        sidebar: '280px',
        'sidebar-collapsed': '64px',
      },
    },
  },
};

export default config;
