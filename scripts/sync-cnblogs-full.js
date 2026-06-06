/**
 * sync-cnblogs-full.js
 *
 * 从博客园 RSS 获取文章列表，然后逐篇抓取全文（而非仅摘要），
 * 生成 Hexo .md 文件。替代 hexo-migrator-rss，解决以下问题：
 *
 * 1. RSS 只返回最近 ~20 篇摘要 → 现在每篇都抓全文
 * 2. 旧 workflow 先删除所有 *气温骤降*.md → 不再删除，旧文章保留
 * 3. 重复导入问题 → 通过文件名和 cnblogs URL 双重匹配去重
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const RSS_URL = 'https://feed.cnblogs.com/blog/u/858520/rss/';
const CNBLOGS_USER = 'xvsu';
const AUTHOR_SUFFIX = '气温骤降';
const POSTS_DIR = path.resolve(__dirname, '..', 'source', '_posts');
const USER_AGENT = 'Hexo-CNBlogs-Sync/1.0';
const REQUEST_DELAY = 800; // 抓取间隔（毫秒），避免被限流

// ============ 工具函数 ============

/** 从 XML 片段中提取标签内容（支持 CDATA 和命名空间） */
function extractTag(xml, tag) {
  const escaped = tag.replace(/:/g, ':');
  const regex = new RegExp(
    `<${escaped}[^>]*>\\s*(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))\\s*<\\/${escaped}>`,
    'i'
  );
  const match = xml.match(regex);
  if (match) {
    return (match[1] || match[2] || '').trim();
  }
  return '';
}

/** 从 XML 片段中提取标签的属性值（如 <link href="..."/>） */
function extractAttr(xml, tag, attrName) {
  const escaped = tag.replace(/:/g, ':');
  const regex = new RegExp(
    `<${escaped}[^>]*${attrName}\\s*=\\s*"([^"]*)"[^>]*/?>`,
    'i'
  );
  const match = xml.match(regex);
  return match ? match[1] : '';
}

/** 解析 Atom feed XML（博客园使用 Atom 而非 RSS 2.0） */
function parseAtomFeed(xml) {
  const items = [];
  // Atom 用 <entry> 而非 RSS 的 <item>
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];

    // 标题
    const title = extractTag(entryXml, 'title');

    // 链接：Atom 的 link 是自闭合标签 <link rel="alternate" href="..."/>
    let link = extractAttr(entryXml, 'link', 'href');
    if (!link) {
      // 备用：<id> 标签包含 URL
      link = extractTag(entryXml, 'id');
    }

    // 发布时间（Atom 用 <published> 而非 <pubDate>）
    let pubDate = extractTag(entryXml, 'published');
    if (!pubDate) {
      pubDate = extractTag(entryXml, 'updated');
    }

    // 摘要
    const summary = extractTag(entryXml, 'summary');

    // 正文内容（Atom 的 <content type="html">）
    const description = extractTag(entryXml, 'content') || summary;

    // 分类/标签（Atom 的 <category term="..."/>）
    const categories = [];
    const catRegex = /<category[^>]*term\s*=\s*"([^"]*)"[^>]*\/?>/g;
    let catMatch;
    while ((catMatch = catRegex.exec(entryXml)) !== null) {
      categories.push(catMatch[1]);
    }

    if (title && link) {
      items.push({ title, link, pubDate, description, categories });
    }
  }

  return items;
}

/** HTML 实体解码 */
function decodeHtmlEntities(text) {
  const entities = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
    '&#x2B;': '+',
  };
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp|#x2B);/g, m => entities[m] || m);
}

