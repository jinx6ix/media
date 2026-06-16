import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  "#fdf8ec",
          100: "#f9edcc",
          200: "#f2d98a",
          300: "#e8c04a",
          400: "#c9a84c",
          500: "#b08d35",
          600: "#8a6d27",
          700: "#634e1b",
          800: "#3d3010",
          900: "#1e1800",
        },
        dark: {
          50:  "#1a1a1a",
          100: "#161616",
          200: "#121212",
          300: "#0f0f0f",
          400: "#0d0d0d",
          500: "#0a0a0a",
        }
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
