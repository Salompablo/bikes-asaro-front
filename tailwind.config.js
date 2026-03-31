/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0B0B0B',
          dark: '#1A1A1A',
          gray: '#4A4A4A',
          silver: '#D1D5DB',
          light: '#F3F4F6',
          white: '#FFFFFF',
          accent: '#FFD600', 
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Montserrat"', '"Arial Black"', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.05em',
        widest: '0.15em',
      },
    },
  },
  plugins: [],
};
