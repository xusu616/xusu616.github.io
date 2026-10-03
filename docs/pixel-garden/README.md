# 一周像素花园

独立实现的 MIT 开源组件，安装在 Butterfly 头像卡片的 GitHub / 博客园按钮下方。无运行时依赖，无需修改或脱离主题子仓库。像素画为原创 SVG，不调用 Forkest，也没有复制其图像或代码。

## 生长规则

一周按配置时区的周一至周日排列，每株植物代表一天的 GitHub 贡献数量：

| 每日贡献 | 植物 |
| --- | --- |
| 0 | 土中的种子 |
| 1–2 | 萌芽 |
| 3–5 | 展叶 |
| 6–9 | 含苞 |
| ≥10 | 盛放；秋季带果实 |

本周总数与上周相同天数的总数比较，不拿未结束的一周与完整上周比较。点击每个星期标签可查看日期、贡献数和生长阶段。未来日期用 `·` 和空土表示；缺失数据用 `?`，不会冒充零贡献。

北半球：3–5 月为春、6–8 月为夏、9–11 月为秋、12–2 月为冬。季节改变天空、山丘、土壤、叶片与花朵的颜色，冬季还有积雪；南半球相反。这是按月份划分的视觉季节。

## 配置

主配置 `_config.yml`：

```yaml
pixel_garden:
  enable: true
  username: rD227
  timezone: Asia/Shanghai
  hemisphere: north # north / south
  live_refresh: true
```

主题配置通过 `inject.head` 引入 `/css/pixel-garden.css`，通过 `inject.bottom` 按顺序引入 `/js/pixel-garden-core.js`、`/js/pixel-garden.js`。若安装在网站子路径，给这些注入路径及第二个脚本的 `data-config` 加上站点前缀。关闭 `enable` 后不再生成花园配置、数据和 SVG，也不会挂载组件。

## 数据与更新

- 构建时读取 [GitHub 的公开贡献日历](https://github.com/users/rD227/contributions)，不需要令牌。日期和贡献数保留 GitHub 的统计口径；配置时区决定组件的“今天”和周边界，并不重新归属 GitHub 已统计的贡献。
- 生成 `garden/data.json`、`garden/config.json` 与 `garden/week.svg`。构建失败时尝试读取 `.cache/pixel-garden/` 的本地缓存，并标记缓存状态；全无数据时显示不可用状态。
- 可选的访客端更新使用 [GitHub Contributions API](https://github.com/grubersjoe/github-contributions-api)，这是独立的开源公共服务，并非 GitHub 官方 API；它缓存约一小时。组件也缓存一小时，访客请求不包含凭据，数据中只有日期和数量。禁用 `live_refresh` 可只使用本地生成的数据。
- 公共 API 超时、离线、浏览器禁用存储时，仍可使用本地快照。页面标注数据更新时间，旧快照标注“缓存”，本周缺失数据标注待更新。
- Pages 工作流新增每日北京时间 08:17 的构建部署计划；实际运行时间取决于 GitHub Actions 调度。需要将修改提交到默认分支，计划任务才会启用。长期无活动的仓库可能需要在 Actions 中重新启用计划任务。
- 跨日及跨周后页面会按新日期重绘，并尝试刷新数据。支持 `pjax:complete`，重复初始化不重复插入。

普通 SVG 徽章可通过以下形式复用：

```markdown
[![一周像素花园](https://rd227.github.io/garden/week.svg)](https://github.com/rD227)
```

SVG 徽章在网站重新构建时更新；卡片中的组件还可以使用可选公共 API 刷新。第三方使用徽章时也可能受图片代理缓存影响。

## 文件与许可范围

本目录的 MIT 许可仅覆盖此组件的新增文件：

- `source/js/pixel-garden-core.js`：日期、季节、生长阶段和原创像素 SVG；同时可用于 Node.js 与浏览器。
- `source/js/pixel-garden.js`：数据、缓存、头像卡片挂载及交互。
- `source/css/pixel-garden.css`：明暗主题和自适应卡片样式。
- `scripts/pixel-garden.js`：Hexo 构建数据和独立徽章。
- `tests/pixel-garden.test.cjs`：日期边界、数据解析和失败回退验证。
- 本目录文档与许可。

不更改博客文章和 Butterfly 主题已有的许可证。运行 `node --test tests/pixel-garden.test.cjs` 验证逻辑，运行 `npm run build` 生成博客。
