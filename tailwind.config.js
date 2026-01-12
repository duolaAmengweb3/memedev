/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B5CF6',
        background: '#0F172A',
        card: '#1E293B',
        'card-hover': '#334155',
        success: '#22C55E',
        warning: '#EAB308',
        danger: '#EF4444',
        'text-primary': '#F8FAFC',
        'text-secondary': '#94A3B8',
      },
    },
  },
  plugins: [],
}
