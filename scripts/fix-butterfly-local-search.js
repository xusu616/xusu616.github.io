'use strict';

const fs = require('fs');
const path = require('path');

// Butterfly 5.5 initializes local search on window.load. A slow third-party
// request (for example Busuanzi JSONP) can keep that event pending and leave
// the search button without its click handler. Initialize once the DOM is
// ready instead, without modifying the Butterfly submodule.
hexo.extend.filter.register('after_generate', () => {
  if (hexo.theme.config.search?.use !== 'local_search') return;

  const asset = 'js/search/local-search.js';
  const sourcePath = path.join(hexo.theme_dir, 'source', asset);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const loadHook = "window.addEventListener('load', () => {";
  const domReadyHook = `const initLocalSearchWhenReady = callback => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true })
  } else {
    callback()
  }
}

initLocalSearchWhenReady(() => {`;

  if (!source.includes(loadHook)) {
    throw new Error('Butterfly local search load hook changed; update the compatibility patch.');
  }

  hexo.route.set(asset, source.replace(loadHook, domReadyHook));
});
