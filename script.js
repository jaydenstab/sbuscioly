/* Shared, dependency-free navigation behavior. */
'use strict';

const toggle = document.querySelector('#mobileToggle');
const mobileNav = document.querySelector('#mobileNav');

function setMenu(open) {
  if (!toggle || !mobileNav) return;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  mobileNav.hidden = !open;
}

if (toggle && mobileNav) {
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  mobileNav.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && !mobileNav.contains(event.target) && !toggle.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) {
      setMenu(false);
      toggle.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setMenu(false);
  }, { passive: true });
}
