# Hexo Blog 项目协作指南

这是一个基于 Hexo + Butterfly 主题的个人技术博客项目。

## 项目结构

```
My-Blog/
├── source/_posts/           # Markdown 博客文章
├── themes/butterfly/        # Butterfly 主题（git submodule）
├── scripts/                 # Hexo 自定义脚本（自动加载）
│   ├── post-desc-excerpt.js     # excerpt → description 转换
│   ├── scrape-old-cnblogs.js    # 博客园历史文章爬取（手动运行）
│   ├── sync-cnblogs-full.js     # 博客园同步脚本（手动运行）
│   └── fix-*.js                 # 其他维护脚本（手动运行）
├── _config.yml              # Hexo 主配置
└── _config.butterfly.yml    # Butterfly 主题配置
```

## 主题 Submodule 处理原则

### 现状
`themes/butterfly` 是一个 **git submodule**，指向 `https://github.com/jerryc127/hexo-theme-butterfly.git`。

### 定制方式（按优先级）

1. **优先使用 `_config.butterfly.yml`** — 主题配置覆盖，不碰主题文件
2. **使用 `inject` 注入** — 在 `_config.butterfly.yml` 的 `inject:` 区块添加自定义 CSS/JS
3. **使用 `scripts/` 目录** — Hexo 会自动加载，可覆盖主题的 helper/filter
4. **最后才考虑修改主题文件** — 见下方"何时脱离 submodule"

### 何时考虑脱离 submodule

满足以下**任一条件**时，可考虑将主题转为普通文件夹：

#### 必须脱离的情况
1. **需要频繁修改主题核心逻辑**（如模板结构 `.pug` 文件、核心 JS）
2. **inject 方式无法实现的功能**（如修改 HTML 结构、替换内置组件）
3. **需要 fork 主题并维护自己的版本**

#### 可以不脱离的情况（当前策略）
1. 样式调整 → 用 `inject:` 添加 CSS 覆盖
2. 功能扩展 → 用 `inject:` 添加 JavaScript
3. 数据处理 → 用 `scripts/` 目录添加 filter/helper
4. 配置变更 → 用 `_config.butterfly.yml` 覆盖

**当前已实现的定制**（都不需要脱离 submodule）：
- ✅ `excerpt` 字段支持 → `scripts/post-desc-excerpt.js` filter
- ✅ 深色代码块切换 → `inject:` CSS + JS
- ✅ 卡片按钮组 → `inject:` JS 动态插入
- ✅ 星空背景 → `inject:` 引入外部 `starry.css/js`

### 如何脱离 submodule（操作步骤）

```bash
# 1. 备份当前主题（防止出错）
cp -r themes/butterfly themes/butterfly.backup

# 2. 删除 submodule 配置
git submodule deinit -f themes/butterfly
git rm -f themes/butterfly
rm -rf .git/modules/themes/butterfly

# 3. 将主题文件夹作为普通目录添加回来
git add themes/butterfly
git commit -m "Convert butterfly theme from submodule to regular folder"

# 4. 验证
git status  # 应该看到 themes/butterfly 下的所有文件都被追踪了
```

**脱离后的注意事项**：
- ✅ 可以随意修改主题文件并 commit
- ❌ 无法通过 `git submodule update` 更新主题
- ⚠️ 需要手动合并上游主题的更新（如果需要）

---

## 文章来源与管理

### 文章类型
1. **博客园同步文章** — 带 `cnblogs_url` frontmatter，由 `sync-cnblogs-full.js` 拉取
2. **手写文章** — 直接创建的 Markdown 文件
3. **CMS 自动生成** — 由外部工具生成，带 `excerpt` 字段

### 摘要字段规则
- **CMS 文章**使用 `excerpt` 字段（自动填入）
- **其他文章**使用 `description` 字段或自动截取正文
- **优先级**：`description` > `excerpt` > 自动截取（通过 `post-desc-excerpt.js` 实现）

### 博客园同步
```bash
# 同步最新文章（带 cnblogs_url 的）
node scripts/sync-cnblogs-full.js

# 爬取历史文章（page 3-5）
node scripts/scrape-old-cnblogs.js

# 修复日期和分类
node scripts/fix-cnblogs-dates.js
```

---

## 开发工作流

### 本地预览
```bash
hexo clean && hexo server
# 访问 http://localhost:4000
```

### 部署
```bash
hexo generate
# 生成的静态文件在 public/ 目录
```

### 添加自定义功能

**Q: 我想添加一个新的右侧栏按钮**  
A: 在 `_config.butterfly.yml` 的 `inject: bottom:` 里添加 JS，参考现有的 `darkcode` 按钮实现。

**Q: 我想修改代码高亮主题**  
A: 在 `_config.butterfly.yml` 找到 `highlight_theme` 配置，或用 `inject:` 覆盖 CSS。

**Q: 我想批量处理文章 frontmatter**  
A: 在 `scripts/` 创建新的 `.js` 工具，参考 `fix-cnblogs-dates.js` 的结构。

---

## 性能优化注意事项

- `inject:` 内联 CSS/JS 的性能损耗 < 0.1ms，优于外部文件（减少 HTTP 请求）
- `scripts/` 目录的 filter 在构建时执行，不影响访客端性能
- 手动脚本（`node scripts/xxx.js`）只在维护时运行，不影响生成速度

---

## Git 分支策略

- `main` — 稳定版本，可随时部署
- 主题 submodule 锁定在 `5.5.3` 版本
- 不要在 `themes/butterfly/` 里执行 git 操作（除非已脱离 submodule）

---

## 常见问题

### Q: 修改了 `_config.butterfly.yml` 但没生效？
A: 运行 `hexo clean` 清除缓存，然后重启 `hexo server`。

### Q: 想更新 Butterfly 主题到最新版？
A: 
```bash
cd themes/butterfly
git fetch
git checkout 版本号  # 如 6.0.0
cd ../..
git add themes/butterfly
git commit -m "Update butterfly theme to 6.0.0"
```

### Q: inject 的代码太多了，影响可读性？
A: 可以将 CSS/JS 提取到 `source/css/custom.css` 和 `source/js/custom.js`，然后在 `inject:` 里引用：
```yaml
inject:
  head:
    - <link rel="stylesheet" href="/css/custom.css">
  bottom:
    - <script src="/js/custom.js"></script>
```

---

**最后更新**: 2026-08-11  
**维护者**: rD227
