/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#192a2a',
        paper: '#f6f7f5',
        moss: '#416d61',
      },
    },
  },
  plugins: [],
};
