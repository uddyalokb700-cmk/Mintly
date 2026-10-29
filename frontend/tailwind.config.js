/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mint: {
          50: '#E6FCF3',
          100: '#C7F8E4',
          200: '#92F1CB',
          300: '#5DEAB2',
          400: '#35E6A0', // Primary Accent
          500: '#1ED78B',
          600: '#14AD6E',
          700: '#108455',
          800: '#0E6844',
          900: '#0B5438',
        },
        surface: {
          bg: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          elevated: 'var(--bg-elevated)',
          border: 'var(--border-subtle)',
        },
        brand: {
          coral: '#F43F5E',
          amber: '#F59E0B',
          teal: '#2DD4BF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
