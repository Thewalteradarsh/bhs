/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1DB954", // Using a vibrant Spotify-like green for Hear app
        dark: "#121212",
        darkHover: "#282828",
        light: "#FFFFFF",
        grayText: "#B3B3B3"
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
