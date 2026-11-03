// Part of the Carbon Language project, under the Apache License v2.0 with LLVM
// Exceptions. See /LICENSE for license information.
// SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception

// Fills in live repository stats from the public GitHub REST API.
//
// The API allows cross-origin requests, but unauthenticated clients are limited
// to 60 requests/hour (10/minute for search) per visitor IP, so results are
// cached in localStorage. Stats show a dash until data arrives, then count up
// from 0 to the fetched value; if a request fails, the dash stays.
(function () {
  const REPO = 'carbon-language/carbon-lang';
  const CACHE_KEY = 'carbon-github-stats';
  const CACHE_TTL_MS = 60 * 60 * 1000;
  const ANIMATION_MS = 1200;
  const IDS = {
    stars: 'stat-stars',
    forks: 'stat-forks',
    issues: 'stat-issues',
  };

  const formatter = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  // Counts an element up from 0 to `target`, easing out towards the end.
  function countUp(el, target) {
    if (reduceMotion) {
      el.textContent = formatter.format(target);
      return;
    }
    // Start timing from the first frame so progress begins at exactly 0.
    let start = null;
    function step(now) {
      if (start === null) start = now;
      const t = Math.min((now - start) / ANIMATION_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = formatter.format(Math.round(target * eased));
      if (t < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  }

  function render(stats) {
    for (const [key, id] of Object.entries(IDS)) {
      const el = document.getElementById(id);
      if (typeof stats[key] === 'number') {
        countUp(el, stats[key]);
      } else {
        el.textContent = '—';
      }
    }
  }

  function readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
        return cached.stats;
      }
    } catch (e) {
      // Ignore unavailable or malformed storage.
    }
    return null;
  }

  function writeCache(stats) {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ time: Date.now(), stats }),
      );
    } catch (e) {
      // Ignore unavailable storage.
    }
  }

  async function getJson(url) {
    const response = await fetch(url, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) {
      throw new Error(`${url} returned ${response.status}`);
    }
    return response.json();
  }

  async function load() {
    const cached = readCache();
    if (cached) {
      render(cached);
      return;
    }

    // `open_issues_count` on the repository includes pull requests, so open
    // issues are counted separately with the search API.
    const [repo, issues] = await Promise.allSettled([
      getJson(`https://api.github.com/repos/${REPO}`),
      getJson(
        `https://api.github.com/search/issues?q=repo:${REPO}+type:issue+state:open&per_page=1`,
      ),
    ]);

    const stats = {};
    if (repo.status === 'fulfilled') {
      stats.stars = repo.value.stargazers_count;
      stats.forks = repo.value.forks_count;
    }
    if (issues.status === 'fulfilled') {
      stats.issues = issues.value.total_count;
    }

    render(stats);
    if (repo.status === 'fulfilled' && issues.status === 'fulfilled') {
      writeCache(stats);
    }
  }

  load();
})();
