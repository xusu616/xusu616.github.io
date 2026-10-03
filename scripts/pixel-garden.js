/* SPDX-License-Identifier: MIT — Copyright (c) 2026 XvSu */
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const garden = require('../source/js/pixel-garden-core');

// Read GitHub's public calendar directly at build time; no token or paid service.
function parseCalendar(html) {
  const tips = new Map();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)) {
    const id = match[1].match(/\bfor="([^"]+)"/);
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    const count = text.match(/^(No|[\d,]+) contributions?\b/i);
    if (id && count) tips.set(id[1], count[1].toLowerCase() === 'no' ? 0 : Number(count[1].replace(/,/g, '')));
  }
  const contributions = [];
  for (const match of html.matchAll(/<td\b[^>]*\bdata-date="\d{4}-\d{2}-\d{2}"[^>]*>/g)) {
    const date = match[0].match(/\bdata-date="([^"]+)"/)[1];
    const id = match[0].match(/\bid="([^"]+)"/);
    if (id && tips.has(id[1])) contributions.push({ date, count: tips.get(id[1]) });
  }
  if (contributions.length < 7) throw new Error('GitHub calendar format is unavailable');
  return contributions.sort((a, b) => a.date.localeCompare(b.date));
}

function validSnapshot(data, username) {
  return data && data.username === username && Number.isFinite(Date.parse(data.updatedAt)) &&
    Array.isArray(data.contributions) && data.contributions.length >= 7 &&
    data.contributions.every(item => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isSafeInteger(item.count) && item.count >= 0);
}

async function generate(hexo) {
  const settings = hexo.config.pixel_garden;
  if (!settings || settings.enable === false) return [];
  const username = String(settings.username || '');
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) throw new Error('pixel_garden.username must be a GitHub username');
  const timezone = settings.timezone || hexo.config.timezone || 'Asia/Shanghai';
  const hemisphere = settings.hemisphere === 'south' ? 'south' : 'north';
  const today = garden.dateKey(new Date(), timezone);
  const cachePath = path.join(hexo.base_dir, '.cache', 'pixel-garden', `${username}.json`);
  let snapshot = { username, updatedAt: null, source: 'github', contributions: [], unavailable: true };
  try {
    const response = await fetch(`https://github.com/users/${encodeURIComponent(username)}/contributions`, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'Hexo-Pixel-Garden' },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    snapshot = { username, updatedAt: new Date().toISOString(), source: 'github', contributions: parseCalendar(await response.text()) };
  } catch (error) {
    hexo.log.warn(`[pixel-garden] ${error.message}; using cache if available`);
    try {
      const cached = JSON.parse(await fs.readFile(cachePath, 'utf8'));
      if (validSnapshot(cached, username)) snapshot = { ...cached, stale: true };
    } catch (_) { /* The widget explicitly labels unavailable data. */ }
  }
  if (!snapshot.unavailable && !snapshot.stale) {
    try {
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(cachePath, JSON.stringify(snapshot));
    } catch (error) { hexo.log.warn(`[pixel-garden] Could not save cache: ${error.message}`); }
  }
  const root = hexo.config.root || '/';
  const config = { enable: true, username, timezone, hemisphere, liveRefresh: settings.live_refresh !== false,
    snapshotUrl: `${root}garden/data.json` };
  return [
    { path: 'garden/config.json', data: JSON.stringify(config) },
    { path: 'garden/data.json', data: JSON.stringify(snapshot) },
    { path: 'garden/week.svg', data: garden.renderBadge(garden.makeWeek(snapshot.contributions, today, hemisphere), username) }
  ];
}

if (typeof hexo !== 'undefined') hexo.extend.generator.register('pixel-garden', () => generate(hexo));
module.exports = { parseCalendar, validSnapshot, generate };
