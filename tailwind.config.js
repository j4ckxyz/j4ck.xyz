/** @type {import('tailwindcss').Config} */
const token = (name) => `oklch(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './projects.html', './now.html', './weeks.html', './404.html', './scripts/render.mjs'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: token('paper'),
        surface: token('surface'),
        ink: token('ink'),
        divider: token('divider'),
        inverse: token('inverse'),
        'on-inverse': token('on-inverse'),
        red: token('red'),
        'red-text': token('red-text'),
        coral: token('coral'),
        'coral-soft': token('coral-soft'),
        'on-red': token('on-red'),
        'on-coral': token('on-coral'),
        'tag-on-ink': token('tag-on-ink'),
        'tag-on-surface': token('tag-on-surface'),
        'dot-coral': token('dot-coral'),
      },
      borderRadius: {
        card: '56px',
      },
    },
  },
  plugins: [],
}
