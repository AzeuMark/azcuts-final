import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // theme toggle via <html class="dark">
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand + semantic tokens (fixed across themes) — CLIENT_PLAN §1.1 / DESIGN.md.
        // Primary identity: red brand paired with a water-blue accent.
        brand: {
          DEFAULT: '#E11D48',
          hover: '#BE123C',
          fg: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#0EA5E9',
          hover: '#0284C7',
        },
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        info: '#2563EB',

        // Semantic surface/text/border tokens — flip per theme via CSS variables
        // defined in src/styles/theme.css. Named to avoid clashing with Tailwind
        // built-ins (e.g. `text-base` is a font-size): use text-ink / text-muted /
        // bg-app / bg-surface / border-line.
        app: 'rgb(var(--color-app) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          2: 'rgb(var(--color-surface-2) / <alpha-value>)',
        },
        ink: 'rgb(var(--color-text) / <alpha-value>)',
        muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        line: 'rgb(var(--color-border) / <alpha-value>)',
      },
      borderRadius: {
        md: '8px',
        xl: '12px',
        '2xl': '16px',
      },
      zIndex: {
        // Semantic stacking scale (DESIGN.md) — no arbitrary 999/9999.
        dropdown: '1000',
        sticky: '1100',
        'modal-backdrop': '1200',
        modal: '1300',
        toast: '1400',
        tooltip: '1500',
      },
      fontFamily: {
        sans: [
          'InterVariable',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Editorial display face for landing/marketing headlines.
        display: ['Oswald', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Refined serif for dashboard headings & stat numbers.
        serif: ['Fraunces', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        'card-hover': '0 4px 12px -2px rgb(16 24 40 / 0.10), 0 2px 6px -2px rgb(16 24 40 / 0.06)',
        pop: '0 10px 30px -8px rgb(16 24 40 / 0.20)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Scrolling barber-pole stripe for the dashboard brand mark.
        barber: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '34px 0' },
        },
        // Gentle attention ripple for the chat launcher bubble.
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '0.45' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        // Horizontal auto-scroll for overflowing text (e.g. long account names).
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(var(--marquee-shift, 0px))' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'scale-in': 'scale-in 160ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-left': 'slide-in-left 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in-up': 'fade-in-up 650ms cubic-bezier(0.16, 1, 0.3, 1) both',
        barber: 'barber 2.4s linear infinite',
        marquee: 'marquee 5s linear infinite alternate',
        ripple: 'ripple 2.4s ease-out infinite',
      },
    },
  },
  plugins: [forms({ strategy: 'class' })],
};
