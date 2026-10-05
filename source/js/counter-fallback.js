(() => {
  const counters = ['site_uv', 'site_pv', 'page_pv'];
  const storagePrefix = `vercount:${location.host}:`;

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
