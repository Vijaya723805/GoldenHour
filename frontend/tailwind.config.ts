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
        background: "#F1F6FB",
        foreground: "#172F4D",
        // GoldenHour Ice Blue + Silver + Midnight Navy palette
        midnight: {
          DEFAULT: "#172F4D",
          hover: "#1D3B60",
          dark: "#11233A",
          light: "#25456E",
        },
        ice: {
          DEFAULT: "#E1F1FB",
          light: "#EDF6FD",
          dark: "#C5E3F7",
          hover: "#D4EBF9",
        },
        silver: {
          DEFAULT: "#C8D2DE",
          light: "#E5F0F8",
          border: "#DCE7F0",
          muted: "#E2EDF5",
        },
        accent: {
          DEFAULT: "#477DA8",
          light: "#6597BF",
          dark: "#366284",
        },
        text: {
          primary: "#172F4D",
          secondary: "#71849A",
          muted: "#8CA0B3",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#172F4D",
          border: "#DCE7F0",
        },
        // Mapped utility aliases for consistent fintech cybersecurity styling
        navy: {
          950: "#F1F6FB", // Main application canvas
          900: "#FFFFFF", // Elevated surfaces and sidebars
          850: "#FFFFFF", // Primary card containers
          800: "#E1F1FB", // Soft blue sections
          750: "#DCE7F0", // Standard borders
          700: "#C8D2DE", // Input / divider borders
          600: "#477DA8", // Secondary blue
          500: "#71849A", // Subtitle / muted text
        },
        purple: {
          DEFAULT: "#172F4D", // Midnight Navy primary
          hover: "#1D3B60",   // Midnight Navy hover
          light: "#172F4D",
          dark: "#11233A",
          muted: "#E1F1FB",   // Soft blue accent
          glow: "rgba(71, 125, 168, 0.2)",
        },
        gold: {
          DEFAULT: "#172F4D", // Clean navy title accents
          light: "#1D3B60",
          dark: "#11233A",
          muted: "#E1F1FB",
          glow: "rgba(71, 125, 168, 0.2)",
        },
        crimson: {
          DEFAULT: "#EF4444",
          light: "#DC2626",
          dark: "#B91C1C",
          glow: "rgba(239, 68, 68, 0.15)",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        glow: "0 2px 10px 0 rgba(23, 47, 77, 0.08)",
        "gold-glow": "0 2px 10px 0 rgba(71, 125, 168, 0.15)",
        "crimson-glow": "0 2px 10px 0 rgba(239, 68, 68, 0.15)",
        "navy-glow": "0 2px 10px 0 rgba(23, 47, 77, 0.12)",
        fintech: "0 4px 12px -2px rgba(23, 47, 77, 0.05), 0 2px 4px -2px rgba(23, 47, 77, 0.03)",
        card: "0 1px 3px 0 rgba(23, 47, 77, 0.04), 0 1px 2px -1px rgba(23, 47, 77, 0.04)",
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
