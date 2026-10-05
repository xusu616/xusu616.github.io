(function () {
  'use strict';

  const loader = document.getElementById('pixel-cat-preloader');
  if (!loader) return;

  let finished = false;
  let showTimer;
  let fallbackTimer;

  function show() {
    if (finished) return;
    loader.classList.add('is-visible');
  }

  function finish() {
    if (finished) return;
    finished = true;
    window.clearTimeout(showTimer);
    window.clearTimeout(fallbackTimer);
    loader.remove();
  }

  const preview = new URLSearchParams(window.location.search).get('loader-preview');
  if (preview === 'front' || preview === 'behind') {
    show();
    return;
  }

  // Do not start an overlay after the page content is already ready.
  if (document.readyState !== 'loading') {
    finish();
    return;
  }

  // Start during HTML parsing, skip quick loads, and never delay ready content
  // for images, trackers, or a minimum animation duration.
  showTimer = window.setTimeout(show, 120);
  document.addEventListener('DOMContentLoaded', finish, { once: true });
  window.addEventListener('pageshow', finish, { once: true });
  fallbackTimer = window.setTimeout(finish, 5000);
})();
