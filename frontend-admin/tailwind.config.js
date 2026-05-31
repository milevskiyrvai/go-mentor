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
        primary: {
          DEFAULT: "#5F8268",
          ink: "#456450",
          soft: "#E1EADC",
        },
        secondary: {
          DEFAULT: "#B26B45",
          soft: "#EEDDD0",
        },
        success: { DEFAULT: "#5F8268", soft: "#E1EADC" },
        warning: { DEFAULT: "#A9842F", soft: "#ECE0C4" },
        danger: { DEFAULT: "#AF5840", soft: "#EDD9D0" },
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
        DEFAULT: "0 1px 2px rgba(40,30,20,.05)",
        sm: "0 1px 1px rgba(40,30,20,.05)",
      },
    },
  },
  plugins: [],
};
