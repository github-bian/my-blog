/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#e94560',
          soft: 'rgba(233, 69, 96, 0.08)',
        },
      },
      borderRadius: {
        'card': '16px',
      },
      fontFamily: {
        sans: ['DM Sans', 'PingFang SC', 'Hiragino Sans GB', '-apple-system', 'sans-serif'],
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
