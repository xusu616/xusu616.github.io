/**
 * cnblogs-copyright-link.js
 *
 * Hexo filter: 对于有 cnblogs_url 标记的文章（即从博客园爬取的文章），
 * 将版权链接从 GitHub Pages 地址改为博客园公开文章地址。
 *
 * 这样在文章底部版权区域显示的链接就会指向博客园公开文章页
 * （https://www.cnblogs.com/xvsu/p/xxxxx），而非 GitHub Pages 的文章链接。
 */

hexo.extend.filter.register('before_post_render', function (data) {
  if (data.cnblogs_url) {
    // 从 cnblogs_url 中提取 postId，构建公开文章链接
    // cnblogs_url 格式: https://i.cnblogs.com/posts/edit;postId=19971348
    // 转换为:           https://www.cnblogs.com/xvsu/p/19971348
    const postIdMatch = data.cnblogs_url.match(/postId=(\d+)/);
    if (postIdMatch) {
      data.copyright_url = `https://www.cnblogs.com/xvsu/p/${postIdMatch[1]}`;
    } else {
      // 兜底：如果 postId 提取失败，直接用 cnblogs_url 的值
      data.copyright_url = data.cnblogs_url;
    }
  }
  return data;
});
