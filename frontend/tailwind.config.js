/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#153d32",
        leaf: "#35765e",
        cream: "#f6f4ec",
        sand: "#e8e4d7",
        ink: "#17221e"
      }
    }
  },
  plugins: []
};
