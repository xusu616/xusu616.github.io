/* SPDX-License-Identifier: MIT — Copyright (c) 2026 XvSu */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const core = require('../source/js/pixel-garden-core');
const { parseCalendar, generate } = require('../scripts/pixel-garden');

function calendar() {
  return Array.from({ length: 7 }, (_, index) => `<td id="day-${index}" data-level="2" data-date="2026-09-${21 + index}"></td><tool-tip for="day-${index}">${index === 0 ? 'No' : index === 6 ? '1,234' : index} contributions on September.</tool-tip>`).join('');
}

test('Shanghai date crosses midnight independently of the visitor timezone', () => {
  assert.equal(core.dateKey(new Date('2026-10-03T15:59:59Z'), 'Asia/Shanghai'), '2026-10-03');
  assert.equal(core.dateKey(new Date('2026-10-03T16:00:00Z'), 'Asia/Shanghai'), '2026-10-04');
  assert.equal(core.dateKey(new Date('2026-10-03T16:00:00Z'), 'America/Los_Angeles'), '2026-10-03');
});

test('Monday and Sunday boundaries also work across New Year', () => {
  const sunday = core.makeWeek([], '2026-10-04');
  assert.equal(sunday.start, '2026-09-28');
  assert.equal(sunday.end, '2026-10-04');
  assert.equal(sunday.days.filter(day => day.future).length, 0);
  const monday = core.makeWeek([], '2026-10-05');
  assert.equal(monday.start, '2026-10-05');
  assert.equal(monday.days.filter(day => day.future).length, 6);
  const newYear = core.makeWeek([], '2027-01-01');
  assert.equal(newYear.start, '2026-12-28');
  assert.equal(newYear.end, '2027-01-03');
});

test('all four seasons and southern hemisphere inversion', () => {
  for (const [month, north, south] of [['01', 'winter', 'summer'], ['03', 'spring', 'autumn'], ['06', 'summer', 'winter'], ['09', 'autumn', 'spring'], ['12', 'winter', 'summer']]) {
    assert.equal(core.seasonFor(`2026-${month}-01`, 'north'), north);
    assert.equal(core.seasonFor(`2026-${month}-01`, 'south'), south);
  }
});

test('missing, future, zero and growing days remain distinct', () => {
  const week = core.makeWeek([
    { date: '2026-09-28', count: 0 }, { date: '2026-09-29', count: 2 },
    { date: '2026-09-30', count: -1 }, { date: '2026-10-04', count: 99 }
  ], '2026-10-03');
  assert.equal(week.days[0].stage, 0);
  assert.equal(week.days[1].stage, 1);
  assert.equal(week.days[2].count, null);
  assert.equal(week.days[6].future, true);
  assert.equal(week.days[6].count, null);
  assert.equal(week.complete, false);
  assert.equal(week.delta, null);
  assert.deepEqual([0, 1, 2, 3, 5, 6, 9, 10, 100].map(core.stageFor), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
});

test('trend compares equal elapsed days, excluding the previous Sunday', () => {
  const counts = Array.from({ length: 14 }, (_, index) => ({ date: core.shiftDate('2026-09-21', index), count: index === 6 ? 100 : index < 7 ? 2 : 3 }));
  const week = core.makeWeek(counts, '2026-10-03');
  assert.equal(week.total, 18);
  assert.equal(week.previous, 12);
  assert.equal(week.delta, 6);
  assert.equal(week.complete, true);
});

test('GitHub tooltips are joined by cell ID, with zero and comma counts parsed', () => {
  const parsed = parseCalendar(calendar());
  assert.equal(parsed.length, 7);
  assert.deepEqual(parsed[0], { date: '2026-09-21', count: 0 });
  assert.deepEqual(parsed[6], { date: '2026-09-27', count: 1234 });
  assert.throws(() => parseCalendar('<html>Loading…</html>'), /format is unavailable/);
});

test('SVG escapes user labels and does not report missing contributions as zero', () => {
  const week = core.makeWeek([], '2026-10-03');
  const badge = core.renderBadge(week, '<script>');
  assert.ok(badge.includes('&lt;script&gt;'));
  assert.ok(!badge.includes('<script>'));
  assert.ok(badge.includes('贡献数据暂不可用'));
  assert.ok(!badge.includes('本周 0 次贡献'));
  assert.equal((core.renderScene(week).match(/<g>/g) || []).length, 7);
});

test('generator writes a real snapshot, reuses cache on failure, and handles no cache', async t => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'pixel-garden-test-'));
  const originalFetch = global.fetch;
  const warnings = [];
  const hexo = { base_dir: base, config: { root: '/blog/', pixel_garden: { username: 'rD227', live_refresh: false } }, log: { warn: message => warnings.push(message) } };
  const cacheDir = path.join(base, '.cache', 'pixel-garden');
  const cache = path.join(cacheDir, 'rD227.json');
  t.after(async () => {
    global.fetch = originalFetch;
    await fs.unlink(cache).catch(() => {});
    await fs.rmdir(cacheDir).catch(() => {});
    await fs.rmdir(path.join(base, '.cache')).catch(() => {});
    await fs.rmdir(base);
  });
  global.fetch = async () => ({ ok: true, text: async () => calendar() });
  let routes = await generate(hexo);
  const route = name => routes.find(item => item.path === name);
  assert.equal(JSON.parse(route('garden/config.json').data).snapshotUrl, '/blog/garden/data.json');
  assert.equal(JSON.parse(route('garden/config.json').data).liveRefresh, false);
  assert.equal(JSON.parse(route('garden/data.json').data).contributions.length, 7);
  global.fetch = async () => { throw new Error('offline'); };
  routes = await generate(hexo);
  assert.equal(JSON.parse(route('garden/data.json').data).stale, true);
  await fs.unlink(cache);
  routes = await generate(hexo);
  assert.equal(JSON.parse(route('garden/data.json').data).unavailable, true);
  assert.ok(route('garden/week.svg').data.includes('贡献数据暂不可用'));
  assert.equal(warnings.length, 2);
  hexo.config.pixel_garden.enable = false;
  assert.deepEqual(await generate(hexo), []);
});
