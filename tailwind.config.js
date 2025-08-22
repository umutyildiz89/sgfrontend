
/** @type {import('tailwindcss').Config} */
export default {
  // Vite + React için içerik taraması
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  // data-theme="dark" ile uyumlu dark mode
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      // İsteğe göre küçük özelleştirmeler
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.06)",
        cardLg: "0 6px 18px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        card: "16px",
      },
      keyframes: {
        glow: {
          "0%, 100%": { opacity: 0.0, transform: "scale(0.95)" },
          "50%": { opacity: 0.4, transform: "scale(1.05)" },
        },
      },
      animation: {
        glow: "glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
