/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        elan: {
          DEFAULT: '#071025',
          accent: '#06b6d4',
          green: '#10b981'
        }
      }
    }
  },
  plugins: []
}
