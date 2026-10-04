'use strict';

// The bundled Butterfly helper omits the event argument in its generated
// system-theme listener. Repair the generated HTML without editing the submodule.
hexo.extend.filter.register('after_render:html', html =>
  html
    .replace(
      '<meta charset="UTF-8">',
      '<meta charset="UTF-8"><meta name="color-scheme" content="light dark">'
    )
    .replace(
      "mediaQueryDark.addEventListener('change', () => {",
      "mediaQueryDark.addEventListener('change', e => {"
    )
);
