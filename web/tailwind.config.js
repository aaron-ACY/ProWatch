/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        sm: '2px',
        md: '6px',
        lg: '6px',
        xl: '6px',
        '2xl': '6px',
      },
      colors: {
        'bg-base': '#ffffff',
        'bg-subtle': '#fafafa',
        'bg-muted': '#f4f4f5',
        'border-default': '#e4e4e7',
        'border-strong': '#d4d4d8',
        'text-primary': '#18181b',
        'text-secondary': '#52525b',
        'text-muted': '#71717a',
        accent: {
          DEFAULT: '#0e7490', // cyan-700
          hover: '#155e75',   // cyan-800
          tint: '#ecfeff',    // cyan-50
        },
        status: {
          ok: '#047857',      // emerald-700
          vital: '#e11d48',   // rose-600
          warning: '#b45309', // amber-700
          danger: '#b91c1c',  // red-700
        },
      },
    },
  },
  plugins: [],
};
