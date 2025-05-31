module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        grow: {
          "0%": { transform: "scale(0.5)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        grow: "grow 1s ease-out forwards",
      },
    },
  },
  plugins: [
    require("tailwind-scrollbar"),
  ],
};
