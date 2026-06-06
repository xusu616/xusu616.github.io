/**
 * fix-code-blocks.js — 一次性脚本
 *
 * 将博客园爬取的 HTML <pre><code> 代码块转为 markdown fenced code block，
 * 这样 Hexo + Butterfly 主题才能正确语法高亮、显示语言标签和复制按钮。
 *
 * 用法: node scripts/fix-code-blocks.js
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.resolve(__dirname, '..', 'source', '_posts');

function convertHtmlCodeBlocks(content) {
  return content.replace(
    /<pre><code(?:\s+class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_, className, code) => {
      let lang = '';
      if (className) {
        const langMatch = className.match(/language-(\w+)/i);
        if (langMatch) lang = langMatch[1].toLowerCase();
      }

      const decoded = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      return `\`\`\`${lang}\n${decoded.trim()}\n\`\`\``;
    }
  );
}

function main() {
  console.log('╔══════════════════════════════════╗');
  console.log('║  HTML 代码块 → Markdown Fence   ║');
  console.log('╚══════════════════════════════════╝\n');

  if (!fs.existsSync(POSTS_DIR)) {
    console.error('❌ _posts 目录不存在');
    process.exit(1);
  }

  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  let totalFixed = 0;
  let totalBlocks = 0;

  for (const f of files) {
    const filepath = path.join(POSTS_DIR, f);
    const content = fs.readFileSync(filepath, 'utf-8');

    // 统计 HTML code 块数量
    const count = (content.match(/<pre><code(?:\s+class="[^"]*")?>/g) || []).length;
    if (count === 0) continue;

    const newContent = convertHtmlCodeBlocks(content);
    if (newContent !== content) {
      fs.writeFileSync(filepath, newContent, 'utf-8');
      console.log(`  ✏ ${f} (${count} block(s))`);
      totalFixed++;
      totalBlocks += count;
    }
  }

  console.log(`\n✅ 完成！`);
  console.log(`   修改文件: ${totalFixed}  转换代码块: ${totalBlocks}`);
}

main();
