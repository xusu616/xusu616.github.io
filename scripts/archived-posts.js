'use strict';

const pagination = require('hexo-pagination');

const ARCHIVED_TAG_NAMES = new Set(['ai-generated', 'archived']);

function isArchivedTagName(name) {
  return ARCHIVED_TAG_NAMES.has(String(name || '').trim().toLowerCase());
}

function isArchivedPost(post) {
  if (!post || !post.tags) return false;
  const tags = post.tags.data || (typeof post.tags.toArray === 'function' ? post.tags.toArray() : []);
  return tags.some(tag => isArchivedTagName(tag && tag.name));
}

const toMomentLocale = lang => {
  if (!lang || ['en', 'default'].includes(lang)) return 'en';
  return lang.toLowerCase().replace('_', '-');
};

hexo.extend.filter.register('after_init', () => {
  const Category = hexo.model('Category');
  const Tag = hexo.model('Tag');
  const Post = hexo.model('Post');

  // 1. Filter archived posts out of Category virtuals (sidebar, /categories/, category pages)
  // while preserving `post.categories` on the post itself so cards on /archived/ still show categories.
  const origCatPathGetter = Category.schema.path('path').getter;
  Category.schema.path('posts').get(function () {
    const ReadOnlyPostCategory = hexo._binaryRelationIndex.post_category;
    const ids = ReadOnlyPostCategory.find({ category_id: this._id }).map(item => item.post_id);
    return hexo.locals
      .get('posts')
      .find({ _id: { $in: ids } })
      .filter(post => !isArchivedPost(post));
  });

  Category.schema.path('length').get(function () {
    return this.posts.length;
  });

  Category.schema.path('path').get(function () {
    if (this.length === 0) return 'archived/';
    return origCatPathGetter.call(this);
  });

  // 2. Filter archived posts and `ai-generated` / `archived` tags out of Tag virtuals
  // (hides from .card-tag-cloud, /tags/, tag pages, and related_posts).
  const origTagPathGetter = Tag.schema.path('path').getter;
  Tag.schema.path('posts').get(function () {
    if (isArchivedTagName(this.name)) {
      return new Post.Query([]);
    }
    const ReadOnlyPostTag = hexo._binaryRelationIndex.post_tag;
    const ids = ReadOnlyPostTag.find({ tag_id: this._id }).map(item => item.post_id);
    return hexo.locals
      .get('posts')
      .find({ _id: { $in: ids } })
      .filter(post => !isArchivedPost(post));
  });

  Tag.schema.path('length').get(function () {
    if (isArchivedTagName(this.name)) return 0;
    return this.posts.length;
  });

  Tag.schema.path('path').get(function () {
    if (isArchivedTagName(this.name) || this.length === 0) return 'archived/';
    return origTagPathGetter.call(this);
  });

  // 3. Homepage (`index`) generator: exclude archived posts from main page
  hexo.extend.generator.register('index', function (locals) {
    const config = this.config;
    const normalPosts = locals.posts
      .filter(post => !isArchivedPost(post))
      .sort(config.index_generator.order_by);

    normalPosts.data.sort((a, b) => (b.sticky || 0) - (a.sticky || 0));

    const paginationDir = config.index_generator.pagination_dir || config.pagination_dir || 'page';
    const path = config.index_generator.path || '';

    return pagination(path, normalPosts, {
      perPage: config.index_generator.per_page,
      layout: config.index_generator.layout || ['index', 'archive'],
      format: paginationDir + '/%d/',
      data: {
        __index: true
      }
    });
  });

  // 4. `/archived/` generator: display archived / AI-generated posts using homepage UI (`indexPostUI`)
  hexo.extend.generator.register('archived', function (locals) {
    const config = this.config;
    const archivedPosts = locals.posts
      .filter(post => isArchivedPost(post))
      .sort(config.index_generator.order_by || '-date');

    archivedPosts.data.sort((a, b) => (b.sticky || 0) - (a.sticky || 0));

    const paginationDir = config.index_generator.pagination_dir || config.pagination_dir || 'page';
    const perPage = archivedPosts.length ? config.index_generator.per_page : 0;

    return pagination('archived', archivedPosts, {
      perPage,
      layout: ['index', 'archive'],
      format: paginationDir + '/%d/',
      data: {
        title: 'Archived',
        type: 'archived'
      }
    });
  });

  // 5. Wrap `archive` and local search (`json` / `xml`) generators so archived posts don't appear there
  const generators = hexo.extend.generator.list();
  ['archive', 'json', 'xml'].forEach(name => {
    const origGen = generators[name];
    if (typeof origGen === 'function') {
      hexo.extend.generator.register(name, function (locals) {
        const normalPosts = locals.posts.filter(post => !isArchivedPost(post));
        const filteredLocals = Object.assign(Object.create(locals), {
          posts: normalPosts
        });
        return origGen.call(this, filteredLocals);
      });
    }
  });

  // 6. Post generator: keep prev/next navigation separated between normal posts and archived posts
  hexo.extend.generator.register('post', function (locals) {
    const allPosts = locals.posts.sort('-date').toArray();
    const normalPosts = allPosts.filter(p => !isArchivedPost(p));
    const archivedPosts = allPosts.filter(p => isArchivedPost(p));

    const assignPrevNext = list => {
      const len = list.length;
      list.forEach((post, i) => {
        post.prev = i > 0 ? list[i - 1] : null;
        post.next = i < len - 1 ? list[i + 1] : null;
      });
    };

    assignPrevNext(normalPosts);
    assignPrevNext(archivedPosts);

    return allPosts.map(post => {
      const { path, layout } = post;
      if (!layout || layout === 'false') {
        return { path, data: post.content };
      }
      const layouts = ['post', 'page', 'index'];
      if (layout !== 'post') layouts.unshift(layout);
      post.__post = true;
      return {
        path,
        layout: layouts,
        data: post
      };
    });
  });

  // 7. Override `aside_archives` to exclude archived posts from monthly counts
  // and render the bottom-right `Archived` button inside `.card-widget.card-archives`
  hexo.extend.helper.register('aside_archives', function (options = {}) {
    const { config, page, site, url_for: urlFor, _p } = this;
    const { archive_dir: archiveDir, timezone, language } = config;

    const {
      type = 'monthly',
      format = type === 'monthly' ? 'MMMM YYYY' : 'YYYY',
      show_count: showCount = true,
      order = -1,
      limit,
      transform
    } = options;

    const lang = toMomentLocale(page.lang || page.language || language);
    const normalPosts = site.posts.filter(post => !isArchivedPost(post));

    if (! site.posts.length) return '';

    const archives = new Map();
    normalPosts.forEach(post => {
      const date = post.date;
      const year = date.year();
      const month = date.month() + 1;
      const key = type === 'yearly' ? year : `${year}-${month}`;

      if (archives.has(key)) {
        archives.get(key).count++;
      } else {
        archives.set(key, {
          year,
          month,
          count: 1,
          date
        });
      }
    });

    const data = Array.from(archives.values()).sort((a, b) => {
      if (order === -1) {
        return b.year - a.year || b.month - a.month;
      }
      return a.year - b.year || a.month - b.month;
    });

    data.forEach(item => {
      let date = item.date.clone();
      if (timezone) date = date.tz(timezone);
      if (lang) date = date.locale(lang);
      item.name = date.format(format);
      delete item.date;
    });

    const createArchiveLink = item => {
      let url = `${archiveDir}/${item.year}/`;
      if (type === 'monthly') {
        url += item.month < 10 ? `0${item.month}/` : `${item.month}/`;
      }
      return urlFor(url);
    };

    const limitedData = limit > 0 ? data.slice(0, Math.min(data.length, limit)) : data;

    const archiveHeader = `
      <div class="item-headline">
        <i class="fas fa-archive"></i>
        <span>${_p('aside.card_archives')}</span>
        ${
          data.length > limitedData.length
            ? `<a class="card-more-btn" href="${urlFor(archiveDir)}/"
              title="${_p('aside.more_button')}">
              <i class="fas fa-angle-right"></i>
            </a>`
            : ''
        }
      </div>
    `;

    const archiveList = `
      <ul class="card-archive-list">
        ${limitedData
          .map(
            item => `
          <li class="card-archive-list-item">
            <a class="card-archive-list-link" href="${createArchiveLink(item)}">
              <span class="card-archive-list-date">
                ${transform ? transform(item.name) : item.name}
              </span>
              ${showCount ? `<span class="card-archive-list-count">${item.count}</span>` : ''}
            </a>
          </li>
        `
          )
          .join('')}
      </ul>
    `;

    const archiveFooter = `
      <div class="card-archive-footer">
        <a class="card-archive-archived-btn" href="${urlFor('archived/')}" title="Archived">
          <i class="fas fa-box-archive"></i>
          <span>Archived</span>
        </a>
      </div>
    `;

    return archiveHeader + archiveList + archiveFooter;
  });

  // 8. Override `getArchiveLength` so `/archives/` page header count excludes archived posts
  hexo.extend.helper.register('getArchiveLength', function () {
    const archiveGenerator = hexo.config.archive_generator;
    const posts = this.site.posts.filter(post => !isArchivedPost(post));

    const { yearly, monthly, daily } = archiveGenerator || {};
    const { year, month, day } = this.page;

    if (!year) return posts.length;

    const mapData = this.fragment_cache('createArchiveObj', () => {
      const map = new Map();
      posts.forEach(post => {
        const date = post.date;
        const y = date.year();
        const m = date.month() + 1;
        const d = date.date();

        if (yearly) {
          const keyYear = `${y}`;
          map.set(keyYear, (map.get(keyYear) || 0) + 1);
        }
        if (monthly) {
          const keyMonth = `${y}-${m}`;
          map.set(keyMonth, (map.get(keyMonth) || 0) + 1);
        }
        if (daily) {
          const keyDay = `${y}-${m}-${d}`;
          map.set(keyDay, (map.get(keyDay) || 0) + 1);
        }
      });
      return map;
    });

    let key;
    if (yearly && year) key = `${year}`;
    if (monthly && month) key = `${year}-${month}`;
    if (daily && day) key = `${year}-${month}-${day}`;

    return mapData.get(key) || posts.length;
  });
});

// 9. Keep `site.posts.length` as the total post count (including archived posts) for `.card-info`
// and `.card-webinfo`, while filtering archived posts out of `site.posts.sort()` (used by `.card-recent-post`).
hexo.extend.filter.register('template_locals', locals => {
  const site = locals.site;
  if (!site || !site.posts || site.posts._archivedSortPatched) return locals;

  const origSort = site.posts.sort;
  const wrappedPosts = Object.create(site.posts);
  wrappedPosts._archivedSortPatched = true;
  wrappedPosts.sort = function (orderby, order) {
    const normalOnly = origSort.call(this, orderby, order).filter(post => !isArchivedPost(post));
    return normalOnly;
  };

  locals.site = Object.assign(Object.create(site), {
    posts: wrappedPosts
  });

  return locals;
});
