import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './context/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#0d1117',
          surface: '#1a1a2e',
          border: '#2d3748',
          text: '#e2e8f0',
          muted: '#718096',
          yellow: '#ecad0a',
          blue: '#209dd7',
          purple: '#753991',
          green: '#22c55e',
          red: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
