/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mindiocar: '#FFCD11',
        red: {
          50: "#fff9e6",
          100: "#fff1bf",
          200: "#ffe78c",
          300: "#ffdd59",
          400: "#ffd42e",
          500: "#ffcd11",
          600: "#e0b400",
          700: "#b38f00",
          800: "#806600",
          900: "#4d3d00",
        },
      }
    },
  },
  plugins: [],
}
