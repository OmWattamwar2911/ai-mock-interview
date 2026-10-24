import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        muted: "var(--muted)",
        foreground: "var(--foreground)",
        accent: "var(--accent)",
        orange: {
          DEFAULT: "#F64302",
          50: "#fff3ee",
          100: "#ffe4d7",
          500: "#F64302",
          600: "#d93800",
          700: "#b52c00",
        },
        aeris: {
          black: "#000000",
          orange: "#F64302",
          pale: "#f0eded",
          secondaryPale: "#E8E5E9",
          card: "#EBE8EB",
          white: "#ffffff",
          darkBg: "#0b0b0b",
          darkCard: "#161616",
        },
      },
      fontFamily: {
        sans: ["var(--font-jetbrains)", "var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "var(--font-geist-mono)", "monospace"],
        jetbrains: ["var(--font-jetbrains)", "monospace"],
        bubbledot: ["var(--font-bubbledot)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
        pill: "9999px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scale-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
