/**
 * cnblogs-copyright-link.js
 *
 * Hexo filter: 对于有 cnblogs_url 标记的文章（即从博客园爬取的文章），
 * 将版权链接从 GitHub Pages 地址改为博客园编辑页地址。
 *
 * 这样在文章底部版权区域显示的链接就会指向博客园编辑页，
 * 而非 GitHub Pages 的文章链接。
 */

hexo.extend.filter.register('before_post_render', function (data) {
  // 只有当文章有 cnblogs_url 字段时才修改
  if (data.cnblogs_url) {
    // 设置 copyright_url 为 cnblogs 编辑页链接
    // post-copyright.pug 模板中使用 page.copyright_url || page.permalink
    // 所以这里设置后，模板会优先使用 cnblogs 编辑页链接
    data.copyright_url = data.cnblogs_url;
  }
  return data;
});
