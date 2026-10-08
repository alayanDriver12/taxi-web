const path = require('node:path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [path.join(__dirname, 'web/index.html'), path.join(__dirname, 'web/src/**/*.{js,jsx}')],
  theme: { extend: {} },
  plugins: []
};
