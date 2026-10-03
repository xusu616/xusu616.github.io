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
  assert.ok(badge.includes('Contributions unavailable'));
  assert.ok(!badge.includes('0 contributions this week'));
  assert.equal((core.renderScene(week).match(/<g>/g) || []).length, 7);
});

test('history browsing keeps real today separate and does not turn future weeks into zero', () => {
  const counts = Array.from({ length: 7 }, (_, i) => ({ date: core.shiftDate('2026-09-21', i), count: 2 }));
  const past = core.makeWeek(counts, '2026-10-03', 'north', '2026-09-23');
  assert.equal(past.start, '2026-09-21');
  assert.equal(past.total, 14);
  assert.equal(past.complete, true);
  assert.equal(past.days.some(day => day.today), false);
  const future = core.makeWeek(counts, '2026-10-03', 'north', '2026-10-12');
  assert.equal(future.complete, false);
  assert.equal(future.delta, null);
  assert.ok(future.days.every(day => day.future && day.count === null));
});

test('monthly calendar handles leap years, alignment and December rollover', () => {
  const leap = core.makeMonth([], '2026-10-03', 'north', '2024-02-15');
  assert.equal(leap.start, '2024-02-01');
  assert.equal(leap.end, '2024-02-29');
  assert.equal(leap.days.length, 29);
  assert.equal(leap.cells.length, 42);
  assert.equal(leap.cells[0], null);
  assert.equal(leap.cells[3].date, '2024-02-01');
  assert.equal(core.makeMonth([], '2026-10-03', 'north', '2025-02-15').days.length, 28);
  assert.equal(core.shiftMonth('2026-12-31', 1), '2027-01-01');
  assert.equal(core.shiftMonth('2027-01-31', -1), '2026-12-01');
});

test('monthly totals compare matching elapsed days and distinguish unknown from future', () => {
  const counts = [
    { date: '2026-09-01', count: 1 }, { date: '2026-09-02', count: 1 }, { date: '2026-09-03', count: 1 },
    { date: '2026-10-01', count: 5 }, { date: '2026-10-02', count: 2 }, { date: '2026-10-03', count: 10 }
  ];
  const month = core.makeMonth(counts, '2026-10-03');
  assert.equal(month.total, 17);
  assert.equal(month.previous, 3);
  assert.equal(month.delta, 14);
  assert.equal(month.days[3].future, true);
  assert.equal(month.days[3].count, null);
  const missing = core.makeMonth(counts.slice(0, -1), '2026-10-03');
  assert.equal(missing.complete, false);
  assert.equal(missing.days[2].future, false);
  assert.equal(missing.days[2].count, null);
  assert.equal(missing.delta, null);
});

test('a longer month compares only dates which exist in the preceding month', () => {
  const counts = [
    ...Array.from({ length: 28 }, (_, i) => ({ date: core.shiftDate('2026-02-01', i), count: 1 })),
    ...Array.from({ length: 31 }, (_, i) => ({ date: core.shiftDate('2026-03-01', i), count: i === 30 ? 100 : 2 }))
  ];
  const month = core.makeMonth(counts, '2026-10-03', 'north', '2026-03-15');
  assert.equal(month.total, 160);
  assert.equal(month.previous, 28);
  assert.equal(month.delta, 28);
});

test('wind applies only to living plants and monthly SVG retains all calendar cells', () => {
  const counts = [{ date: '2026-09-28', count: 0 }, { date: '2026-09-29', count: 1 }];
  const scene = core.renderScene(core.makeWeek(counts, '2026-10-03'));
  assert.equal((scene.match(/class="pg-plant"/g) || []).length, 1);
  assert.ok(scene.includes('transform-origin:48px 89px'));
  const month = core.makeMonth(counts, '2026-10-03', 'north', '2026-09-01');
  const svg = core.renderMonth(month);
  assert.equal((svg.match(/<title>/g) || []).length, 30);
  assert.equal((svg.match(/class="pg-shrub"/g) || []).length, 1);
  assert.ok(svg.includes('viewBox="0 0 224 192"'));
});

test('weather follows the viewed season in both views, including hemisphere inversion', () => {
  for (const [date, kind] of [['2026-04-01', 'rain'], ['2026-07-01', null], ['2026-10-01', 'leaves'], ['2026-01-01', 'snow']]) {
    const week = core.makeWeek([], '2026-10-03', 'north', date);
    const month = core.makeMonth([], '2026-10-03', 'north', date);
    for (const [svg, distance] of [[core.renderScene(week), 124], [core.renderMonth(month), 204]]) {
      if (!kind) {
        assert.ok(!svg.includes('class="pg-weather"'));
        continue;
      }
      assert.ok(svg.includes(`data-weather="${kind}" aria-hidden="true" pointer-events="none"`));
      assert.ok(svg.includes(`--pg-fall-distance:${distance}px`));
      const particles = svg.match(/class="pg-weather-particle /g) || [];
      assert.ok(particles.length > 0 && particles.length <= 12);
    }
  }
  const south = core.makeMonth([], '2026-10-03', 'south');
  assert.ok(core.renderMonth(south).includes('data-weather="rain"'));
});

test('cherry canopies reflect growth without turning missing or future days into shrubs', () => {
  const counts = [0, 1, 3, 6, 10].map((count, i) => ({ date: core.shiftDate('2026-04-01', i), count }));
  const spring = core.renderMonth(core.makeMonth(counts, '2026-04-07'));
  assert.equal((spring.match(/class="pg-shrub"/g) || []).length, 4);
  assert.equal((spring.match(/class="pg-sakura-canopy"/g) || []).length, 3);
  assert.ok(!spring.includes('class="pg-shrub-canopy"'));
  assert.ok(spring.includes('2026-04-06 Mon: Contributions unavailable'));
  assert.ok(spring.includes('2026-04-08 Wed: Not yet'));
  assert.ok(spring.includes('2026-04-05 Sun: 10 contributions · Bloom'));
  const summer = core.renderMonth(core.makeMonth(counts.map(day => ({ ...day, date: day.date.replace('-04-', '-07-') })), '2026-07-07'));
  assert.equal((summer.match(/class="pg-shrub-canopy"/g) || []).length, 3);
  assert.ok(!summer.includes('pg-sakura-canopy'));
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
  assert.ok(route('garden/week.svg').data.includes('Contributions unavailable'));
  assert.equal(warnings.length, 2);
  hexo.config.pixel_garden.enable = false;
  assert.deepEqual(await generate(hexo), []);
});
