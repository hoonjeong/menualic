import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        dark: {
          50: '#f5f5f5',
          100: '#e0e0e0',
          200: '#c2c2c2',
          300: '#a3a3a3',
          400: '#858585',
          500: '#666666',
          600: '#4d4d4d',
          700: '#333333',
          800: '#1a1a1a',
          900: '#0a0a0a',
          950: '#000000',
        },
        // Accent colors - vibrant and neon
        accent: {
          purple: {
            DEFAULT: '#a855f7',
            light: '#c084fc',
            dark: '#9333ea',
            glow: 'rgba(168, 85, 247, 0.5)',
          },
          blue: {
            DEFAULT: '#3b82f6',
            light: '#60a5fa',
            dark: '#2563eb',
            glow: 'rgba(59, 130, 246, 0.5)',
          },
          pink: {
            DEFAULT: '#ec4899',
            light: '#f472b6',
            dark: '#db2777',
            glow: 'rgba(236, 72, 153, 0.5)',
          },
          cyan: {
            DEFAULT: '#06b6d4',
            light: '#22d3ee',
            dark: '#0891b2',
            glow: 'rgba(6, 182, 212, 0.5)',
          },
        },
        // Legacy primary colors (for backwards compatibility)
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-mesh': 'linear-gradient(to right, #a855f7, #3b82f6, #ec4899)',
        'dark-mesh': 'radial-gradient(at 0% 0%, rgba(168, 85, 247, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.15) 0px, transparent 50%)',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(168, 85, 247, 0.3)',
        'glow-md': '0 0 20px rgba(168, 85, 247, 0.4)',
        'glow-lg': '0 0 30px rgba(168, 85, 247, 0.5)',
        'neon-purple': '0 0 20px rgba(168, 85, 247, 0.6), 0 0 40px rgba(168, 85, 247, 0.3)',
        'neon-blue': '0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'gradient': 'gradient 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        glow: {
          'from': { opacity: '0.5' },
          'to': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
export default config
