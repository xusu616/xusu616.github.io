/**
 * fix-cnblogs-dates.js
 *
 * 对于所有有 cnblogs_url 标记的文章：
 *   1. 从博客园文章页抓取原始发布日期，修正 frontmatter 中的 date 字段
 *   2. 将 tags 中含 "/" 的标签（如 "Android架构和安全 / 刷机"）转为
 *      Hexo 层级 categories: [Android架构和安全, 刷机]
 *
 * 用法: node scripts/fix-cnblogs-dates.js
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const POSTS_DIR = path.resolve(__dirname, '..', 'source', '_posts');
const DEBUG_DIR = path.resolve(__dirname, '..', 'debug_html'); // 保存失败页面的 HTML 用于调试
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REQUEST_DELAY = 600; // 请求间隔（毫秒）
const DRY_RUN = false;     // true: 仅预览，不实际修改文件
const DEBUG = false;       // true: 保存失败页面的 HTML 到 debug_html/ 目录

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

/**
 * 从博客园文章页 HTML 中提取发布日期，返回 frontmatter 格式的日期字符串。
 * 使用与 scrape-old-cnblogs.js 相同的逻辑：toISOString() 转换，
 * 确保日期格式一致（UTC 时间）。
 */
function extractPublishDate(html) {
  let pubDate = '';

  // 方法1：从 window.currentPostDateAdded 提取（博客园页面 JS 变量，最干净）
  // 格式: window.currentPostDateAdded = '2026-04-08 09:58'
  const jsDateMatch = html.match(/window\.currentPostDateAdded\s*=\s*'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})'/);
  if (jsDateMatch) {
    pubDate = jsDateMatch[1]; // "2026-04-08 09:58"（中国本地时间）
  }

  // 方法2：从 ld+json 提取（需要解码 HTML 实体如 &#x2B; → +）
  if (!pubDate) {
    const ldMatch = html.match(/"datePublished":\s*"([^"]+)"/);
    if (ldMatch) {
      // 解码 HTML 实体：&#x2B; → + , &amp; → &
      pubDate = ldMatch[1]
        .replace(/&#x2B;/gi, '+')
        .replace(/&amp;/g, '&');
    }
  }

  // 方法3：从 posted @ 行提取
  if (!pubDate) {
    const postDateMatch = html.match(/posted\s*@\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
    if (postDateMatch) {
      pubDate = postDateMatch[1].replace(/\s+/, 'T') + ':00';
    }
  }

  // 方法4：从 <time> 标签的 datetime 属性提取
  if (!pubDate) {
    const timeMatch = html.match(/<time[^>]*datetime\s*=\s*"([^"]+)"/i);
    if (timeMatch) {
      pubDate = timeMatch[1];
    }
  }

  // 方法5：从 meta 标签提取
  if (!pubDate) {
    const ogMatch = html.match(/<meta[^>]*property\s*=\s*"article:published_time"[^>]*content\s*=\s*"([^"]+)"/i)
      || html.match(/<meta[^>]*content\s*=\s*"([^"]+)"[^>]*property\s*=\s*"article:published_time"/i);
    if (ogMatch) {
      pubDate = ogMatch[1];
    }
  }

  // 方法6：页面中任意 ISO 8601 日期时间（兜底）
  if (!pubDate) {
    const isoMatch = html.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (isoMatch) {
      pubDate = isoMatch[1];
    }
  }

  if (!pubDate) return null;

  // 与 scrape-old-cnblogs.js 相同的转换逻辑：new Date() → toISOString() (UTC)
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return null;

  return d.toISOString().replace('T', ' ').substring(0, 19);
}

/** 从 frontmatter 中提取 postId */
function extractPostId(frontmatter) {
  const match = frontmatter.match(/cnblogs_url:\s*https:\/\/i\.cnblogs\.com\/posts\/edit;postId=(\d+)/);
  return match ? match[1] : null;
}

