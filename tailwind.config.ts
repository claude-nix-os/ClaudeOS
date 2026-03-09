import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#08080c',
          1: '#0e0e14',
          2: '#14141f',
          3: '#1a1a2a',
          4: '#222236',
        },
        border: {
          subtle: '#1e1e30',
          default: '#2a2a40',
          strong: '#3a3a55',
        },
        accent: {
          DEFAULT: '#7c5cfc',
          hover: '#8b6dff',
          muted: 'rgba(124, 92, 252, 0.15)',
        },
        text: {
          primary: '#e8e8ed',
          secondary: '#9898a8',
          tertiary: '#5a5a70',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

export default config
