/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-red': 'flashRed 1.5s infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        flashRed: {
          '0%, 100%': { 
            borderColor: 'rgba(239, 68, 68, 0.4)', 
            boxShadow: '0 0 15px rgba(239, 68, 68, 0.2), inset 0 0 15px rgba(239, 68, 68, 0.1)'
          },
          '50%': { 
            borderColor: 'rgba(239, 68, 68, 1)', 
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.7), inset 0 0 25px rgba(239, 68, 68, 0.4)'
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        }
      },
    },
  },
  plugins: [],
}
