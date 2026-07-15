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
        background: "#0B0F19",
        card: "#111827",
        primary: {
          DEFAULT: "#2563EB",
          hover: "#1D4ED8",
        },
        success: "#22C55E",
        danger: "#EF4444",
        secondary: "#1F2937",
        border: "rgba(255, 255, 255, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
