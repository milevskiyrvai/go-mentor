/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#07080A",
        surface: "#0F1014",
        elevated: "#16181E",
        "elevated-2": "#1B1E26",
        border: {
          DEFAULT: "#262830",
          bright: "#363842",
        },
        primary: "#D4FF3D",
        secondary: "#FF3D9A",
        success: "#7BE38C",
        warning: "#FFDB3D",
        danger: "#FF5B5B",
        text: {
          DEFAULT: "#F0F0F2",
          2: "#8A8A92",
          3: "#50525C",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
      boxShadow: {
        "glow-warning": "0 0 22px rgba(255, 219, 61, 0.4)",
        "glow-primary": "0 0 22px rgba(212, 255, 61, 0.4)",
        "glow-secondary": "0 0 22px rgba(255, 61, 154, 0.4)",
      },
    },
  },
  plugins: [],
};
