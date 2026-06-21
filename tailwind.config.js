/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './*.html',
    './pages/**/*.html',
    './assets/shared/**/*.html',
    './assets/js/**/*.js',
  ],
  safelist: [
    'bg-blue-600',
    'text-white',
    'active',
    'hidden',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
