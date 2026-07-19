export default {
  content: ['./index.html', './src/**/*.js', './src/tailwind-safelist.html'],
  darkMode: ['variant', '&:where([data-color-scheme="dark"], [data-color-scheme="dark"] *)'],
  theme: {
    extend: {},
  },
  plugins: [],
};
