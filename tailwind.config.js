/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}', // 这一条就足够了，因为通常所有代码都在 src 下
  ],
  future: {
    hoverOnlyWhenSupported: true, // 优化移动端体验
    respectDefaultRingColorOpacity: true, // 更好的 focus 样式
  },
  theme: {
    extend: {
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'blob': "blob 7s infinite",
        'fadeIn': 'fadeIn 0.2s ease-out forwards',
        'spin-slow': 'spin-slow 8s linear infinite',
        'spin-slow-reverse': 'spin-slow-reverse 12s linear infinite'
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
        'blob': {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        'fadeIn': {
          'from': {
            opacity: '0',
            transform: 'translateY(5px)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'spin-slow': {
          'to': { transform: 'rotate(360deg)' }
        },
        'spin-slow-reverse': {
          'to': { transform: 'rotate(-360deg)' }
        }
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 