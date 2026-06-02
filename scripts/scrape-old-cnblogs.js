/**
 * scrape-old-cnblogs.js — 一次性脚本
 *
 * 爬取博客园列表页 page 3-5 的历史文章（RSS feed 只包含最近 20 篇），
 * 逐篇抓取全文，生成 Hexo .md 文件。
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const CNBLOGS_USER = 'xvsu';
const AUTHOR_SUFFIX = '气温骤降';
const POSTS_DIR = path.resolve(__dirname, '..', 'source', '_posts');
const USER_AGENT = 'Hexo-CNBlogs-Sync/1.0';
const PAGES = [3, 4, 5];
const REQUEST_DELAY = 800;

// ============ 工具函数 ============

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
    if (i < retries - 1) await sleep(1000 * (i + 1));
  }
  return null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============ 列表页解析 ============

async function fetchListingPage(pageNum) {
  const url = `https://www.cnblogs.com/${CNBLOGS_USER}?page=${pageNum}`;
  console.log(`📄 获取列表页: ${url}`);
  const html = await fetchWithRetry(url);
  if (!html) return [];

  // 提取所有 article 链接中的 postId
  const postIds = [];
  const regex = /href="[^"]*\/xvsu\/p\/(\d+)"/g;
  let match;
  const seen = new Set();
  while ((match = regex.exec(html)) !== null) {
    const id = match[1];
    if (!seen.has(id)) {
      seen.add(id);
      postIds.push(id);
    }
  }
  console.log(`   找到 ${postIds.length} 篇文章`);
  return postIds;
}

// ============ 文章页解析 ============

function extractArticleBody(html) {
  // 定位 #cnblogs_post_body 起始标签
  const startMatch = html.match(/<div[^>]*id="cnblogs_post_body"[^>]*>/);
  if (!startMatch) return null;
  const startIdx = startMatch.index + startMatch[0].length;

  // 定位 #blog_post_info_block 作为结束标记
  const rest = html.substring(startIdx);
  const endMatch = rest.match(/<div[^>]*id="blog_post_info_block"[^>]*>/);
  const endIdx = endMatch ? startIdx + endMatch.index : html.length;

  let content = html.substring(startIdx, endIdx);

  // 移除末尾残留的闭合标签和空 div
  content = content.replace(
    /(?:\s*<\/div>\s*|\s*<div[^>]*class="clear"[^>]*><\/div>\s*)+$/,
    ''
  );

  // 规范化：修复相对 URL
  content = content.replace(
    /(src|href)="(\/[^"]+)"/g,
    (_, attr, rel) => rel.startsWith('//')
      ? `${attr}="https:${rel}"`
      : `${attr}="https://www.cnblogs.com${rel}"`
  );

  return content.trim() || null;
}

function extractArticleInfo(html, postId) {
  // 标题：<title>Article Title - 气温骤降 - 博客园</title>
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  let title = titleMatch ? titleMatch[1].trim() : '';
  // 去掉末尾的 " - 博客园" 和 " - 气温骤降"
  title = title.replace(/\s*-\s*博客园\s*$/, '');
  title = title.replace(/\s*-\s*气温骤降\s*$/, '').trim();

  // 日期：从 ld+json 或 <time> 标签提取
  let pubDate = '';
  const dateMatch = html.match(/"datePublished":\s*"([^"]+)"/);
  if (dateMatch) {
    pubDate = dateMatch[1];
  } else {
    // 备用：从 posted @ 行提取
    const postDateMatch = html.match(/posted\s*@\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
    if (postDateMatch) pubDate = postDateMatch[1].replace(/\s+/, 'T') + ':00';
  }

  // 标签：<meta name="keywords" content="..."/>
  const keywordsMatch = html.match(/<meta[^>]*name="keywords"[^>]*content="([^"]*)"/);
  const categories = keywordsMatch
    ? keywordsMatch[1].split(',').map(s => s.trim()).filter(Boolean)
    : [];

  // 正文
  const body = extractArticleBody(html);

  return { title, pubDate, categories, body };
}

// ============ 文件生成 ============

function generateFilename(title) {
  let filename = title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();

  if (!filename.includes(AUTHOR_SUFFIX)) {
    filename += '-' + AUTHOR_SUFFIX;
  }

  // 截断过长文件名（Linux 255 字节限制）
  const ext = '.md';
  const maxBytes = 240;
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

function generateExcerpt(html, maxLen = 300) {
  let text = html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > maxLen) {
    text = text.substring(0, maxLen - 3).replace(/\s+\S*$/, '') + '...';
  }
  return text;
}

function buildHexoPost(info, postId) {
  const tags = info.categories.length > 0
    ? info.categories.map(c => `  - ${c}`).join('\n')
    : '  - 未分类';

  let dateStr;
  try {
    const d = new Date(info.pubDate);
    dateStr = isNaN(d.getTime())
      ? new Date().toISOString().replace('T', ' ').substring(0, 19)
      : d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  const editUrl = `https://i.cnblogs.com/posts/edit;postId=${postId}`;

  let bodyContent;
  if (info.body) {
    const excerpt = generateExcerpt(info.body);
    bodyContent = `${excerpt}\n<!-- more -->\n\n${info.body}`;
  } else {
    bodyContent = `> 原文: ${editUrl}`;
    console.log(`       ⚠ 未能提取正文，仅保留链接`);
  }

  return `---
title: ${info.title} - ${AUTHOR_SUFFIX}
tags:
${tags}
date: ${dateStr}
cnblogs_url: ${editUrl}
---

${bodyContent}
`;
}

function isAlreadySynced(postId) {
  if (!fs.existsSync(POSTS_DIR)) return false;

  const editUrl = `https://i.cnblogs.com/posts/edit;postId=${postId}`;
  const oldUrl = `https://www.cnblogs.com/xvsu/p/${postId}`;

  for (const f of fs.readdirSync(POSTS_DIR)) {
    if (!f.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
    // 检查 frontmatter 中的 cnblogs_url
    if (content.includes(editUrl) || content.includes(oldUrl)) {
      return true;
    }
  }
  return false;
}

// ============ 主逻辑 ============

async function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║  博客园历史文章爬取（page 3-5） ║');
  console.log('╚══════════════════════════════════╝\n');

  // 1. 收集所有列表页的 postId
  const allPostIds = [];
  for (const page of PAGES) {
    const ids = await fetchListingPage(page);
    allPostIds.push(...ids);
    await sleep(500);
  }

  // 去重
  const uniqueIds = [...new Set(allPostIds)];
  console.log(`\n📋 共找到 ${uniqueIds.length} 篇历史文章\n`);

  // 2. 过滤已同步的
  const newIds = uniqueIds.filter(id => !isAlreadySynced(id));
  console.log(`   其中 ${uniqueIds.length - newIds.length} 篇已同步，${newIds.length} 篇待爬取\n`);

  if (newIds.length === 0) {
    console.log('✅ 没有需要爬取的新文章。');
    return;
  }

  // 3. 确保目录存在
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }

  // 4. 逐篇爬取
  let created = 0;
  let failed = 0;
  let skippedNoContent = 0;

  for (let i = 0; i < newIds.length; i++) {
    const postId = newIds[i];
    const articleUrl = `https://www.cnblogs.com/${CNBLOGS_USER}/p/${postId}`;
    const progress = `[${i + 1}/${newIds.length}]`;

    console.log(`${progress} ${articleUrl}`);

    // 4a. 抓取文章页
    const html = await fetchWithRetry(articleUrl);
    if (!html) {
      console.log(`       ❌ 无法获取页面\n`);
      failed++;
      continue;
    }

    // 4b. 提取信息
    const info = extractArticleInfo(html, postId);

    if (!info.title) {
      console.log(`       ❌ 无法提取标题\n`);
      failed++;
      continue;
    }

    if (!info.body) {
      skippedNoContent++;
    }

    console.log(`       📝 "${info.title}"`);
    console.log(`       📅 ${info.pubDate || '未知日期'}`);
    console.log(`       🏷 ${info.categories.join(', ') || '无标签'}`);
    console.log(`       📄 正文: ${info.body ? info.body.length + ' 字符' : '未提取到'}`);

    // 4c. 生成文件
    const filename = generateFilename(info.title + ' - ' + AUTHOR_SUFFIX);
    const filepath = path.join(POSTS_DIR, filename);
    const content = buildHexoPost(info, postId);

    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`       ✅ 已保存: ${filename}\n`);
    created++;

    await sleep(REQUEST_DELAY);
  }

  // 5. 输出汇总
  console.log('═══════════════════════════════════');
  console.log('✅ 爬取完成！');
  console.log(`   成功: ${created}  失败: ${failed}  无正文: ${skippedNoContent}`);
  console.log('═══════════════════════════════════');
}

main().catch(e => {
  console.error('❌ 脚本异常:', e);
  process.exit(1);
});
