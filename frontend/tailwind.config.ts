import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#101629",
        foreground: "#FFFFFF",
        card: {
          DEFAULT: "#161d36",
          foreground: "#FFFFFF",
          border: "#253055",
        },
        navy: {
          950: "#0c101f",
          900: "#101629", // Requested: Deep navy #101629
          850: "#161d36",
          800: "#1d2645",
          750: "#253055",
          700: "#2e3b66",
          600: "#3d4d82",
          500: "#5265a3",
        },
        purple: {
          DEFAULT: "#7455E8", // Requested: Purple #7455E8
          hover: "#6342dc",
          light: "#957df0",
          dark: "#5535c4",
          muted: "rgba(116, 85, 232, 0.12)",
          glow: "rgba(116, 85, 232, 0.28)",
        },
        gold: {
          DEFAULT: "#E5B85C", // Requested: Gold #E5B85C
          light: "#f0cf85",
          dark: "#cc9e40",
          muted: "rgba(229, 184, 92, 0.12)",
          glow: "rgba(229, 184, 92, 0.25)",
        },
        light: {
          bg: "#F5F6FA", // Requested: Light background #F5F6FA
          card: "#FFFFFF",
          border: "#E4E7EC",
          text: "#101629",
          muted: "#64748B",
        },
        crimson: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
          glow: "rgba(239, 68, 68, 0.25)",
        },
        cyber: {
          cyan: "#06b6d4",
          emerald: "#10b981",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px -4px rgba(116, 85, 232, 0.35)",
        "gold-glow": "0 0 25px -4px rgba(229, 184, 92, 0.35)",
        "crimson-glow": "0 0 25px -4px rgba(239, 68, 68, 0.35)",
        fintech: "0 10px 30px -10px rgba(16, 22, 41, 0.6)",
        card: "0 4px 20px -2px rgba(12, 16, 31, 0.4)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
