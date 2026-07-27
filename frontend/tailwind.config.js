/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Azul da logo "Solução TS"
        brand: {
          50: '#f0f7fd',
          100: '#dcedfa',
          200: '#c0def5',
          300: '#94c7ee',
          400: '#62a8e2',
          500: '#4a90d9', // cor principal da marca
          600: '#3574bd',
          700: '#2c5f9a',
          800: '#294f7d',
          900: '#264467',
          950: '#1a2b42',
        },
        // Grafite da logo — neutros com leve tom azulado
        ink: {
          50: '#f6f7f9',
          100: '#eceef1',
          200: '#d5dae1',
          300: '#b0bac6',
          400: '#8593a5',
          500: '#66748a',
          600: '#515d71',
          700: '#434c5c',
          800: '#3a414e',
          900: '#2b2f38', // grafite da logo
          950: '#1c1f26',
        },
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        card: '0 1px 3px 0 rgb(16 24 40 / 0.05), 0 4px 16px -4px rgb(16 24 40 / 0.06)',
        pop: '0 8px 30px -8px rgb(16 24 40 / 0.18)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
