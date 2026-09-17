/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terracotta: {
          50: '#fff5f2',
          100: '#ffe8e2',
          200: '#ffd2c7',
          300: '#ffab99',
          400: '#f87756',
          500: '#e44e26',
          600: '#cb3510',
          700: '#ab280a',
          800: '#8c240d',
          900: '#722211',
          950: '#3e0e05',
        },
        saffron: {
          50: '#fffcf0',
          100: '#fef7d6',
          200: '#fdedaa',
          300: '#fcdf73',
          400: '#f9cb38',
          500: '#f0b010',
          600: '#d48d08',
          700: '#a86309',
          800: '#884d0f',
          900: '#723f12',
        },
        warm: {
          25: '#fdfbf7',
          50: '#faf7f2',
          100: '#f3ece1',
          200: '#e6d8c5',
          300: '#d4bea3',
          400: '#bd9e7e',
          500: '#ab8461',
          600: '#9b7151',
          700: '#815c44',
          800: '#6b4c3a',
          900: '#583f32',
          950: '#2f1f18',
        }
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(130, 60, 20, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'elevated': '0 10px 30px -4px rgba(130, 60, 20, 0.1), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
