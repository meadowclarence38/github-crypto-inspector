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
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        crypto: {
          bg: "#F9FAFB",
          surface: "#FFFFFF",
          surfaceHover: "#F3F4F6",
          border: "#E5E7EB",
          borderDark: "#D1D5DB",
          muted: "#6B7280",
          text: "#111827",
          textDim: "#4B5563",
          accent: "#3B82F6",
          accentHover: "#2563EB",
          accentLight: "#60A5FA",
          success: "#10B981",
          successLight: "#D1FAE5",
          warning: "#F59E0B",
          warningLight: "#FEF3C7",
          danger: "#EF4444",
          dangerLight: "#FEE2E2",
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
