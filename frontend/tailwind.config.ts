import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0eefe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aef6',
          500: '#0c93e7',
          600: '#0074c5',
          700: '#015da0',
          800: '#064e84',
          900: '#0b416d',
          950: '#07294a',
        },
        dark: {
          700: '#1e293b',
          800: '#0f172a',
          900: '#0b1120',
          950: '#060a13',
        },
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.06)',
        'card-hover': '0 2px 6px rgba(15, 23, 42, 0.08), 0 12px 32px rgba(15, 23, 42, 0.12)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.35s ease-out',
      },
    },
  },
}