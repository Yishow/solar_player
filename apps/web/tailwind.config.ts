import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "var(--color-brand-green-50)",
          100: "var(--color-brand-green-100)",
          500: "var(--color-brand-green-500)",
          600: "var(--color-brand-green-600)",
          700: "var(--color-brand-green-700)",
          800: "var(--color-brand-green-800)",
          900: "var(--color-brand-green-900)"
        },
        accent: {
          sun: "var(--color-accent-sun-500)",
          orange: "var(--color-accent-orange-500)"
        },
        neutral: {
          50: "var(--color-neutral-50)",
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-300)",
          500: "var(--color-neutral-500)",
          600: "var(--color-neutral-600)",
          700: "var(--color-neutral-700)",
          800: "var(--color-neutral-800)",
          900: "var(--color-neutral-900)"
        }
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        panel: "var(--shadow-panel)",
        soft: "var(--shadow-soft)"
      },
      fontFamily: {
        sans: ["var(--font-family-zh)"],
        en: ["var(--font-family-en)"]
      },
      spacing: {
        "page-x": "var(--page-padding-x)",
        "page-y": "var(--page-padding-y)",
        "grid-xs": "var(--grid-gap-xs)",
        "grid-sm": "var(--grid-gap-sm)",
        "grid-md": "var(--grid-gap-md)",
        "grid-lg": "var(--grid-gap-lg)",
        "grid-xl": "var(--grid-gap-xl)"
      }
    }
  },
  plugins: []
} satisfies Config;
