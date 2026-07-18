/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FDFBF7',
        sage: {
          DEFAULT: '#81B29A',
          hover: '#6A9B84',
        },
        charcoal: '#2D3748',
        'slate-body': '#4A5568',
        'slate-light': '#6B7280',
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 15px rgba(0,0,0,0.08)',
        'card-hover': '0 20px 30px rgba(0,0,0,0.12)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
      },
    },
  },
  plugins: [],
};