/** 从 RSS 标题生成文件名（模拟 hexo-migrator-rss 的行为） */
function generateFilename(title) {
  let filename = title
    .replace(/[\\/:*?"<>|]/g, '-')   // 替换非法文件名字符
    .replace(/\s+/g, '-')             // 空格 → 破折号
    .replace(/-+/g, '-')              // 合并连续破折号
    .replace(/^-|-$/g, '')            // 去掉首尾破折号
    .trim();

  // 博客园 RSS 标题已包含 " - 气温骤降"，所以文件名自然以 -气温骤降 结尾
  // 但以防万一，如果标题不含后缀则追加
  if (!filename.includes(AUTHOR_SUFFIX)) {
    filename += '-' + AUTHOR_SUFFIX;
  }

  // Linux 文件名最大 255 字节，UTF-8 中文每字 3 字节，需要截断
  const ext = '.md';
  const maxBytes = 240; // 留余量
  if (Buffer.byteLength(filename + ext, 'utf8') > maxBytes) {
    const suffixIdx = filename.lastIndexOf(AUTHOR_SUFFIX);
    const suffix = (suffixIdx > 0) ? filename.substring(suffixIdx) : '';
    const titlePart = (suffixIdx > 0) ? filename.substring(0, suffixIdx - 1) : filename;
    const suffixBytes = Buffer.byteLength('-' + suffix + ext, 'utf8');
    let truncated = titlePart;
    while (Buffer.byteLength(truncated, 'utf8') > maxBytes - suffixBytes) {
      truncated = truncated.substring(0, truncated.length - 1);
    }
    truncated = truncated.replace(/-$/, '');
    filename = truncated + '-' + suffix;
  }

  return filename + ext;
}

/** 发起 HTTP 请求（含重试） */
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) return await res.text();
      console.warn(`  ⚠ HTTP ${res.status} (第 ${i + 1}/${retries} 次尝试)`);
    } catch (e) {
      console.warn(`  ⚠ 请求失败: ${e.message} (第 ${i + 1}/${retries} 次尝试)`);
    }
    if (i < retries - 1) {
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 从博客园文章页面 HTML 中提取正文内容 */
function extractArticleBody(html) {
  // 定位 #cnblogs_post_body 起始标签
  const startMatch = html.match(/<div[^>]*id="cnblogs_post_body"[^>]*>/);
  if (!startMatch) return null;
  const startIdx = startMatch.index + startMatch[0].length;

  // 定位 #blog_post_info_block 作为结束标记
  const rest = html.substring(startIdx);
  const endMatch = rest.match(/<div[^>]*id="blog_post_info_block"[^>]*>/);
  const endIdx = endMatch ? startIdx + endMatch.index : html.length;

  // 提取两者之间的原始内容
  let content = html.substring(startIdx, endIdx);

  // 移除末尾残留的闭合标签和空 div（如 </div>、<div class="clear"></div>）
  content = content.replace(
    /(?:\s*<\/div>\s*|\s*<div[^>]*class="clear"[^>]*><\/div>\s*)+$/,
    ''
  );

  content = content.trim();
  return content ? normalizeContent(content) : null;
}

/** 规范化文章内容：修复相对 URL、HTML 代码块转 markdown fence、清理空白 */
function normalizeContent(content) {
  // 1. 将相对路径的图片/链接转为绝对路径
  content = content.replace(
    /(src|href)="(\/[^"]+)"/g,
    (_, attr, relativeUrl) => {
      if (relativeUrl.startsWith('//')) {
        return `${attr}="https:${relativeUrl}"`;
      }
      return `${attr}="https://www.cnblogs.com${relativeUrl}"`;
    }
  );

  // 2. 博客园 HTML 代码块 → markdown fenced code block
  //    这样 Hexo 渲染器才能正确高亮，Butterfly 主题才会显示语言标签和复制按钮
  content = content.replace(
    /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, className, code) => {
      // 提取语言: "language-kotlin" → "kotlin"
      let lang = '';
      if (className) {
        const langMatch = className.match(/language-(\w+)/i);
        if (langMatch) lang = langMatch[1].toLowerCase();
      }

      // 解码 HTML 实体（博客园对代码块内容做了 HTML 转义）
      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      return `\`\`\`${lang}\n${decoded.trim()}\n\`\`\``;
    }
  );

  // 清理开头和结尾的无用空白
  content = content.trim();

  return content;
}

