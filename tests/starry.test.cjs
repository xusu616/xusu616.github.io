'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('day mode suppresses stars and their switch even with a saved on preference and a dark system', () => {
  const attributes = { 'data-theme': 'light' };
  const html = { dataset: { darkreaderScheme: 'dark' }, getAttribute: key => attributes[key], setAttribute: (key, value) => { attributes[key] = value; } };
  const context = { clearRect() {}, beginPath() {}, arc() {}, fill() {}, rect() {}, fillRect() {} };
  const button = { setAttribute: (key, value) => { button[key] = value; }, addEventListener: (_, callback) => { button.click = callback; } };
  let themeChanged, systemChanged, preference = 'on', frames = 0, canceled = 0;
  const sandbox = {
    document: {
      documentElement: html, readyState: 'complete',
      getElementById: id => id === 'universe' ? { getContext: () => context } : id === 'rightside-config-hide' ? { insertBefore() {} } : null,
      createElement: () => button
    },
    window: {
      innerWidth: 1200, innerHeight: 800, addEventListener() {},
      matchMedia: () => ({ matches: true, addEventListener: (_, callback) => { systemChanged = callback; } }),
      requestAnimationFrame: () => ++frames,
      cancelAnimationFrame: () => { canceled++; }
    },
    localStorage: { getItem: () => preference, setItem: (_, value) => { preference = value; } },
    MutationObserver: class { constructor(callback) { themeChanged = callback; } observe() {} }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../source/js/starry.js'), 'utf8'), sandbox);
  assert.equal(attributes['data-starry'], 'off');
  assert.equal(button.hidden, true);
  assert.equal(frames, 0);
  systemChanged();
  assert.equal(attributes['data-starry'], 'off');
  attributes['data-theme'] = 'dark';
  themeChanged();
  assert.equal(attributes['data-starry'], 'on');
  assert.equal(button.hidden, false);
  assert.equal(frames, 1);
  attributes['data-theme'] = 'light';
  themeChanged();
  assert.equal(attributes['data-starry'], 'off');
  assert.equal(button.hidden, true);
  assert.equal(canceled, 1);
  assert.equal(preference, 'on');
  attributes['data-theme'] = 'dark';
  themeChanged();
  button.click();
  assert.equal(preference, 'off');
  attributes['data-theme'] = 'light';
  themeChanged();
  attributes['data-theme'] = 'dark';
  themeChanged();
  assert.equal(attributes['data-starry'], 'off');
});
