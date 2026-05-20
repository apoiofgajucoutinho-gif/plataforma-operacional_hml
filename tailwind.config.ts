import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./modules/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          clay: "#9D6F4E",
          teal: "#0D3A4E",
          cream: "#F4F1EA",
          sand: "#E2D0B8",
          sky: "#74B9E6",
        },
      },
      boxShadow: {
        soft: "0 24px 70px rgba(13, 58, 78, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
