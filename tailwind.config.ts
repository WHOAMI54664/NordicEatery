import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF7EA",
        paprika: "#B51F26",
        cherry: "#7B1018",
        honey: "#E0A12B",
        dark: "#24140F"
      },
      boxShadow: {
        soft: "0 24px 80px rgba(80, 32, 12, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
