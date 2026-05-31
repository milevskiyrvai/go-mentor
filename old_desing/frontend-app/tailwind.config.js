/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#07080A",
        surface: "#0F1014",
        elevated: "#16181E",
        border: {
          DEFAULT: "#262830",
          bright: "#363842",
        },
        primary: {
          DEFAULT: "#D4FF3D",
          dim: "rgba(212,255,61,0.28)",
        },
        secondary: {
          DEFAULT: "#FF3D9A",
          dim: "rgba(255,61,154,0.30)",
        },
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
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
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
