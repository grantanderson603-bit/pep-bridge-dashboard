/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'pep-dark': '#0f1923',
        'pep-card': '#1a2840',
        'pep-border': '#2d3f5a',
        'pep-blue': '#2563eb',
        'pep-accent': '#60a5fa',
      }
    }
  },
  plugins: []
}
