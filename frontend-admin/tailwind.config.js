/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F1E8",
        surface: "#FFFDF8",
        elevated: "#FFFFFF",
        "elevated-2": "#FFFFFF",
        border: {
          DEFAULT: "#E5DCCD",
          bright: "#D4C9B5",
        },
        primary: "#5F8268",
        secondary: "#B26B45",
        success: "#5F8268",
        warning: "#A9842F",
        danger: "#AF5840",
        text: {
          DEFAULT: "#221D17",
          2: "#5E564A",
          3: "#948B7B",
        },
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Hanken Grotesk", "ui-monospace", "Menlo", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "9px",
        lg: "14px",
      },
      boxShadow: {
        "glow-warning": "var(--shadow, 0 1px 2px rgba(40,30,20,.05))",
        "glow-primary": "var(--shadow, 0 1px 2px rgba(40,30,20,.05))",
        "glow-secondary": "var(--shadow, 0 1px 2px rgba(40,30,20,.05))",
      },
    },
  },
  plugins: [],
};
