'use strict';

// Butterfly renders spinners until its counter script responds. Give each
// counter a numeric value in the generated HTML so blocked requests cannot
// leave a spinner behind, even when JavaScript is disabled.
const counterIds = 'site_uv|site_pv|page_pv';
const spinner = new RegExp(
  `(<(span|div)\\b[^>]*\\bid="busuanzi_value_(?:${counterIds})"[^>]*>)\\s*<i class="[^"]*\\bfa-spinner\\b[^"]*"><\\/i>\\s*(<\\/\\2>)`,
  'g'
);
const remainingSpinner = new RegExp(
  `<(?:span|div)\\b[^>]*\\bid="busuanzi_value_(?:${counterIds})"[^>]*>\\s*<i\\b`
);

hexo.extend.filter.register('after_render:html', html => {
  const rendered = html.replace(spinner, (_, opening, _tag, closing) => `${opening}0${closing}`);
  if (remainingSpinner.test(rendered)) {
    throw new Error('Butterfly counter markup changed; update the numeric fallback.');
  }
  return rendered;
});
