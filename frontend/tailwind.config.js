/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./context/**/*.{js,jsx}", "./assets/**/*.{js,jsx}", "./lib/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: { xs: "480px" },
      colors: {
        // Ink: cool, slightly blue-black neutrals (replaces gray/slate everywhere)
        ink: {
          50: "#F6F7F9", 100: "#ECEEF2", 200: "#DADDE4", 300: "#BAC0CC", 400: "#8B95A7",
          500: "#667085", 600: "#4B5565", 700: "#353D4A", 800: "#1F2530", 900: "#0F131A", 950: "#080A0F",
        },
        // Brand: deep emerald - "money, settled, paid"
        brand: {
          DEFAULT: "#0F6F4E", dark: "#0C4934",
          50: "#ECFBF4", 100: "#D1F5E4", 200: "#A5EACB", 300: "#6FD9AD", 400: "#3CC38C",
          500: "#1FA874", 600: "#128A5E", 700: "#0F6F4E", 800: "#0E5840", 900: "#0C4934", 950: "#052A1E",
        },
        paper: "#FBFAF7",
        signal: { DEFAULT: "#D9F24A", dark: "#B8D12A" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "3xl": "0 35px 60px -15px rgba(8,10,15,0.35)",
        card: "0 1px 2px rgba(15,19,26,0.04), 0 8px 24px -8px rgba(15,19,26,0.08)",
        lift: "0 2px 4px rgba(15,19,26,0.05), 0 24px 48px -16px rgba(15,19,26,0.18)",
      },
      borderRadius: { "4xl": "2rem" },
      zIndex: { 60: "60", 70: "70" },
      keyframes: {
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "slide-up": { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: { "fade-in": "fade-in .4s ease-out both", "slide-up": "slide-up .5s cubic-bezier(.2,.7,.2,1) both", marquee: "marquee 40s linear infinite" },
    },
  },
  plugins: [],
};
