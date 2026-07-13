/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#040913',
          900: '#080E1C',
          800: '#0C1630',
          700: '#101E42',
          600: '#162454',
        },
        emerald: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
        },
        gold: {
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#C9A15A',
          600: '#A07833',
        },
        gst: '#F59E0B',
        upi: '#10B981',
        aa: '#3B82F6',
        epfo: '#8B5CF6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '12px',
        lg: '20px',
        xl: '40px',
      },
      animation: {
        'gradient-x': 'gradient-x 8s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.6s ease-out',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow': {
          '0%, 100%': { 'box-shadow': '0 0 20px rgba(16,185,129,0.3)' },
          '50%': { 'box-shadow': '0 0 40px rgba(16,185,129,0.6)' },
        },
        'shimmer': {
          '0%': { 'background-position': '-200% 0' },
          '100%': { 'background-position': '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        'mesh': 'radial-gradient(at 40% 20%, hsla(165,100%,50%,0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(220,100%,60%,0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(265,100%,60%,0.06) 0px, transparent 50%)',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        'glow-emerald': '0 0 30px rgba(16,185,129,0.25)',
        'glow-gold': '0 0 30px rgba(201,161,90,0.25)',
        'glow-blue': '0 0 30px rgba(59,130,246,0.25)',
      },
    },
  },
  plugins: [],
}
