// Build config for /tailwind.css. Same colors the pages used to pass to the Tailwind CDN script.
module.exports = {
  content: ['./*.html', './blog/*.html', './cta.js', './attribution.js'],
  theme: {
    extend: {
      colors: {
        'navy': '#001850',
        'navy-light': '#002470',
        'gold': '#FADC61',
        'gold-dark': '#E5C94D',
        'slate': '#64748B',
        'dark': '#32373c',
      },
    },
  },
};
