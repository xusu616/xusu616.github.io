'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { checkImages } = require('../scripts/check-blog-images');

test('image validation rejects nonportable image roots and missing or mis-cased references', t => {
  const source = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-images-'));
  const imageDir = path.join(source, 'img');
  t.after(() => {
    fs.unlinkSync(path.join(imageDir, 'Header.png'));
    fs.rmdirSync(imageDir);
    fs.rmdirSync(source);
  });
  assert.throws(() => checkImages(source, []), /real directory/);
  fs.writeFileSync(imageDir, '/mnt/data/blogImg/img');
  assert.throws(() => checkImages(source, []), /real directory/);
  fs.unlinkSync(imageDir);
  fs.mkdirSync(imageDir);
  fs.writeFileSync(path.join(imageDir, 'Header.png'), 'image');
  assert.doesNotThrow(() => checkImages(source, ['img/Header.png', '![](/img/Header.png)', '<img src="/img/Header.png">', '![](https://example.com/img/external.png)']));
  assert.throws(() => checkImages(source, ['![](/img/missing.png)']), /Missing blog image/);
  assert.throws(() => checkImages(source, ['img/header.png']), /filename case/);
  fs.writeFileSync(path.join(imageDir, 'Header.png'), '');
  assert.throws(() => checkImages(source, ['img/Header.png']), /Invalid blog image/);
});
