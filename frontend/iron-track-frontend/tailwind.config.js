/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: 'rgb(15, 17, 22)',
          surface: 'rgb(29, 32, 47)',
          border: 'rgb(37, 40, 62)',
          text: 'rgb(226, 232, 240)',
          muted: 'rgb(75, 85, 98)'
        },
        primary: {
          DEFAULT: 'rgb(51, 101, 227)',
          dark: 'rgb(41, 74, 158)'
        }
      }
    },
  },
  plugins: [],
}
