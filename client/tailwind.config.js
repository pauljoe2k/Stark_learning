/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        paper: 'var(--paper)',
        moss: 'var(--pine)',
        pine: 'var(--pine)',
        accent: 'var(--accent)',
        mustard: 'var(--mustard)',
        surface: 'var(--surface)',
        muted: 'var(--muted)',
        line: 'var(--line)',
      },
      fontFamily: { heading: ['Fraunces', 'Georgia', 'serif'] },
    },
  },
  plugins: [],
};