/** 从 frontmatter 中提取当前 date 值 */
function extractCurrentDate(frontmatter) {
  const match = frontmatter.match(/^date:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * 修正 frontmatter 中的 tags：将含 "/" 的标签转为层级 categories
 * 例如: "Android架构和安全 / 刷机" → categories: [Android架构和安全, 刷机]
 * 不含 "/" 的保留为普通 tags
 */
function fixTagsToCategories(fullContent) {
  // 分割 frontmatter（首行必须是 ---）
  const fmStart = fullContent.indexOf('---\n');
  if (fmStart !== 0) return fullContent;

  // 找第二个 --- 作为 frontmatter 结束标记
  const fmEnd = fullContent.indexOf('\n---\n', fmStart + 4);
  if (fmEnd === -1) return fullContent;

  const frontmatter = fullContent.substring(fmStart + 4, fmEnd + 1); // 不含首尾 ---
  const afterFm = fullContent.substring(fmEnd + 1);                  // 从 "\n---\n..." 开始

  // 解析现有 tags 块
  const tagsMatch = frontmatter.match(/^tags:\s*\n((?:^\s{2}-\s.+\n)*)/m);
  if (!tagsMatch) return fullContent;

  const tagsBlock = tagsMatch[1];
  const tagLines = tagsBlock.split('\n').filter(l => l.trim().startsWith('- '));
  const tagsList = [];
  const categoriesList = [];

  for (const line of tagLines) {
    const label = line.replace(/^\s{2}-\s/, '').trim();
    if (!label) continue;

    if (label.includes('/')) {
      const parts = label.split('/').map(s => s.trim()).filter(Boolean);
      if (parts.length > 0) categoriesList.push(parts);
    } else {
      tagsList.push(label);
    }
  }

  // 如果没有需要转换的含 "/" 标签，直接返回
  if (categoriesList.length === 0) return fullContent;

  // 重建 tags YAML
  const tagsYaml = tagsList.length > 0
    ? `tags:\n${tagsList.map(t => `  - ${t}`).join('\n')}`
    : 'tags: []';

  // 构建 categories YAML（末尾必须带 \n，因为替换时消耗了标签块末尾的 \n）
  const categoriesYaml = categoriesList.map(parts =>
    parts.length === 1
      ? `  - ${parts[0]}`
      : `  - [${parts.join(', ')}]`
  ).join('\n');

  // 重建 frontmatter：
  // 1. 移除已有的 categories 块（防止重复运行）
  let updatedFm = frontmatter.replace(/\ncategories:\s*\n(?:^\s{2}(?:-\s*\[.*?\]|-\s*.+)\n?)*/mg, '');
  // 2. 替换 tags 块，末尾补 \n 保证和后续字段分隔
  updatedFm = updatedFm.replace(
    /^tags:\s*\n((?:^\s{2}-\s.+\n)*)/m,
    `${tagsYaml}\n${categoriesYaml.length > 0 ? `categories:\n${categoriesYaml}\n` : ''}`
  );

  // afterFm 已以 "\n---\n..." 开头，所以直接拼接
  return `---\n${updatedFm}${afterFm}`;
}

// ============ 主逻辑 ============

async function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║  博客园文章修正脚本             ║');
  console.log('║  - 修正日期 (date)              ║');
  console.log('║  - 标签→分类 (tags→categories)  ║');
  console.log(`║  模式: ${DRY_RUN ? '预览 (DRY RUN)' : '实际修改'}                  ║`);
  console.log('╚══════════════════════════════════╝\n');

  if (!fs.existsSync(POSTS_DIR)) {
    console.error('❌ _posts 目录不存在');
    process.exit(1);
  }

  // 1. 收集所有有 cnblogs_url 的文章
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));

  const cnblogsPosts = [];
  for (const f of files) {
    const filepath = path.join(POSTS_DIR, f);
    const content = fs.readFileSync(filepath, 'utf-8');
    const postId = extractPostId(content);
    if (postId) {
      cnblogsPosts.push({ filename: f, filepath, content, postId });
    }
  }

  console.log(`📋 找到 ${cnblogsPosts.length} 篇有 cnblogs_url 的文章\n`);

  // 2. 逐篇处理
  let dateFixed = 0;
  let dateSkipped = 0;
  let dateFailed = 0;
  let catFixed = 0;
  let catSkipped = 0;

  for (let i = 0; i < cnblogsPosts.length; i++) {
    const post = cnblogsPosts[i];
    let currentContent = post.content;
    const progress = `[${i + 1}/${cnblogsPosts.length}]`;
    const currentDate = extractCurrentDate(currentContent);
    const shortName = post.filename.length > 60
      ? post.filename.substring(0, 57) + '...'
      : post.filename;

    console.log(`${progress} ${shortName}`);
    console.log(`       当前日期: ${currentDate || '未找到'}`);
    console.log(`       postId: ${post.postId}`);

    // ── 2a. 修正日期 ──
    const articleUrl = `https://www.cnblogs.com/xvsu/p/${post.postId}`;
    const html = await fetchWithRetry(articleUrl);

    if (!html) {
      console.log(`       ❌ 无法获取文章页面\n`);
      dateFailed++;
      continue;
    }

    const correctDateStr = extractPublishDate(html);
    if (!correctDateStr) {
      console.log(`       ❌ 无法提取发布日期\n`);
      dateFailed++;
      continue;
    }

    console.log(`       正确日期: ${correctDateStr}`);

    if (currentDate === correctDateStr) {
      console.log(`       ✅ 日期已正确`);
      dateSkipped++;
    } else {
      currentContent = currentContent.replace(
        /^date:\s*.+$/m,
        `date: ${correctDateStr}`
      );
      console.log(`       ✏ 已修正日期: ${currentDate} → ${correctDateStr}`);
      dateFixed++;
    }

    // ── 2b. 修正 tags → categories ──
    const newContent = fixTagsToCategories(currentContent);
    if (newContent !== currentContent) {
      // 检查具体改了哪些 categories
      const catMatch = newContent.match(/^categories:\s*\n((?:^\s{2}-.+\n?)*)/m);
      const cats = catMatch ? catMatch[1].trim().split('\n').map(l => l.trim()).join(', ') : '';
      if (!DRY_RUN) {
        fs.writeFileSync(post.filepath, newContent, 'utf-8');
      }
      console.log(`       ✏ 已修正 categories: ${cats}`);
      catFixed++;
    } else {
      catSkipped++;
    }

    console.log('');

    // 请求间隔
    await sleep(REQUEST_DELAY);
  }

  // 3. 输出汇总
  console.log('═══════════════════════════════════');
  console.log('✅ 完成！');
  console.log(`   日期: 已修正 ${dateFixed}  已正确 ${dateSkipped}  失败 ${dateFailed}`);
  console.log(`   分类: 已修正 ${catFixed}  无需改 ${catSkipped}`);
  if (DRY_RUN) {
    console.log('   (预览模式，未实际修改文件)');
  }
  console.log('═══════════════════════════════════');
}

// 仅在直接运行时执行（node scripts/fix-cnblogs-dates.js），Hexo 构建时跳过
if (require.main === module) {
  main().catch(e => {
    console.error('❌ 脚本异常:', e);
    process.exit(1);
  });
}
module.exports = { main };
