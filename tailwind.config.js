/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: { DEFAULT: 'var(--background)' },
        foreground: { DEFAULT: 'var(--foreground)' },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: { DEFAULT: 'var(--border)' },
        input: { DEFAULT: 'var(--input)' },
        ring: { DEFAULT: 'var(--ring)' },
        'neon-cyan': { DEFAULT: 'var(--neon-cyan)' },
        'neon-pink': { DEFAULT: 'var(--neon-pink)' },
        'neon-yellow': { DEFAULT: 'var(--neon-yellow)' },
        'neon-green': { DEFAULT: 'var(--neon-green)' },
        'neon-purple': { DEFAULT: 'var(--neon-purple)' },
        'navy-deep': { DEFAULT: 'var(--navy-deep)' },
        'navy-mid': { DEFAULT: 'var(--navy-mid)' },
        'navy-light': { DEFAULT: 'var(--navy-light)' },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 4px)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 8px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        'emoji-bounce': 'emojiBounce 2s ease-in-out infinite',
        'emoji-float': 'emojiFloat 3s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'timer-pulse': 'timerPulse 1s ease-in-out infinite',
        'screen-shake': 'screenShake 0.3s ease-in-out',
        'slide-up': 'slideUpIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'neon-flicker': 'neonFlicker 3s ease-in-out infinite',
        'heartbeat': 'heartbeat 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};