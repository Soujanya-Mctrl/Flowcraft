/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg": {
          "primary": "var(--bg-primary)",
        },
        "text": {
          "primary": "var(--text-primary)",
          "secondary": "var(--text-secondary)",
        },
        "border": {
          "primary": "var(--border-primary)",
        },
        "accent": {
          "blue": "var(--accent-blue)",
        }
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        rounded: ["SF Pro Rounded", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
      },
      borderRadius: {
        pill: "9999px",
        container: "12px",
      },
      lineHeight: {
        "extra-tight": "1.0",
        tight: "1.1",
        snug: "1.2",
      },
      letterSpacing: {
        tighter: "-0.05em",
        tight: "-0.025em",
      },
    },
  },

  plugins: [require("@tailwindcss/typography")],
};

