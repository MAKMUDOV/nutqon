import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        green: { DEFAULT: "#0F5132", dark: "#0b3d26", soft: "#e3eee7" },
        beige: { DEFAULT: "#F3E9D2", dark: "#ebdfc2", line: "#ddd2b6" },
        gold: { DEFAULT: "#C9A227", soft: "#f6ecc8", ink: "#6b5410" },
        ink: { DEFAULT: "#1d2a22", muted: "#5e6b62" }
      },
      fontFamily: {
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        ar: ["var(--font-ar)", "Amiri", "Traditional Arabic", "serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
