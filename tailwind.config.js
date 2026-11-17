import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',

    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
            },
            // Paleta do redesenho (canvas "Aquafuros — Refactorização UI/UX").
            // Os nomes Tailwind ficam (slate/cyan/emerald/amber/rose) para não
            // reescrever 23k linhas, mas os valores são os do design:
            //  · slate  → neutros azulados (claro: #F4F6FB…#464F66; escuro:
            //    campos #2A3140, cartões #161A22, página #0B0D12)
            //  · cyan   → azul secundário #0059FF (links, progresso, foco);
            //    o azul-marinho primário #041A53 é `brand`
            //  · emerald/amber/rose → os 3 estados: em dia, atenção, risco
            colors: {
                ink: '#030923',
                brand: { DEFAULT: '#041A53', hover: '#0A2A78', soft: '#E6EEFF' },
                slate: {
                    50: '#F4F6FB',
                    100: '#EDF1F8',
                    200: '#E1E7F3',
                    300: '#C9D2E3',
                    400: '#8C97B0',
                    500: '#5B6478',
                    600: '#464F66',
                    700: '#363E51',
                    800: '#2A3140',
                    900: '#161A22',
                    950: '#0B0D12',
                },
                cyan: {
                    50: '#F0F4FF',
                    100: '#E6EEFF',
                    200: '#D6E2FF',
                    300: '#9DBBFF',
                    400: '#6EA2FF',
                    500: '#0059FF',
                    600: '#0050E6',
                    700: '#0059FF',
                    800: '#0047CC',
                    900: '#0A2A78',
                    950: '#0E1C3F',
                },
                emerald: {
                    50: '#E3F2E9', 100: '#D3EBDD', 200: '#B5DCC4', 300: '#7DD3A3', 400: '#7DD3A3',
                    500: '#2EA063', 600: '#1E7148', 700: '#1E7148', 800: '#175C3A', 900: '#12462D', 950: '#11281D',
                },
                amber: {
                    50: '#FCEFD9', 100: '#FAE5C2', 200: '#F3D29E', 300: '#F3C77A', 400: '#F3C77A',
                    500: '#D98A00', 600: '#B86A00', 700: '#8A4F00', 800: '#6E3F00', 900: '#4F2D00', 950: '#2A2212',
                },
                rose: {
                    50: '#FDF1F0', 100: '#FCE7E5', 200: '#F3C6C1', 300: '#F4A39A', 400: '#F4A39A',
                    500: '#D92D20', 600: '#B42318', 700: '#B42318', 800: '#912018', 900: '#6B1A13', 950: '#2D1714',
                },
                background: 'hsl(var(--background) / <alpha-value>)',
                foreground: 'hsl(var(--foreground) / <alpha-value>)',
                card: { DEFAULT: 'hsl(var(--card) / <alpha-value>)', foreground: 'hsl(var(--card-foreground) / <alpha-value>)' },
                popover: { DEFAULT: 'hsl(var(--popover) / <alpha-value>)', foreground: 'hsl(var(--popover-foreground) / <alpha-value>)' },
                primary: { DEFAULT: 'hsl(var(--primary) / <alpha-value>)', foreground: 'hsl(var(--primary-foreground) / <alpha-value>)' },
                secondary: { DEFAULT: 'hsl(var(--secondary) / <alpha-value>)', foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)' },
                muted: { DEFAULT: 'hsl(var(--muted) / <alpha-value>)', foreground: 'hsl(var(--muted-foreground) / <alpha-value>)' },
                accent: { DEFAULT: 'hsl(var(--accent) / <alpha-value>)', foreground: 'hsl(var(--accent-foreground) / <alpha-value>)' },
                destructive: { DEFAULT: 'hsl(var(--destructive) / <alpha-value>)', foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)' },
                border: 'hsl(var(--border) / <alpha-value>)',
                input: 'hsl(var(--input) / <alpha-value>)',
                ring: 'hsl(var(--ring) / <alpha-value>)',
                chart: {
                    1: 'hsl(var(--chart-1))',
                    2: 'hsl(var(--chart-2))',
                    3: 'hsl(var(--chart-3))',
                    4: 'hsl(var(--chart-4))',
                    5: 'hsl(var(--chart-5))',
                },
                sidebar: {
                    DEFAULT: 'hsl(var(--sidebar-background) / <alpha-value>)',
                    foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
                    primary: 'hsl(var(--sidebar-primary) / <alpha-value>)',
                    'primary-foreground': 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
                    accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
                    'accent-foreground': 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
                    border: 'hsl(var(--sidebar-border) / <alpha-value>)',
                    ring: 'hsl(var(--sidebar-ring) / <alpha-value>)',
                },
            },
            // Raios do design: cartões 18px, botões/campos 12px, chips 9px.
            borderRadius: {
                sm: '6px',
                DEFAULT: '9px',
                md: '12px',
                lg: '18px',
                xl: '18px',
                '2xl': '24px',
            },
            boxShadow: {
                sm: '0 1px 2px rgba(4, 26, 83, 0.05), 0 8px 24px rgba(4, 26, 83, 0.07)',
                lg: '0 18px 44px rgba(4, 26, 83, 0.18)',
                xl: '0 24px 60px rgba(4, 26, 83, 0.22)',
            },
        },
    },

    plugins: [forms, animate],
};
