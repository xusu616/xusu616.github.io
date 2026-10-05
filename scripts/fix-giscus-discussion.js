'use strict';

// Keep the existing discussion attached to this article. Giscus cannot
// reliably find its long percent-encoded pathname through title search.
const articlePath = '/2026/03/23/Xiaomi-pad-5(nabu)';
const siteOrigin = new URL(hexo.config.url).origin;
const defaultMapping = ": { 'data-mapping': (option && option['data-mapping']) || 'pathname' }";
const fixedMapping = ": { 'data-mapping': 'number', 'data-term': '12' }";

hexo.extend.filter.register('after_render:html', html => {
  if (!html.includes(`property="og:url" content="${siteOrigin}${articlePath}`)) return html;
  if (!html.includes(defaultMapping)) {
    throw new Error('Expected Butterfly giscus mapping was not found in the article');
  }
  return html.replace(defaultMapping, fixedMapping);
});
