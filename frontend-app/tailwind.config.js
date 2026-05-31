/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F1E8",
        surface: "#FFFDF8",
        elevated: "#FFFFFF",
        border: {
          DEFAULT: "#E5DCCD",
          bright: "#D4C9B5",
        },
        primary: {
          DEFAULT: "#5F8268",
          ink: "#456450",
          dim: "rgba(95,130,104,0.16)",
          soft: "#E1EADC",
        },
        secondary: {
          DEFAULT: "#B26B45",
          dim: "rgba(178,107,69,0.16)",
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
        sans: ['Hanken Grotesk', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Hanken Grotesk', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: "6px",
        md: "9px",
        lg: "14px",
      },
      keyframes: {
        pulseDot: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        toastIn: {
          "0%": { transform: "translateY(-12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        shine: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
      },
      animation: {
        "pulse-dot": "pulseDot 1.5s ease-in-out infinite",
        "toast-in": "toastIn .3s ease-out",
        shine: "shine 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
