/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        transit: {
          navy: '#172B4D',
          blue: '#245A85',
          bg: '#F4F7FA',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          success: '#16866B',
          warning: '#D69A36',
          danger: '#D9534F',
          textDark: '#0F172A',
          textMuted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
