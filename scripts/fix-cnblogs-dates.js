/**
 * fix-cnblogs-dates.js — 一次性脚本
 *
 * 对于所有有 cnblogs_url 标记的文章，从博客园文章页抓取原始发布日期，
 * 并修正 frontmatter 中的 date 字段。
 *
 * 用法: node scripts/fix-cnblogs-dates.js
 */

const fs = require('fs');
const path = require('path');

// ============ 配置 ============
const POSTS_DIR = path.resolve(__dirname, '..', 'source', '_posts');
const USER_AGENT = 'Hexo-CNBlogs-DateFix/1.0';
const REQUEST_DELAY = 600; // 请求间隔（毫秒）
const DRY_RUN = false;     // true: 仅预览，不实际修改文件

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

  // 方法1：从 ld+json 结构化数据中提取（博客园标准格式）
  const dateMatch = html.match(/"datePublished":\s*"([^"]+)"/);
  if (dateMatch) {
    pubDate = dateMatch[1];
  }

  // 方法2：从 posted @ 行提取
  if (!pubDate) {
    const postDateMatch = html.match(/posted\s*@\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
    if (postDateMatch) {
      pubDate = postDateMatch[1].replace(/\s+/, 'T') + ':00';
    }
  }

  // 方法3：从 <time> 标签的 datetime 属性提取
  if (!pubDate) {
    const timeMatch = html.match(/<time[^>]*datetime\s*=\s*"([^"]+)"/i);
    if (timeMatch) {
      pubDate = timeMatch[1];
    }
  }

  // 方法4：从 Open Graph / meta 标签提取
  if (!pubDate) {
    const ogMatch = html.match(/<meta[^>]*property\s*=\s*"article:published_time"[^>]*content\s*=\s*"([^"]+)"/i)
      || html.match(/<meta[^>]*content\s*=\s*"([^"]+)"[^>]*property\s*=\s*"article:published_time"/i);
    if (ogMatch) {
      pubDate = ogMatch[1];
    }
  }

  // 方法5：从常见的日期 class 元素中提取（博客园旧版格式）
  if (!pubDate) {
    const spanMatch = html.match(/class\s*=\s*"[^"]*post-meta[^"]*"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/i)
      || html.match(/class\s*=\s*"[^"]*post-date[^"]*"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2})/i)
      || html.match(/class\s*=\s*"[^"]*day[^"]*"[^>]*>[\s\S]*?(\d{4}-\d{2}-\d{2})/i);
    if (spanMatch) {
      pubDate = spanMatch[1];
    }
  }

  // 方法6：最宽松的匹配 — 页面中任意 ISO 8601 日期时间
  if (!pubDate) {
    const isoMatch = html.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (isoMatch) {
      pubDate = isoMatch[1];
    }
  }

  if (!pubDate) return null;

  // 使用与 scrape-old-cnblogs.js 完全相同的转换逻辑
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

// ============ 主逻辑 ============

async function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║  博客园文章日期修正脚本         ║');
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
  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < cnblogsPosts.length; i++) {
    const post = cnblogsPosts[i];
    const progress = `[${i + 1}/${cnblogsPosts.length}]`;
    const currentDate = extractCurrentDate(post.content);
    const shortName = post.filename.length > 60
      ? post.filename.substring(0, 57) + '...'
      : post.filename;

    console.log(`${progress} ${shortName}`);
    console.log(`       当前日期: ${currentDate || '未找到'}`);
    console.log(`       postId: ${post.postId}`);

    // 2a. 抓取博客园文章页获取原始日期
    const articleUrl = `https://www.cnblogs.com/xvsu/p/${post.postId}`;
    const html = await fetchWithRetry(articleUrl);

    if (!html) {
      console.log(`       ❌ 无法获取文章页面\n`);
      failed++;
      continue;
    }

    // 2b. 提取日期（返回 frontmatter 格式的 UTC 日期字符串）
    const correctDateStr = extractPublishDate(html);
    if (!correctDateStr) {
      console.log(`       ❌ 无法提取发布日期\n`);
      failed++;
      continue;
    }

    console.log(`       正确日期: ${correctDateStr}`);

    // 2c. 比较并修正
    if (currentDate === correctDateStr) {
      console.log(`       ✅ 日期已正确，跳过\n`);
      skipped++;
    } else {
      // 替换 frontmatter 中的 date
      const newContent = post.content.replace(
        /^date:\s*.+$/m,
        `date: ${correctDateStr}`
      );

      if (!DRY_RUN) {
        fs.writeFileSync(post.filepath, newContent, 'utf-8');
      }
      console.log(`       ✏ 已修正日期: ${currentDate} → ${correctDateStr}\n`);
      fixed++;
    }

    // 请求间隔
    await sleep(REQUEST_DELAY);
  }

  // 3. 输出汇总
  console.log('═══════════════════════════════════');
  console.log(`✅ 完成！`);
  console.log(`   已修正: ${fixed}  已正确: ${skipped}  失败: ${failed}`);
  if (DRY_RUN) {
    console.log('   (预览模式，未实际修改文件)');
  }
  console.log('═══════════════════════════════════');
}

main().catch(e => {
  console.error('❌ 脚本异常:', e);
  process.exit(1);
});
