/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-secondary': '#ffffff',
        'secondary-fixed-dim': '#bec6e0',
        'on-background': '#191c1e',
        surface: '#f7f9fb',
        'on-error-container': '#93000a',
        'on-secondary-container': '#5c647a',
        'tertiary-fixed': '#6ffbbe',
        'surface-container-highest': '#e0e3e5',
        'on-surface-variant': '#424754',
        'inverse-primary': '#adc6ff',
        'tertiary-fixed-dim': '#4edea3',
        primary: '#0058be',
        'on-tertiary-container': '#f5fff6',
        'on-secondary-fixed-variant': '#3f465c',
        'surface-container-low': '#f2f4f6',
        'on-tertiary-fixed': '#002113',
        'primary-fixed': '#d8e2ff',
        background: '#f7f9fb',
        'tertiary-container': '#00855b',
        'on-tertiary': '#ffffff',
        'on-surface': '#191c1e',
        error: '#ba1a1a',
        'on-secondary-fixed': '#131b2e',
        'primary-container': '#2170e4',
        'on-primary': '#ffffff',
        'primary-fixed-dim': '#adc6ff',
        tertiary: '#006947',
        'surface-dim': '#d8dadc',
        'secondary-fixed': '#dae2fd',
        'secondary-container': '#dae2fd',
        'on-primary-container': '#fefcff',
        'inverse-on-surface': '#eff1f3',
        'surface-bright': '#f7f9fb',
        'inverse-surface': '#2d3133',
        'surface-container-high': '#e6e8ea',
        'surface-container-lowest': '#ffffff',
        'on-tertiary-fixed-variant': '#005236',
        'on-primary-fixed-variant': '#004395',
        'surface-container': '#eceef0',
        'outline-variant': '#c2c6d6',
        secondary: '#565e74',
        'surface-variant': '#e0e3e5',
        'surface-tint': '#005ac2',
        outline: '#727785',
        'on-primary-fixed': '#001a42'
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1.5rem',
        full: '9999px'
      },
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
}
