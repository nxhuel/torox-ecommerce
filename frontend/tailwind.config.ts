import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Archivo es una sola familia con eje de ancho: el cuerpo va en ancho
        // normal y los titulares EXPANDIDOS (ver .font-display en main.css).
        sans: ['Archivo', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Archivo', 'system-ui', 'sans-serif'],
        cctv: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        /*
         * Sistema de color TOROX (rediseño "Bóveda")
         *   1. Obsidiana / grafito  → fondos y tinta (seguridad, solidez)
         *   2. Latón                → detalles premium (cerraduras, cajas fuertes)
         *   3. Azul del escudo      → acciones (botones, links, foco). Es el que "se impone".
         *
         * `slate` se redefine como un gris NEUTRO (sin el tinte azul de Tailwind):
         * así toda la tienda y el admin toman la paleta nueva sin tocar cada archivo.
         */
        slate: {
          50: '#f6f7f8',
          100: '#eceef0',
          200: '#dde0e4',
          300: '#c4c8ce',
          400: '#959ba3',
          500: '#6c727a',
          600: '#51565d',
          700: '#3b3f45',
          800: '#26292e',
          900: '#17191c',
          950: '#0d0e10',
        },
        // Modo oscuro: obsidiana. Del más profundo (950, fondo) al más claro (600).
        dark: {
          600: '#2c3037',
          700: '#20232a',
          800: '#16181d',
          900: '#101215',
          950: '#0a0b0d',
        },
        // Azul del escudo TOROX (escala completa para el admin y estados).
        brand: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bcd3ff',
          300: '#8db4ff',
          400: '#5b90ff',
          500: '#3a78ff',
          600: '#2f6feb',
          700: '#2459c4',
          800: '#20489b',
          900: '#1e3d7a',
          950: '#14264a',
        },
        torox: {
          DEFAULT: '#2f6feb',
          deep: '#2459c4',
          sky: '#8db4ff',
        },
        // Latón: hilos finos, estrellas, etiquetas premium. Nunca como fondo grande.
        brass: {
          200: '#ecdcb6',
          300: '#e0c690',
          400: '#d0ae72',
          500: '#b8955a',
          600: '#97773f',
          700: '#7a5f31',
          800: '#5e4826',
        },
        porcelain: '#eef0f3', // fondo de las fotos de producto (vienen con fondo blanco)
        signal: '#e9b44c',    // ofertas: un latón más vivo, nunca amarillo chillón
        rec: '#ff4d4f',
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(13, 14, 16, 0.05), 0 4px 16px rgba(13, 14, 16, 0.05)',
        'card-hover': '0 2px 6px rgba(13, 14, 16, 0.07), 0 18px 40px -18px rgba(13, 14, 16, 0.28)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
      },
      transitionTimingFunction: {
        // Curvas de Emil Kowalski: las nativas de CSS son demasiado blandas.
        out: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'in-out': 'cubic-bezier(0.77, 0, 0.175, 1)',
      },
    },
  },
}