/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './**/*.liquid',
        './src/**/*.{js,ts,css}',
        './sections/**/*.liquid',
        './snippets/**/*.liquid',
        './layout/**/*.liquid',
        './templates/**/*.liquid',
    ],
    blocklist: ['!container'],
    theme: {
        extend: {
            screens: {
                xl: '1280px',
                '2xl': '1440px',
                '3xl': '1536px',
                '4xl': '1920px',
                '5xl': '2560px',
            },
            colors: {
                surface: {
                    50: '#FFFFFF',
                    100: '#F3F4F5',
                    200: '#A08735',
                    300: '#B0BAC0',
                    400: '#6B7E88',
                    500: '#092839',
                },
                brand: {
                    50: '#06061C',
                    100: '#EBB58C',
                    200: '#BF8B66',
                    300: '#F8F3ED',
                    400: '#B19E5E',
                    500: '#E8E2D9',
                },
                background: 'var(--color-background, #FFFFFF)',
                primary: 'var(--color-primary, #000000)',
                secondary: 'var(--color-secondary, #A08735)',
                border: 'var(--border-color, #000000)',
                'primary-background': 'var(--color-primary-background, transparent)',
                'primary-foreground': 'var(--color-primary-foreground, #000000)',
                'secondary-background': 'var(--color-secondary-background, #000000)',
                'secondary-foreground': 'var(--color-secondary-foreground, #FFFFFF)',
            },
            fontFamily: {
                inter: ['Inter', 'sans-serif'],
                cormorantGaramond: ['Cormorant Garamond', 'serif'],
            },
            fontWeight: {
                light: 300,
                regular: 400,
                medium: 500,
                semibold: 600,
                bold: 700,
            },
            lineHeight: {
                3: '1.3',
                tight: '1.3',
            },
            letterSpacing: {
                1: '0.01em',
                2: '0.02em',
            },
            aspectRatio: {
                '4/3': '4 / 3',
            },
            spacing: {
                section: '3rem', // 51.2px
                'header-height': 'var(--header-height)', // Dynamisch
            },
            width: {
                full: '100%',
            },
            borderRadius: {
                sm: '0.25rem',
                lg: '0.5rem',
                '3xl': '1.25rem',
            },
            borderWidth: {
                1: '0.063',
            },
            zIndex: {
                90: '90',
            },
            wordBreak: {
                auto: 'auto',
            },
            keyframes: {
                appear: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
                atcTickPop: {
                    '0%': {
                        opacity: 0,
                        transform: 'scale(0.9)',
                    },
                    '100%': {
                        opacity: 1,
                        transform: 'scale(1)',
                    },
                },
                atcTickDraw: {
                    to: {
                        'stroke-dashoffset': '0',
                    },
                },
            },
            animation: {
                appear: 'appear 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                'atc-tick-pop': 'atcTickPop 200ms ease-out forwards',
                'atc-tick-draw': 'atcTickDraw 350ms ease-out forwards',
            },
        },
    },
    plugins: [
        /* Base */
        require('./src/assets/tailwind/base/typography'),

        /* Layout */
        require('./src/assets/tailwind/base/layout'),

        /* Components */
        /* Utilities */
        require('./src/assets/tailwind/utilities/scrollbar-none'),
    ],
};
