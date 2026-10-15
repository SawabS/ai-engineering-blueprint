#!/bin/sh
# Builds the single-file site (index.html) from the sources in src/.
set -e
cd "$(dirname "$0")"
FAV='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect x="2" y="6" width="36" height="32" rx="11" fill="%236FC68E"/><rect x="2" y="2" width="36" height="32" rx="11" fill="%23A6E9BE"/><path d="M20 11.2V8.4" stroke="%230E3B21" stroke-width="2.2" stroke-linecap="round"/><circle cx="20" cy="6.9" r="2.1" fill="%230E3B21"/><rect x="6.6" y="17" width="3" height="7" rx="1.5" fill="%230E3B21"/><rect x="30.4" y="17" width="3" height="7" rx="1.5" fill="%230E3B21"/><rect x="9.6" y="11.6" width="20.8" height="17.4" rx="6" fill="%230E3B21"/><rect x="13.6" y="16.6" width="4.4" height="5.4" rx="2.2" fill="%23A6E9BE"/><rect x="22" y="16.6" width="4.4" height="5.4" rx="2.2" fill="%23A6E9BE"/><path d="M16.4 25.2h7.2" stroke="%23A6E9BE" stroke-width="1.8" stroke-linecap="round"/></svg>'
{
echo '<!doctype html>'
echo '<html lang="en">'
echo '<head>'
echo '<meta charset="utf-8">'
echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
echo '<title>AI Engineering Blueprint</title>'
echo '<meta name="description" content="An interactive course on AI engineering, from the naked LLM to agent harnesses, built one block at a time.">'
echo '<meta name="author" content="Sawab Sarkavri">'
echo '<meta property="og:title" content="AI Engineering Blueprint">'
echo '<meta property="og:description" content="An interactive course on AI engineering, from the naked LLM to agent harnesses, built one block at a time.">'
echo '<meta property="og:type" content="website">'
echo '<meta name="theme-color" content="#A6E9BE">'
echo "<link rel=\"icon\" type=\"image/svg+xml\" href=\"data:image/svg+xml,$FAV\">"
echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800;900&family=Source+Code+Pro:wght@400;600;700&display=swap">'
echo '<style>:root{padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0}img{max-width:100%}'
cat src/styles.css
echo '</style>'
echo '</head>'
echo '<body>'
echo '<div id="app"></div>'
echo '<script>'
cat src/sound.js src/content.js src/widgets.js src/core_base.js src/core_ui.js src/board.js
echo 'boot();'
echo '</script>'
echo '</body>'
echo '</html>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
