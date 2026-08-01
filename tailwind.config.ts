import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#050505",
          900: "#0A0A0A",
          850: "#0E0E0E",
          800: "#111111",
          750: "#161616",
          700: "#1C1C1C",
          600: "#242424",
        },
        gold: {
          DEFAULT: "#C8A24A",
          bright: "#D4AF37",
          soft: "#E3C879",
          deep: "#8A6D2A",
        },
        chalk: "#EAEAEA",
        muted: "#8A8A8A",
        line: "#202020",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(200,162,74,0.25), 0 0 28px -6px rgba(200,162,74,0.35)",
        "glow-sm": "0 0 18px -6px rgba(200,162,74,0.45)",
        panel: "0 20px 60px -20px rgba(0,0,0,0.8)",
      },
      backgroundImage: {
        "gold-grad": "linear-gradient(135deg, #E3C879 0%, #C8A24A 45%, #8A6D2A 100%)",
        "grid-faint":
          "linear-gradient(rgba(200,162,74,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(200,162,74,0.05) 1px, transparent 1px)",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(200,162,74,0.45)" },
          "50%": { boxShadow: "0 0 0 8px rgba(200,162,74,0)" },
        },
        "data-flow": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-40px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-gold": "pulse-gold 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "data-flow": "data-flow 4s linear infinite",
        shimmer: "shimmer 3s linear infinite",
        "fade-up": "fade-up 0.5s ease-out forwards",
      },
      transitionTimingFunction: {
        lux: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
