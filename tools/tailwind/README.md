# Rebuilding tailwind.css

`/tailwind.css` replaces the Tailwind Play CDN script (cdn.tailwindcss.com), which Tailwind
documents as development only. It is generated from the classes used in the site's HTML.

Rebuild after adding or changing Tailwind classes in any page (run from the repo root):

    npx tailwindcss@3.4.17 -c tools/tailwind/tailwind.config.js -i tools/tailwind/input.css -o tailwind.css --minify

Pinned to 3.4.17, the version the CDN served when this was introduced. Commit the new tailwind.css.
