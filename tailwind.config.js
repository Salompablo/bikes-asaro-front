/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Graphite "asphalt" ink: text, header and dark surfaces
          black: '#1B1D1F',
          dark: '#2A2D30',
          // Muted text (AA on white and on concrete)
          gray: '#565C61',
          silver: '#C4C8CB',
          // Concrete floor of the shop: page canvas
          light: '#ECEDEE',
          white: '#FFFFFF',
          // Facade signal yellow
          accent: '#FFD400',
          // Mural red: sale / out of stock / destructive
          red: '#C8321F',
          // Hairlines
          line: '#D8DBDE',
        },
      },
      fontFamily: {
        sans: ['"Archivo"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Archivo"', '"Arial Narrow"', 'sans-serif'],
      },
      letterSpacing: {
        tight: '-0.02em',
        widest: '0.08em',
      },
    },
  },
  plugins: [],
};
