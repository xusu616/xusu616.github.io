/* SPDX-License-Identifier: MIT — Copyright (c) 2026 XvSu */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PixelGarden = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DAY = 86400000;
  const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];
  const STAGES = ['种子', '萌芽', '展叶', '含苞', '盛放'];
  const PALETTES = {
    spring: { label: '春 · 新生', sky: '#eaf4ef', mist: '#d2e8d9', hill: '#bad4bc', grass: '#8cae79', soil: '#bda385', deep: '#9b8069', stem: '#477759', leaf: '#75a965', light: '#afd183', flower: '#df8fa3', petal: '#f5c3ca', sun: '#f5db9b' },
    summer: { label: '夏 · 繁茂', sky: '#e5f2ee', mist: '#c8e5dd', hill: '#a4cbbb', grass: '#6aab78', soil: '#b69d7e', deep: '#917861', stem: '#2b6952', leaf: '#4f9c68', light: '#8cc577', flower: '#eabc58', petal: '#f7dc86', sun: '#f5d887' },
    autumn: { label: '秋 · 收获', sky: '#faf0df', mist: '#efe1c7', hill: '#d9c9a9', grass: '#b3ae77', soil: '#b99a7b', deep: '#96775f', stem: '#7d7150', leaf: '#bc8c54', light: '#ddb76b', flower: '#c8754b', petal: '#e8ac67', sun: '#efcc83' },
    winter: { label: '冬 · 蓄力', sky: '#ebf0f5', mist: '#d9e3ec', hill: '#bdcdd7', grass: '#d3dfe3', soil: '#a6aba8', deep: '#858f91', stem: '#587774', leaf: '#7b9d94', light: '#adc5b7', flower: '#8499b8', petal: '#c6d4e9', sun: '#f0ddae' }
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
    if (day.future) return `${day.date} 周${day.label}：尚未到来`;
    if (day.count === null) return `${day.date} 周${day.label}：贡献数据暂不可用`;
    return `${day.date} 周${day.label}：${day.count} 次贡献 · ${STAGES[day.stage]}`;
  }

  function renderScene(week) {
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
    return `<svg xmlns="http://www.w3.org/2000/svg" class="pg-scene" viewBox="0 0 224 112" role="img" aria-label="${escape(`${p.label}，周一至周日的贡献花园`)}" shape-rendering="crispEdges"><title>${escape(`${p.label} · Oneweek Garden`)}</title>${art}</svg>`;
  }

  // Original top-down shrubs share the weekly scene's integer pixels and palette.
  function renderMonth(month) {
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
        if (day.stage === 1) {
          shrub = rect(cx, cy - 3, 2, 8, p.stem) + rect(cx - 4, cy - 3, 4, 3, p.leaf) + rect(cx + 2, cy - 5, 4, 3, p.light);
        } else {
          const size = day.stage === 2 ? 5 : day.stage === 3 ? 7 : 9;
          shrub += rect(cx - size + 1, cy + size - 1, size * 2, 3, p.deep, ' opacity=".4"');
          shrub += `<path d="M${cx - size} ${cy - size + 4}h2v-2h3v-2h${size * 2 - 10}v2h3v2h2v${size * 2 - 8}h-2v2h-3v2h-${size * 2 - 10}v-2h-3v-2h-2z" fill="${p.stem}"/>`;
          shrub += rect(cx - size + 2, cy - size + 4, size * 2 - 4, size * 2 - 6, p.leaf);
          shrub += rect(cx - size + 4, cy - size + 2, size * 2 - 8, 3, p.light);
          shrub += rect(cx - 3, cy - 3, 3, 2, p.light) + rect(cx + 2, cy + 2, 3, 2, p.stem);
          if (day.stage === 4) {
            for (const [dx, dy] of [[-4, -3], [3, -5], [4, 3], [-2, 5]]) {
              shrub += rect(cx + dx, cy + dy, 3, 3, p.flower) + rect(cx + dx, cy + dy, 2, 1, p.petal);
            }
          }
          if (month.season === 'winter') shrub += rect(cx - size + 4, cy - size + 2, size * 2 - 8, 2, '#f8fbff') + rect(cx - 4, cy - 2, 5, 2, '#f8fbff');
        }
        shrub = `<g class="pg-shrub" style="transform-origin:${cx}px ${cy}px;--pg-wind-delay:-${index % 7 * .63}s;--pg-wind-duration:${4.8 + index % 3 * .6}s">${shrub}</g>`;
      } else if (!day.future) shrub = `<text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="monospace" font-size="8" fill="${p.stem}">?</text>`;
      art += `<g${day.future ? ' opacity=".45"' : ''}><title>${escape(dayDescription(day))}</title>${tile}${shrub}</g>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" class="pg-scene pg-month-scene" viewBox="0 0 224 ${rows * 32}" role="img" aria-label="${escape(`${month.start.slice(0, 7)} · ${p.label}，俯视灌木贡献花园`)}" shape-rendering="crispEdges">${art}</svg>`;
  }

  function renderBadge(week, username) {
    const date = `${week.start.slice(5).replace('-', '/')} — ${week.end.slice(5).replace('-', '/')}`;
    const total = week.complete ? `本周 ${week.total} 次贡献` : '贡献数据暂不可用';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="208" viewBox="0 0 280 208" role="img" aria-label="${escape(`${username} · ${total}`)}"><rect width="280" height="208" rx="12" fill="#fffaf3"/><g font-family="system-ui, sans-serif" fill="#655a47"><text x="16" y="26" font-size="14" font-weight="600">Oneweek Garden</text><text x="264" y="25" font-size="11" text-anchor="end">${PALETTES[week.season].label}</text><text x="16" y="45" font-size="10">${date}</text></g><svg x="16" y="55" width="248" height="124" viewBox="0 0 224 112">${renderScene(week).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg><text x="16" y="196" font-family="system-ui, sans-serif" font-size="11" fill="#655a47">${escape(total)} · @${escape(username)}</text></svg>`;
  }

  return { PALETTES, STAGES, escape, dateKey, shiftDate, shiftMonth, seasonFor, stageFor, makeWeek, makeMonth, dayDescription, renderScene, renderMonth, renderBadge };
});
