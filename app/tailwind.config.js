/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Semantic warmth palette (for heat visualization)
        warmth: {
          cool: '#3b82f6',      // blue-500 - comfortable
          mild: '#22c55e',      // green-500 - pleasant
          warm: '#f59e0b',      // amber-500 - moderate heat
          hot: '#f97316',       // orange-500 - significant heat
          extreme: '#ef4444',   // red-500 - extreme heat
        },
        // Sky palette (for time-of-day contexts)
        sky: {
          dawn: '#fbbf24',      // golden sunrise
          morning: '#38bdf8',   // bright blue
          noon: '#0ea5e9',      // intense blue
          afternoon: '#f59e0b', // warm amber
          dusk: '#f97316',      // orange sunset
          night: '#1e293b',     // slate-800
        },
        // Surface palette (for backgrounds)
        surface: {
          warm: '#fffbeb',      // amber-50 - warm context
          neutral: '#f9fafb',   // gray-50 - neutral
          cool: '#f0f9ff',      // sky-50 - analysis
          dark: '#111827',      // gray-900 - immersive
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
        'gradient-sky': 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 60%, #bae6fd 100%)',
        'gradient-sunset': 'linear-gradient(180deg, #fef3c7 0%, #fed7aa 70%, #fdba74 100%)',
        'gradient-radial-sun': 'radial-gradient(ellipse at center, rgba(251,191,36,0.15) 0%, transparent 70%)',
        'gradient-dark': 'linear-gradient(180deg, #111827 0%, #1e293b 50%, #0f172a 100%)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      animation: {
        'slide-in-up': 'slide-in-up 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-down': 'slide-in-down 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' },
          '50%': { boxShadow: '0 0 0 4px rgba(245, 158, 11, 0.15)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
