/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        warm: {
          50: "#fefce8",
          100: "#fef9c3",
          200: "#fde68a",
        },
      },
    },
  },
  plugins: [],
};
