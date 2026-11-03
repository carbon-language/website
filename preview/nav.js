// Part of the Carbon Language project, under the Apache License v2.0 with LLVM
// Exceptions. See /LICENSE for license information.
// SPDX-License-Identifier: Apache-2.0 WITH LLVM-exception

// Toggles the navigation menu on narrow screens.
(function () {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');

  function setOpen(open) {
    links.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  toggle.addEventListener('click', () => {
    setOpen(!links.classList.contains('open'));
  });

  // Close the menu after following a link.
  links.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && links.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Reset when the viewport grows past the mobile breakpoint. Keep in sync with
  // the `max-width: 900px` media query in styles.css.
  window.matchMedia('(min-width: 901px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
})();
