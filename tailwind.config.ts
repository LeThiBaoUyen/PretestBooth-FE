import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/client/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f0f4f8",
          100: "#d9e2f0",
          200: "#b3c5e1",
          300: "#8da7d2",
          400: "#678ac3",
          500: "#406db4",
          600: "#1B3A6B",
          700: "#153058",
          800: "#0f2445",
          900: "#0a1832",
        },
        rose: {
          50: "#fff5f7",
          100: "#ffebf0",
          200: "#ffd1df",
          300: "#ffb3ce",
          400: "#ff8fb8",
          500: "#ff6ba2",
          600: "#f5478c",
          700: "#e63875",
          800: "#d6285e",
          900: "#c61847",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