/** 从 HTML 生成纯文本摘要（用于 frontmatter 的 excerpt 和首页卡片） */
function generateExcerpt(html, maxLen = 300) {
  let text = html
    .replace(/<[^>]+>/g, '')          // 去掉所有 HTML 标签
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')             // 合并空白
    .trim();

  if (text.length > maxLen) {
    text = text.substring(0, maxLen - 3).replace(/\s+\S*$/, '') + '...';
  }
  return text;
}

/** 通过 cnblogs 文章 URL 查找已有的 post 文件（处理文件名不一致的情况） */
function findExistingByUrl(cnblogUrl) {
  if (!fs.existsSync(POSTS_DIR)) return null;

  // 提取 postId 以兼容新旧两种 URL 格式
  // 旧: https://www.cnblogs.com/xvsu/p/19904407
  // 新: https://i.cnblogs.com/posts/edit;postId=19904407
  const postIdMatch = cnblogUrl.match(/\/p\/(\d+)|\/edit;postId=(\d+)/);
  if (!postIdMatch) return null;
  const postId = postIdMatch[1] || postIdMatch[2];

  const files = fs.readdirSync(POSTS_DIR);
  for (const f of files) {
    if (!f.endsWith(`-${AUTHOR_SUFFIX}.md`)) continue;
    const filepath = path.join(POSTS_DIR, f);
    const content = fs.readFileSync(filepath, 'utf-8');
    // 按 postId 匹配 frontmatter 中的 cnblogs_url
    const fmMatch = content.match(/^cnblogs_url:\s*(.+)$/m);
    if (fmMatch && fmMatch[1].trim().includes(postId)) {
      return { filename: f, filepath, content };
    }
  }
  return null;
}

/** 检查 Hexo post 是否已包含全文（而非仅摘要），且内容干净无残留 */
function hasFullContent(postContent) {
  // 如果文件里还有 "阅读全文" 链接，说明只有摘要
  if (postContent.includes('[阅读全文]')) return false;
  // 如果文件末尾有残留的 HTML 标签（旧版提取器留下的），需要重新提取
  const trailing = postContent.slice(-200);
  if (trailing.includes('class="clear"') || trailing.includes('</div>\n')) return false;
  return true;
}

// ============ 主逻辑 ============

