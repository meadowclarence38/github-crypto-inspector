import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        crypto: {
          bg: "#08080c",
          surface: "#111118",
          border: "#1e1e28",
          muted: "#6b6b7b",
          accent: "#a78bfa",
          gold: "#e4a853",
          flagRed: "#dc2626",
          flagGreen: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
