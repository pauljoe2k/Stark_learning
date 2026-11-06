import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        pine: 'var(--pine)',
        ember: 'var(--ember)',
        mustard: 'var(--mustard)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
      },
      fontFamily: {
        heading: ['Fraunces', 'Georgia', 'serif'],
        body: ['DM Sans', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
