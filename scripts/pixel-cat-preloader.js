'use strict';

const fs = require('fs');
const path = require('path');

// Reuse the existing Pixel Cat artwork, so the loading cat keeps the same
// palette and animation frames as the sidebar widget.
const widget = fs.readFileSync(path.join(hexo.source_dir, '_data', 'widget.yml'), 'utf8');
const svg = widget.match(/<svg class="pixel-cat-svg"[\s\S]*?<\/svg>/);

function group(markup, opening) {
  const start = markup.indexOf(opening);
  if (start < 0) throw new Error(`Pixel Cat group missing: ${opening}`);
  const tags = /<\/?g\b[^>]*>/g;
  tags.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tags.exec(markup))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return markup.slice(start, tags.lastIndex);
  }
  throw new Error(`Pixel Cat group is not closed: ${opening}`);
}

if (!svg) throw new Error('Pixel Cat SVG missing from widget.yml');
const body = group(svg[0], '<g class="pixel-cat-body">');
const playing = group(svg[0], '<g class="pixel-cat-state" data-state="playing">')
  .replace('class="pixel-cat-state"', 'class="pixel-cat-state active"');
const cat = `<svg class="pixel-cat-svg pc-loader-svg" viewBox="0 0 26 15" width="156" height="90" shape-rendering="crispEdges" aria-hidden="true">${body}${playing}</svg>`;
const loader = `<div id="pixel-cat-preloader" class="pc-preloader">
  <div class="pc-loader-content">
    <div class="pc-loader-stage" aria-hidden="true">
      <div class="pc-loader-spinner"><div class="dot1"></div><div class="dot2"></div></div>
      <div class="pc-loader-cat">${cat}</div>
    </div>
  </div>
</div>`;
const initialize = fs.readFileSync(path.join(hexo.source_dir, 'js', 'pixel-cat-preloader.js'), 'utf8');

hexo.extend.filter.register('after_render:html', html => {
  if (!/<body\b/i.test(html)) return html;
  return html
    .replace('</head>', '<link rel="stylesheet" href="/css/pixel-cat-preloader.css?v=3"></head>')
    .replace(/<body\b[^>]*>/i, match => `${match}${loader}<script>${initialize}</script>`);
});
