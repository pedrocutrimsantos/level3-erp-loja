/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },

      colors: {
        // ── Tokens semânticos ────────────────────────────────────────────────
        background:  'rgb(var(--background)  / <alpha-value>)',
        foreground:  'rgb(var(--foreground)  / <alpha-value>)',

        card: {
          DEFAULT:    'rgb(var(--card)            / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },

        muted: {
          DEFAULT:    'rgb(var(--muted)            / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },

        border:  'rgb(var(--border) / <alpha-value>)',
        input:   'rgb(var(--input)  / <alpha-value>)',

        accent: {
          DEFAULT:    'rgb(var(--accent)            / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },

        ring: 'rgb(var(--ring) / <alpha-value>)',

        chart: {
          1:    'rgb(var(--chart-1)    / <alpha-value>)',
          grid: 'rgb(var(--chart-grid) / <alpha-value>)',
          label:'rgb(var(--chart-label)/ <alpha-value>)',
        },

        destructive: {
          DEFAULT:    'rgb(var(--destructive)    / <alpha-value>)',
          foreground: 'rgb(var(--destructive-fg) / <alpha-value>)',
        },

        success: {
          DEFAULT:    'rgb(var(--success)    / <alpha-value>)',
          foreground: 'rgb(var(--success-fg) / <alpha-value>)',
        },

        warning: {
          DEFAULT:    'rgb(var(--warning)    / <alpha-value>)',
          foreground: 'rgb(var(--warning-fg) / <alpha-value>)',
        },

        // ── Cores de marca ───────────────────────────────────────────────────
        primary: {
          DEFAULT:    '#1B4332',
          foreground: '#FFFFFF',
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#1B4332',
        },

        secondary: {
          DEFAULT:    '#D4A017',
          foreground: '#1A1A1A',
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#D4A017',
          800: '#92400E',
          900: '#78350F',
        },
      },

      // Berry border radius — cards 12px, buttons/inputs 8px
      borderRadius: {
        '2xl': '1rem',    // 16px — modals
        xl:    '0.75rem', // 12px — cards (Berry MainCard)
        lg:    '0.5rem',  // 8px  — buttons, inputs
        md:    '0.375rem',// 6px
        sm:    '0.25rem', // 4px  — badges, chips
      },

      // Berry shadow scale
      boxShadow: {
        card:  '0 2px 14px 0 rgba(32,40,45,0.08)',
        'card-hover': '0 4px 20px 0 rgba(32,40,45,0.14)',
        sm:    '0 1px 4px 0 rgba(32,40,45,0.06)',
        md:    '0 2px 8px 0 rgba(32,40,45,0.10)',
        lg:    '0 4px 24px 0 rgba(32,40,45,0.14)',
        xl:    '0 8px 32px 0 rgba(32,40,45,0.18)',
      },

      ringColor: {
        DEFAULT: 'rgb(var(--ring) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}
