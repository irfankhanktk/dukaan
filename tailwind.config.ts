import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dukaan design tokens (Figma variables "Dukaan colors")
        brand: {
          primary: "#0F5C4A",
          "primary-soft": "#E2EFE9",
          accent: "#E39B2D",
          "accent-soft": "#FBEFD9",
          whatsapp: "#15803D",
        },
        surface: {
          bg: "#F8F5EF",
          card: "#FFFFFF",
        },
        text: {
          primary: "#1F1D1A",
          secondary: "#6B665D",
          inverse: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E6DFD2",
          default: "#E6DFD2",
        },
        feedback: {
          danger: "#B42318",
        },
        status: {
          "new-bg": "#FCEFD6",
          "new-fg": "#8A5A0F",
          "preparing-bg": "#E3EDFA",
          "preparing-fg": "#1E4C86",
          "out-bg": "#EEE7FA",
          "out-fg": "#5A3896",
          "delivered-bg": "#E1F1E5",
          "delivered-fg": "#22663A",
          "unconfirmed-bg": "#EEECE7",
          "unconfirmed-fg": "#5C5850",
          "rejected-bg": "#FBE4E2",
          "rejected-fg": "#B42318",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        urdu: ["var(--font-urdu)", "serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "14px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
