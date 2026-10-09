'use strict';

const fs = require('node:fs');
const path = require('node:path');

function checkImages(sourceDir, contents) {
  const imageDir = path.join(sourceDir, 'img');
  const stat = fs.lstatSync(imageDir, { throwIfNoEntry: false });
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error('source/img must be a real directory with images committed to Git. A local disk symlink cannot be deployed.');
  }
  for (const content of contents) {
    for (const match of String(content || '').matchAll(/(?:^|[\s("'=])\/?img\/([^\s"'<>?#)]+)/g)) {
      const filename = decodeURIComponent(match[1]);
      // readdir also catches case mismatches which Windows would otherwise hide.
      const parts = filename.split('/');
      let parent = imageDir;
      for (const part of parts) {
        if (part === '..' || !fs.readdirSync(parent).includes(part)) {
          throw new Error(`Missing blog image: /img/${filename} (check filename case and commit the image to Git).`);
        }
        parent = path.join(parent, part);
      }
      if (!fs.statSync(parent).isFile() || fs.statSync(parent).size === 0) {
        throw new Error(`Invalid blog image: /img/${filename}`);
      }
    }
  }
}

if (typeof hexo !== 'undefined') {
  hexo.extend.filter.register('before_generate', () => {
    const theme = hexo.theme.config;
    checkImages(hexo.source_dir, [
      theme.default_top_img, theme.index_img, ...Object.values(theme.error_img || {}),
      ...hexo.locals.get('posts').toArray().map(post => post.raw)
    ]);
  });
}

module.exports = { checkImages };