async function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║  博客园全文同步脚本             ║');
  console.log('╚══════════════════════════════════╝\n');

  // ── 1. 获取并解析 RSS ──
  console.log(`📡 获取 RSS: ${RSS_URL}`);
  const rssXml = await fetchWithRetry(RSS_URL);
  if (!rssXml) {
    console.error('❌ 无法获取 RSS feed，退出。');
    process.exit(1);
  }

  const items = parseAtomFeed(rssXml);
  console.log(`📋 RSS 中有 ${items.length} 篇文章\n`);

  // ── 2. 确保 _posts 目录存在 ──
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  // ── 3. 处理每篇文章 ──
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const progress = `[${i + 1}/${items.length}]`;

    console.log(`${progress} ${item.title}`);
    console.log(`       ${item.link}`);

    // 3a. 根据标题生成预期文件名
    const filename = generateFilename(item.title);
    let targetPath = path.join(POSTS_DIR, filename);
    let existingFile = null;

    // 3b. 检查是否已有同名文件
    if (fs.existsSync(targetPath)) {
      existingFile = {
        filename,
        filepath: targetPath,
        content: fs.readFileSync(targetPath, 'utf-8'),
      };
    } else {
      // 3c. 如果没有同名文件，通过 cnblogs URL 查找（处理 slug 差异）
      existingFile = findExistingByUrl(item.link);
      if (existingFile) {
        console.log(`       🔗 通过 URL 匹配到已有文件: ${existingFile.filename}`);
        targetPath = existingFile.filepath;
      }
    }

    // 3d. 如果已存在且已有全文 → 跳过
    if (existingFile && hasFullContent(existingFile.content)) {
      console.log(`       ⏭ 已有全文，跳过\n`);
      skipped++;
      continue;
    }

    // 3e. 抓取文章全文
    console.log(`       ⬇ 抓取全文...`);
    const pageHtml = await fetchWithRetry(item.link);

    let articleBody = null;
    if (pageHtml) {
      articleBody = extractArticleBody(pageHtml);
      if (articleBody) {
        console.log(`       ✓ 全文提取成功 (${articleBody.length} 字符)`);
      } else {
        console.log(`       ⚠ 无法从页面提取正文`);
      }
    } else {
      console.log(`       ⚠ 无法获取文章页面`);
    }

    // 3f. 生成 Hexo post 内容
    const postContent = buildHexoPost(item, articleBody);

    // 3g. 写入文件
    fs.writeFileSync(targetPath, postContent, 'utf-8');

    if (existingFile) {
      updated++;
      console.log(`       ✏ 已更新为全文\n`);
    } else {
      created++;
      console.log(`       ✨ 新文章已创建\n`);
    }

    // 3h. 请求间隔（礼貌抓取）
    await sleep(REQUEST_DELAY);
  }

  // ── 4. 输出汇总 ──
  console.log('═══════════════════════════════════');
  console.log(`✅ 同步完成！`);
  console.log(`   新创建: ${created}  更新为全文: ${updated}  跳过: ${skipped}  失败: ${failed}`);
  console.log('═══════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

/** 构建 Hexo .md 文件内容 */
function buildHexoPost(item, articleBody) {
  // 拆分标签：含 "/" 的转为层级 categories，不含 "/" 的保留为 tags
  const allLabels = (item.categories && item.categories.length > 0) ? item.categories : [];
  const tagsList = [];
  const categoriesList = [];

  for (const label of allLabels) {
    if (label.includes('/')) {
      // cnblogs 层级标签: "Android架构和安全 / 刷机" → [Android架构和安全, 刷机]
      const parts = label.split('/').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) categoriesList.push(parts);
    } else {
      tagsList.push(label);
    }
  }

  // 构建 tags YAML
  const tagsYaml = tagsList.length > 0
    ? `tags:\n${tagsList.map(t => `  - ${t}`).join('\n')}`
    : 'tags: []';

  // 构建 categories YAML（层级分类展开为缩进列表，如 categories:\n  - Parent\n  - Child）
  let categoriesYaml = '';
  if (categoriesList.length > 0) {
    categoriesYaml = '\ncategories:\n' + categoriesList.map(parts =>
      parts.map(p => `  - ${p}`).join('\n')
    ).join('\n');
  }

  // 日期
  const date = new Date(item.pubDate);
  const dateStr = isNaN(date.getTime())
    ? new Date().toISOString().replace('T', ' ').substring(0, 19)
    : date.toISOString().replace('T', ' ').substring(0, 19);

  // 如果是全文，则生成摘要文本；否则使用 RSS description
  let excerpt;
  let bodyContent;

  if (articleBody) {
    // 全文模式
    excerpt = generateExcerpt(articleBody);
    bodyContent = `${excerpt}\n<!-- more -->\n\n${articleBody}`;
  } else {
    // 降级：使用 RSS 摘要
    const desc = decodeHtmlEntities(item.description || '');
    excerpt = desc.replace(/<[^>]+>/g, '').substring(0, 300);
    bodyContent = `${excerpt}\n<!-- more -->\n\n${desc}\n\n> 原文地址: [${item.title}](${item.link})`;
  }

  // 将公开链接转为编辑页链接：https://www.cnblogs.com/xvsu/p/19904407 → https://i.cnblogs.com/posts/edit;postId=19904407
  const postIdMatch = item.link.match(/\/p\/(\d+)/);
  const editUrl = postIdMatch
    ? `https://i.cnblogs.com/posts/edit;postId=${postIdMatch[1]}`
    : item.link;

  return `---
title: ${item.title}
${tagsYaml}${categoriesYaml}
date: ${dateStr}
cnblogs_url: ${editUrl}
---

${bodyContent}
`;
}

// 仅在直接运行时执行（node scripts/sync-cnblogs-full.js），Hexo 构建时跳过
if (require.main === module) {
  main().catch(e => {
    console.error('❌ 脚本异常:', e);
    process.exit(1);
  });
}
module.exports = { main };
