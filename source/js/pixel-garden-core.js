/* SPDX-License-Identifier: MIT — Copyright (c) 2026 XvSu */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PixelGarden = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAY = 86400000;
  const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const STAGES = ['Seed', 'Sprout', 'Leaves', 'Bud', 'Bloom'];
  const VIEW_TITLES = { week: 'Weekly Garden', month: 'Monthly Garden' };
  const PALETTES = {
    spring: { label: 'Spring · Bloom', sky: '#eaf4ef', mist: '#d2e8d9', hill: '#bad4bc', grass: '#8cae79', soil: '#bda385', deep: '#9b8069', stem: '#477759', leaf: '#75a965', light: '#afd183', flower: '#df8fa3', petal: '#f5c3ca', sun: '#f5db9b' },
    summer: { label: 'Summer · Thrive', sky: '#e5f2ee', mist: '#c8e5dd', hill: '#a4cbbb', grass: '#6aab78', soil: '#b69d7e', deep: '#917861', stem: '#2b6952', leaf: '#4f9c68', light: '#8cc577', flower: '#eabc58', petal: '#f7dc86', sun: '#f5d887' },
    autumn: { label: 'Autumn · Harvest', sky: '#faf0df', mist: '#efe1c7', hill: '#d9c9a9', grass: '#b3ae77', soil: '#b99a7b', deep: '#96775f', stem: '#7d7150', leaf: '#bc8c54', light: '#ddb76b', flower: '#c8754b', petal: '#e8ac67', sun: '#efcc83' },
    winter: { label: 'Winter · Rest', sky: '#ebf0f5', mist: '#d9e3ec', hill: '#bdcdd7', grass: '#d3dfe3', soil: '#a6aba8', deep: '#858f91', stem: '#587774', leaf: '#7b9d94', light: '#adc5b7', flower: '#8499b8', petal: '#c6d4e9', sun: '#f0ddae' }
  };

  function escape(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  function dateKey(now, timezone) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now || new Date());
    const pick = type => parts.find(part => part.type === type).value;
    return `${pick('year')}-${pick('month')}-${pick('day')}`;
  }

  function shiftDate(date, days) {
    return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
  }

  function seasonFor(date, hemisphere) {
    const month = Number(date.slice(5, 7));
    let index = Math.floor((month % 12) / 3);
    if (hemisphere === 'south') index = (index + 2) % 4;
    return ['winter', 'spring', 'summer', 'autumn'][index];
  }

  function stageFor(count) {
    if (count === null) return null;
    return count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
  }

  // Missing dates stay unknown. Future dates are never treated as zero contributions.
  function countMap(contributions) {
    const counts = new Map();
    for (const item of contributions || []) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isSafeInteger(item.count) && item.count >= 0) {
        counts.set(item.date, item.count);
      }
    }
    return counts;
  }

  function makeDay(date, today, counts) {
    const future = date > today;
    const count = !future && counts.has(date) ? counts.get(date) : null;
    const label = WEEKDAYS[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
    return { date, label, count, future, today: date === today, stage: stageFor(count) };
  }

  // The viewed date and actual today are independent when browsing history.
  function makeWeek(contributions, today, hemisphere, anchor) {
    const viewed = anchor || today;
    const day = new Date(`${viewed}T00:00:00Z`).getUTCDay();
    const start = shiftDate(viewed, -((day + 6) % 7));
    const counts = countMap(contributions);
    const days = WEEKDAYS.map((label, index) => {
      const date = shiftDate(start, index);
      return makeDay(date, today, counts);
    });
    const elapsed = days.filter(item => !item.future);
    const complete = elapsed.length > 0 && elapsed.every(item => item.count !== null);
    const total = elapsed.reduce((sum, item) => sum + (item.count || 0), 0);
    const previousDates = elapsed.map(item => shiftDate(item.date, -7));
    const previousComplete = previousDates.length > 0 && previousDates.every(date => counts.has(date));
    const previous = previousComplete ? previousDates.reduce((sum, date) => sum + counts.get(date), 0) : null;
    return { start, end: shiftDate(start, 6), today, days, complete, total, previous,
      delta: complete && previous !== null ? total - previous : null,
      season: seasonFor(viewed, hemisphere) };
  }

  function shiftMonth(date, offset) {
    const [year, month] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 10);
  }

  function makeMonth(contributions, today, hemisphere, anchor) {
    const start = shiftMonth(anchor || today, 0);
    const end = shiftDate(shiftMonth(start, 1), -1);
    const counts = countMap(contributions);
    const days = Array.from({ length: Number(end.slice(8)) }, (_, index) => makeDay(shiftDate(start, index), today, counts));
    const leading = (new Date(`${start}T00:00:00Z`).getUTCDay() + 6) % 7;
    const cells = Array.from({ length: 42 }, (_, index) => days[index - leading] || null);
    const elapsed = days.filter(day => !day.future);
    const complete = elapsed.length > 0 && elapsed.every(day => day.count !== null);
    const total = elapsed.reduce((sum, day) => sum + (day.count || 0), 0);
    const previousStart = shiftMonth(start, -1);
    const previousEnd = shiftDate(start, -1);
    const previousDays = Math.min(elapsed.length, Number(previousEnd.slice(8)));
    const previousDates = Array.from({ length: previousDays }, (_, index) => shiftDate(previousStart, index));
    const comparableDays = elapsed.slice(0, previousDays);
    const previousComplete = previousDays > 0 && previousDates.every(date => counts.has(date));
    const previous = previousComplete ? previousDates.reduce((sum, date) => sum + counts.get(date), 0) : null;
    const comparedTotal = comparableDays.reduce((sum, day) => sum + (day.count || 0), 0);
    return { start, end, today, days, cells, total, complete, previous,
      delta: complete && previous !== null ? comparedTotal - previous : null,
      season: seasonFor(start, hemisphere) };
  }

  function dayDescription(day) {
    if (day.future) return `${day.date} ${day.label}: Not yet`;
    if (day.count === null) return `${day.date} ${day.label}: Contributions unavailable`;
    return `${day.date} ${day.label}: ${day.count} ${day.count === 1 ? 'contribution' : 'contributions'} · ${STAGES[day.stage]}`;
  }

  // Decorative seasonal atmosphere, independent of live weather or location.
  function renderWeather(season, width, height) {
    const types = {
      spring: { kind: 'rain', count: 12, color: '#769fa6', duration: 2.6 },
      autumn: { kind: 'leaves', count: 7, color: '#96775f', duration: 7 },
      winter: { kind: 'snow', count: 11, color: '#ffffff', duration: 6 }
    };
    const weather = types[season];
    if (!weather) return '';
    let particles = '';
    for (let index = 0; index < weather.count; index++) {
      const x = 5 + (index * 37 + index % 3 * 11) % (width - 10);
      const duration = weather.duration + index % 4 * .45;
      const drift = weather.kind === 'rain' ? -8 : 8 + index % 4 * 5;
      const size = weather.kind === 'rain' ? 1 : 1 + index % 2;
      const particleHeight = weather.kind === 'rain' ? 4 : size;
      const delay = -((index + 1) * 1.31 % duration).toFixed(2);
      const pixel = `<rect width="${size}" height="${particleHeight}" fill="${weather.color}"/>`;
      const shape = weather.kind === 'leaves' ? `<g class="pg-leaf-flutter" style="--pg-flutter-width:${5 + index % 3 * 2}px;--pg-flutter-duration:${2.8 + index % 4 * .4}s">${pixel}</g>` : pixel;
      particles += `<g transform="translate(${x} -6)"><g class="pg-weather-particle pg-weather-${weather.kind}" style="--pg-fall-distance:${height + 12}px;--pg-fall-drift:${drift}px;--pg-fall-duration:${duration}s;--pg-fall-delay:${delay}s;opacity:0">${shape}</g></g>`;
    }
    return `<g class="pg-weather" data-weather="${weather.kind}" aria-hidden="true" pointer-events="none">${particles}</g>`;
  }

  function spriteFrame(sheet, stage) {
    if (!sheet || !sheet.url || !(sheet.width > 0 && sheet.height > 0)) return null;
    if (sheet.frames && sheet.frames[stage - 1]) return sheet.frames[stage - 1];
    const w = sheet.width / 2, h = sheet.height / 2, slot = stage - 1;
    return { x: slot % 2 * w, y: Math.floor(slot / 2) * h, width: w, height: h };
  }
  function renderSprite(sheet, frame, x, y, width, height) {
    return `<svg class="pg-sprite" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${frame.x} ${frame.y} ${frame.width} ${frame.height}" overflow="hidden" aria-hidden="true"><image href="${escape(sheet.url)}" width="${sheet.width}" height="${sheet.height}" image-rendering="pixelated"/></svg>`;
  }
  function renderScene(week, sheet) {
    const p = PALETTES[week.season];
    const winter = week.season === 'winter';
    const rect = (x, y, w, h, fill, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra || ''}/>`;
    let art = rect(0, 0, 224, 112, p.sky);
    // Stepped hills, a small sun and pixel clouds use integer coordinates throughout.
    art += rect(177, 14, 12, 12, p.sun) + rect(173, 18, 20, 4, p.sun);
    art += `<path d="M0 60h16v-6h16v-6h24v-6h24v6h24v6h16v6h32v-6h24v-8h24v8h24v58H0z" fill="${p.mist}"/>`;
    art += `<path d="M0 78h24v-6h24v-6h32v6h32v6h32v-6h32v-4h24v4h24v40H0z" fill="${p.hill}"/>`;
    art += rect(25, 20, 24, 4, '#ffffff', ' opacity=".65"') + rect(31, 16, 12, 4, '#ffffff', ' opacity=".65"');
    art += rect(113, 30, 18, 3, '#ffffff', ' opacity=".55"') + rect(119, 27, 6, 3, '#ffffff', ' opacity=".55"');
    art += rect(0, 89, 224, 5, p.grass) + rect(0, 94, 224, 18, p.soil) + rect(0, 108, 224, 4, p.deep);
    for (let x = 3; x < 224; x += 13) {
      art += rect(x, 98 + (x % 3), 3, 2, p.deep, ' opacity=".45"');
      if (!winter) art += rect(x + 3, 85 + (x % 2), 2, 5, p.grass);
    }
    if (winter) {
      art += rect(0, 88, 224, 4, '#f8fbff');
      for (const [x, y] of [[14, 36], [63, 29], [98, 47], [146, 18], [205, 43]]) {
        art += rect(x, y, 2, 2, '#ffffff');
      }
    }
    week.days.forEach((day, index) => {
      const x = 16 + index * 32;
      const soil = rect(x - 9, 92, 18, 3, p.deep, ' opacity=".35"');
      let plant = '';
      if (day.future || day.count === null) {
        plant += rect(x - 4, 88, 8, 2, p.deep, ' opacity=".4"');
        if (!day.future) plant += `<text x="${x}" y="82" text-anchor="middle" fill="${p.stem}" font-size="9" font-family="monospace">?</text>`;
      } else if (day.stage === 0) {
        plant += rect(x - 2, 86, 4, 3, p.deep) + rect(x - 1, 85, 2, 1, p.light);
      } else if (spriteFrame(sheet, day.stage)) {
        const frame = spriteFrame(sheet, day.stage);
        const height = Math.min([0, 12, 23, 34, 43][day.stage], [0, 9, 15, 22, 27][day.stage] * frame.height / frame.width);
        const width = height * frame.width / frame.height;
        plant = renderSprite(sheet, frame, x - width / 2, 89 - height, width, height);
      } else {
        const heights = [0, 12, 23, 34, 43];
        const top = 89 - heights[day.stage];
        plant += rect(x - 1, top, 2, 89 - top, p.stem);
        const leaf = (y, right) => {
          const lx = right ? x + 1 : x - 9;
          return rect(lx, y, 8, 4, p.leaf) + rect(lx + (right ? 0 : 2), y - 2, 6, 2, p.light) + rect(lx + (right ? 0 : 4), y + 4, 4, 2, p.leaf);
        };
        plant += leaf(81, false) + leaf(day.stage === 1 ? 78 : 73, true);
        if (day.stage >= 2) plant += leaf(top + 4, false);
        if (day.stage >= 3) plant += leaf(top + 12, true);
        if (day.stage === 3) {
          plant += rect(x - 3, top - 3, 6, 6, p.flower) + rect(x - 1, top - 5, 2, 2, p.light);
        }
        if (day.stage === 4) {
          plant += rect(x - 3, top - 7, 6, 14, p.flower) + rect(x - 7, top - 3, 14, 6, p.flower);
          plant += rect(x - 5, top - 5, 4, 4, p.petal) + rect(x + 1, top + 1, 4, 4, p.petal);
          plant += rect(x - 2, top - 2, 4, 4, p.sun);
          if (week.season === 'autumn') plant += rect(x + 7, 76, 4, 4, p.flower) + rect(x + 8, 74, 2, 2, p.stem);
        }
        if (winter) plant += rect(x - 8, 79, 6, 2, '#f8fbff');
      }
      if (day.count > 0 && !day.future) plant = `<g class="pg-plant" style="transform-origin:${x}px 89px;--pg-wind-delay:-${index * .63}s;--pg-wind-duration:${4.2 + index % 3 * .6}s">${plant}</g>`;
      const marker = day.today ? rect(x - 3, 104, 6, 2, p.light) : '';
      art += `<g><title>${escape(dayDescription(day))}</title>${soil}${plant}${marker}</g>`;
    });
    if (week.season === 'autumn') art += rect(52, 43, 3, 2, p.flower) + rect(158, 54, 2, 3, p.light);
    art += renderWeather(week.season, 224, 112);
    return `<svg xmlns="http://www.w3.org/2000/svg" class="pg-scene" viewBox="0 0 224 112" role="img" aria-label="${escape(`${p.label}, Monday to Sunday contribution garden`)}" shape-rendering="crispEdges"><title>${escape(`${p.label} · ${VIEW_TITLES.week}`)}</title>${art}</svg>`;
  }

  // Original clustered pixel art, generated once per season, stage and silhouette.
  // Subpixel-sized source pixels add detail without enlarging the monthly tiles.
  const SHRUB_SCALE = 1.25;
  const SHRUB_PIXEL = .6;
  const SHRUB_SIZES = { 2: [14, 12], 3: [20, 18], 4: [24, 22] };
  const SHRUB_COLORS = {
    spring: { d: '#774754', s: '#b96886', m: '#dd8eaa', l: '#f1b3c9', h: '#ffe0e8', v: '#507653', f: '#fff0e9', c: '#d9b77e' },
    summer: { d: '#2f513b', s: '#3f7047', m: '#638e4e', l: '#8bb85f', h: '#bad987', v: '#477047', f: '#edd17e', c: '#fff0ba' },
    autumn: { d: '#624b35', s: '#905b39', m: '#b47b43', l: '#d19a57', h: '#e8bd7b', v: '#6b774a', f: '#c96e3d', c: '#efad66' },
    winter: { d: '#334f50', s: '#4f7270', m: '#72958a', l: '#aac3b7', h: '#e9f4f6', v: '#56796b', f: '#f8fcff', c: '#ffffff' }
  };
  const shrubArt = new Map();
  function makeShrubArt(stage, season, variant) {
    const key = `${season}:${stage}:${variant}`;
    if (shrubArt.has(key)) return shrubArt.get(key);
    const [width, height] = SHRUB_SIZES[stage];
    // Overlapping leaf tufts form seven irregular lobes with visible pockets between them.
    const lobes = [
      [-.16, -.28, .23, .21], [.16, -.22, .23, .23],
      [-.31, -.01, .19, .25], [0, .02, .25, .25], [.30, .05, .20, .24],
      [-.17, .27, .23, .20], [.17, .26, .22, .21]
    ].map(([x, y, rx, ry], i) => ({
      x: width * (.5 + x) + (variant === 1 && i % 3 === 0 ? 1 : variant === 2 && i % 2 === 0 ? -1 : 0),
      y: height * (.5 + y), rx: width * rx, ry: height * ry
    }));
    const coverage = (x, y) => {
      let best = { score: -1, dx: 0, dy: 0 };
      for (const lobe of lobes) {
        const dx = (x + .5 - lobe.x) / lobe.rx, dy = (y + .5 - lobe.y) / lobe.ry;
        const score = 1 - (season === 'winter' && stage >= 3 ? Math.abs(dx) * .85 + Math.abs(dy) : dx * dx + dy * dy);
        if (score > best.score) best = { score, dx, dy };
      }
      return best;
    };
    const pixels = Array.from({ length: height }, () => Array(width).fill('.'));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const { score, dx, dy } = coverage(x, y);
      if (score < 0) continue;
      const noise = ((x * 37 + y * 61 + x * y * 7 + variant * 19) % 101) / 100;
      const light = .48 + score * .23 - dy * .18 - dx * .12 + (noise - .5) * .24;
      const edge = [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([ox, oy]) => coverage(x + ox, y + oy).score < 0);
      let color = edge ? (dy > .1 || dx > .6 ? 'd' : 's') : light < .38 ? 's' : light < .62 ? 'm' : light < .82 ? 'l' : 'h';
      // Snow rests on the upper faces of boughs, leaving evergreen shadows exposed.
      if (season === 'winter' && !edge && dy < -.15 && score > .15 && noise > .24) color = noise > .75 ? 'f' : 'h';
      if (season === 'spring' && y > height * .68 && edge && noise > .62) color = 'v';
      pixels[y][x] = color;
    }
    const stamp = (px, py, pattern) => pattern.forEach((row, y) => [...row].forEach((color, x) => {
      const xx = px + x, yy = py + y;
      if (color !== '.' && pixels[yy]?.[xx] && pixels[yy][xx] !== '.') pixels[yy][xx] = color;
    }));
    if (season === 'spring' && stage >= 3) {
      const flowers = stage === 4 ? [[.30,.29],[.62,.24],[.49,.48],[.23,.63],[.70,.66]] : [[.32,.29],[.64,.48],[.38,.66]];
      flowers.forEach(([x, y], i) => stamp(Math.round(x * width) - 1, Math.round(y * height) - 1, i % 2 ? ['.l.', 'fcf', '.f.'] : ['.f.', 'fcf', '.l.']));
    } else if (stage === 4 && season !== 'winter') {
      [[.3,.4],[.68,.58]].forEach(([x, y]) => stamp(Math.round(x * width), Math.round(y * height), season === 'autumn' ? ['cf', 'ff'] : ['.f.', 'fcf', '.f.']));
    }
    const paths = {};
    pixels.forEach((row, y) => {
      for (let x = 0; x < width;) {
        const color = row[x];
        let end = x + 1;
        while (end < width && row[end] === color) end++;
        if (color !== '.') paths[color] = (paths[color] || '') + `M${x} ${y}h${end - x}v1h-${end - x}z`;
        x = end;
      }
    });
    const art = Object.entries(paths).map(([color, d]) => `<path fill="${SHRUB_COLORS[season][color]}" d="${d}"/>`).join('');
    shrubArt.set(key, art);
    return art;
  }
  function renderShrub(stage, season, cx, cy, variant) {
    const [width, height] = SHRUB_SIZES[stage];
    const art = makeShrubArt(stage, season, variant);
    return `<g class="${season === 'spring' ? 'pg-sakura-canopy' : 'pg-shrub-canopy'}" transform="translate(${cx} ${cy}) scale(${SHRUB_PIXEL * SHRUB_SCALE}) translate(${-width / 2} ${-height / 2})">${art}</g>`;
  }

  // Transparent top-down sprites share the weekly palette; native SVG is the fallback.
  function renderMonth(month, sheet) {
    const p = PALETTES[month.season];
    const rows = month.cells.length / 7;
    const rect = (x, y, w, h, fill, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra || ''}/>`;
    let art = rect(0, 0, 224, rows * 32, p.sky);
    month.cells.forEach((day, index) => {
      if (!day) return;
      const x = index % 7 * 32, y = Math.floor(index / 7) * 32;
      let tile = rect(x + 1, y + 1, 30, 30, month.season === 'winter' ? p.mist : p.soil);
      tile += `<path d="M${x + 2} ${y + 8}h4v-2h3 M${x + 22} ${y + 27}h3v-2h4" stroke="${p.deep}" opacity=".35" fill="none"/>`;
      tile += rect(x + 26, y + 4, 2, 1, p.deep, ' opacity=".4"') + rect(x + 4, y + 23, 2, 1, p.light, ' opacity=".45"');
      if (day.today) tile += `<rect x="${x + 1}" y="${y + 1}" width="30" height="30" rx="2" fill="none" stroke="${p.stem}"/>`;
      const cx = x + 16, cy = y + 14;
      let shrub = '';
      if (day.count === 0) shrub = rect(cx - 1, cy, 3, 2, p.deep) + rect(cx, cy - 1, 1, 1, p.light);
      else if (day.count > 0) {
        if (spriteFrame(sheet, day.stage)) {
          const size = (sheet.frames ? [0, 8, 13, 19, 24][day.stage] : 24) * SHRUB_SCALE / 1.25;
          shrub = `<g class="${month.season === 'spring' ? 'pg-sakura-canopy' : 'pg-shrub-canopy'}">${renderSprite(sheet, spriteFrame(sheet, day.stage), cx - size / 2, cy - size / 2, size, size)}</g>`;
        } else if (day.stage === 1) {
          shrub = rect(cx, cy - 2, 1, 6, p.stem) + rect(cx - 3, cy - 2, 3, 2, p.leaf) + rect(cx + 1, cy - 4, 3, 2, p.light);
        } else {
          const [width, height] = SHRUB_SIZES[day.stage];
          const size = Math.round(width * SHRUB_PIXEL * SHRUB_SCALE);
          const bottom = Math.round(height * SHRUB_PIXEL * SHRUB_SCALE / 2);
          tile += rect(cx - Math.floor(size / 2) + 1, cy + bottom - 1, size - 2, 2, p.deep, ' opacity=".25"');
          shrub = renderShrub(day.stage, month.season, cx, cy, Number(day.date.slice(-2)) % 3);
        }
        shrub = `<g class="pg-shrub" style="transform-origin:${cx}px ${cy}px;--pg-wind-delay:-${index % 7 * .63}s;--pg-wind-duration:${4.8 + index % 3 * .6}s">${shrub}</g>`;
      } else if (!day.future) shrub = `<text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="monospace" font-size="8" fill="${p.stem}">?</text>`;
      art += `<g${day.future ? ' opacity=".45"' : ''}><title>${escape(dayDescription(day))}</title>${tile}${shrub}</g>`;
    });
    art += renderWeather(month.season, 224, rows * 32);
    return `<svg xmlns="http://www.w3.org/2000/svg" class="pg-scene pg-month-scene" viewBox="0 0 224 ${rows * 32}" role="img" aria-label="${escape(`${month.start.slice(0, 7)} · ${p.label}, top-down shrub contribution garden`)}" shape-rendering="crispEdges">${art}</svg>`;
  }

  function renderBadge(week, username) {
    const date = `${week.start.slice(5).replace('-', '/')} — ${week.end.slice(5).replace('-', '/')}`;
    const total = week.complete ? `${week.total} contributions this week` : 'Contributions unavailable';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="208" viewBox="0 0 280 208" role="img" aria-label="${escape(`${username} · ${total}`)}"><rect width="280" height="208" rx="12" fill="#fffaf3"/><g font-family="system-ui, sans-serif" fill="#655a47"><text x="16" y="26" font-size="14" font-weight="600">${VIEW_TITLES.week}</text><text x="264" y="25" font-size="11" text-anchor="end">${PALETTES[week.season].label}</text><text x="16" y="45" font-size="10">${date}</text></g><svg x="16" y="55" width="248" height="124" viewBox="0 0 224 112">${renderScene(week).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><text x="16" y="196" font-family="system-ui, sans-serif" font-size="11" fill="#655a47">${escape(total)} · @${escape(username)}</text></svg>`;
  }

  return { PALETTES, STAGES, VIEW_TITLES, WEEKDAYS, escape, dateKey, shiftDate, shiftMonth, seasonFor, stageFor, makeWeek, makeMonth, dayDescription, renderScene, renderMonth, renderWeather, renderBadge };
});
