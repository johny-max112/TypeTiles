import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        volt: {
          50: "hsl(var(--volt-50))",
          100: "hsl(var(--volt-100))",
          200: "hsl(var(--volt-200))",
          300: "hsl(var(--volt-300))",
          400: "hsl(var(--volt-400))",
          500: "hsl(var(--volt-500))",
          600: "hsl(var(--volt-600))",
          700: "hsl(var(--volt-700))",
          800: "hsl(var(--volt-800))",
        },
        turbo: {
          500: "hsl(var(--turbo-500))",
          600: "hsl(var(--turbo-600))",
        },
        sidebar: "hsl(var(--sidebar))",
        panel: "hsl(var(--panel))",
        line: "hsl(var(--line))",
        text: "hsl(var(--text))",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px hsl(var(--volt-500) / 0.18), 0 0 24px hsl(var(--volt-500) / 0.16)",
      },
      backgroundImage: {
        grid: "linear-gradient(hsl(var(--line) / 0.12) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--line) / 0.12) 1px, transparent 1px)",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "92%": { opacity: "0.92" },
          "94%": { opacity: "0.7" },
          "96%": { opacity: "1" },
        },
        scan: {
          "0%": { transform: "translateY(-12%)" },
          "100%": { transform: "translateY(112%)" },
        },
      },
      animation: {
        flicker: "flicker 6s infinite",
        scan: "scan 7s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;