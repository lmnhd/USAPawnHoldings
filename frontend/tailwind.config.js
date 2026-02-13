/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── shadcn/ui semantic color tokens ── */
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        /* ── Vault brand tokens (preserved) ── */
        vault: {
          gold: 'var(--vault-gold)',
          'gold-light': 'var(--vault-gold-light)',
          black: 'var(--vault-black)',
          'black-deep': 'var(--vault-black-deep)',
          surface: 'var(--vault-surface)',
          'surface-elevated': 'var(--vault-surface-elevated)',
          red: 'var(--vault-red)',
          'red-hover': 'var(--vault-red-hover)',
          'text-light': 'var(--vault-text-light)',
          'text-on-gold': 'var(--vault-text-on-gold)',
          'text-muted': 'var(--vault-text-muted)',
          'text-primary': 'var(--vault-text-primary)',
          'text-secondary': 'var(--vault-text-secondary)',
          success: 'var(--vault-success)',
          warning: 'var(--vault-warning)',
          danger: 'var(--vault-danger)',
          info: 'var(--vault-info)',
          bg: 'var(--vault-bg)',
          'card-bg': 'var(--vault-card-bg)',
          'card-border': 'var(--vault-card-border)',
          'nav-bg': 'var(--vault-nav-bg)',
          'input-bg': 'var(--vault-input-bg)',
          'input-border': 'var(--vault-input-border)',
          border: 'var(--vault-border)',
          'border-accent': 'var(--vault-border-accent)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        vault: '0 4px 20px var(--vault-shadow-color)',
        'vault-lg': '0 8px 40px var(--vault-shadow-color)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
