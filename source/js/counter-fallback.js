(() => {
  const CANONICAL_ORIGIN = 'https://rd227.github.io';
  const VERCOUNT_API = 'https://events.vercount.one/api/v2/log';
  const counters = ['site_uv', 'site_pv', 'page_pv'];
  const storagePrefix = 'vercount:rd227.github.io:';

  // Rewrite Vercount payload URL to canonical origin (https://rd227.github.io)
  // so GitLab Pages, Netlify, and GitHub Pages share and accumulate the same historical UV/PV counts.
  if (typeof window.fetch === 'function') {
    const origFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        const urlStr = typeof input === 'string' ? input : (input && input.url);
        if (urlStr === VERCOUNT_API && init && typeof init.body === 'string') {
          const payload = JSON.parse(init.body);
          if (payload && typeof payload.url === 'string') {
            const parsed = new URL(payload.url, location.origin);
            payload.url = CANONICAL_ORIGIN + parsed.pathname + parsed.search + parsed.hash;
            init = { ...init, body: JSON.stringify(payload) };
          }
        }
      } catch (_) {
        // Proceed with original request if parsing fails.
      }
      return origFetch(input, init);
    };
  }

  for (const name of counters) {
    const element = document.getElementById(`busuanzi_value_${name}`);
    if (!element) continue;

    const storageKey = storagePrefix + name + (name === 'page_pv' ? `:${location.pathname}` : '');
    let lastValue = 0;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null && /^\d+$/.test(saved)) {
        const value = Number(saved);
        if (Number.isSafeInteger(value)) {
          lastValue = value;
          element.textContent = String(value);
        }
      }
    } catch (_) {
      // Privacy settings can disable storage; the HTML still contains 0.
    }

    new MutationObserver(() => {
      const displayed = element.textContent.trim().replace(/,/g, '');
      if (!/^\d+$/.test(displayed)) return;

      const value = Number(displayed);
      if (!Number.isSafeInteger(value)) return;
      if (value < lastValue) {
        element.textContent = String(lastValue);
        return;
      }
      if (value === lastValue) return;

      lastValue = value;
      try {
        localStorage.setItem(storageKey, String(value));
      } catch (_) {
        // Keep the live count visible even if storage is unavailable.
      }
    }).observe(element, { childList: true, characterData: true, subtree: true });
  }
})();
