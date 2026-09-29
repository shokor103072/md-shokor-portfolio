/*!
 * enhance.js (part 1) — adds features to your portfolio without changing any content.
 * Install: save as assets/enhance.js, then add this inside <head> on every page,
 * right after your stylesheet link:
 *   <script src="/md-shokor-portfolio/assets/enhance.js"></script>
 * Delete that line to undo everything.
 */
(() => {
  'use strict';
  if (window.__enh) return;
  window.__enh = true;

  /* ------------------------------- CONFIG ------------------------------- */
  const CONFIG = {
    carouselAutoplayMs: 6000, // Highlights autoplay interval (0 = off)
    features: {
      lightbox: true,         // full-screen photo viewer
      carousel: true,         // autoplay + swipe for Highlights
      countUp: true,          // animated "At a glance" numbers
      reveal: true,           // content fades in on scroll
      backToTop: true,        // back-to-top button with progress ring
      copyEmail: true,        // copy button next to email links
      pageTransitions: true   // smooth fade between pages
    }
  };

  /* ------------------------------- HELPERS ------------------------------ */
  // Let the existing slider keep manual controls while this script owns autoplay.
  window.__enhCarouselActive = CONFIG.features.carousel && CONFIG.carouselAutoplayMs > 0 && 'IntersectionObserver' in window;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  };
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = d => '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    close: icon('<path d="M18 6 6 18M6 6l12 12"/>'),
    prev: icon('<path d="m15 18-6-6 6-6"/>'),
    next: icon('<path d="m9 18 6-6-6-6"/>'),
    up: icon('<path d="M12 19V5M5 12l7-7 7 7"/>'),
    copy: icon('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    check: icon('<path d="M20 6 9 17l-5-5"/>')
  };
  let MAIN = null;
  let CAR = null;

  /* -------------------------------- STYLES ------------------------------ */
  const CSS = `
:root { --enh-accent: #0f766e; --enh-bg: #ffffff; --enh-fg: #111111; }
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
  ${CONFIG.features.pageTransitions ? '@view-transition { navigation: auto; }' : ''}
}
html.enh-lock { overflow: hidden; }

.enh-reveal { opacity: 0; translate: 0 18px;
  transition: opacity .8s cubic-bezier(.16,1,.3,1), translate .8s cubic-bezier(.16,1,.3,1); }
.enh-reveal.enh-in { opacity: 1; translate: 0 0; }

.enh-lb { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 56px 72px; background: rgba(8,9,12,.92); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  color: #f5f5f4; opacity: 0; visibility: hidden; transition: opacity .25s, visibility .25s; }
.enh-lb.open { opacity: 1; visibility: visible; }
.enh-lb figure { margin: 0; max-width: min(100%, 1400px); display: flex; flex-direction: column; align-items: center; gap: 14px; }
.enh-lb img { display: block; width: auto; height: auto; max-width: 100%; max-height: 76vh; object-fit: contain;
  border-radius: 10px; box-shadow: 0 30px 80px rgba(0,0,0,.5); opacity: 0; transition: opacity .3s; }
.enh-lb img.loaded { opacity: 1; }
.enh-lb figcaption { max-width: 72ch; margin: 0; text-align: center; font-size: .95rem; line-height: 1.55; color: rgba(245,245,244,.8); }
.enh-lb figcaption strong { display: block; color: #fff; font-weight: 600; }
.enh-lb-count { position: absolute; top: 18px; left: 20px; font-size: .9rem; font-variant-numeric: tabular-nums; color: rgba(255,255,255,.7); }
.enh-lb-btn { position: absolute; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0;
  border-radius: 50%; cursor: pointer; color: #fff; background: rgba(255,255,255,.1); transition: background .2s; }
.enh-lb-btn:hover { background: rgba(255,255,255,.22); }
.enh-lb-btn[hidden] { display: none; }
.enh-lb-close { top: 12px; right: 16px; }
.enh-lb-prev, .enh-lb-next { top: 50%; margin-top: -22px; }
.enh-lb-prev { left: 16px; }
.enh-lb-next { right: 16px; }
@media (max-width: 640px) {
  .enh-lb { padding: 56px 12px 80px; }
  .enh-lb-prev, .enh-lb-next { top: auto; bottom: 16px; margin: 0; }
  .enh-lb img { max-height: 66vh; }
}

.enh-car-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; z-index: 3; overflow: hidden;
  pointer-events: none; background: color-mix(in srgb, currentColor 12%, transparent); }
.enh-car-bar span { display: block; height: 100%; background: var(--enh-accent); transform: scaleX(0); transform-origin: left; }

.enh-top { position: fixed; right: 20px; bottom: 20px; z-index: 900; width: 48px; height: 48px; padding: 0; border: 0;
  border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--enh-fg);
  background: color-mix(in srgb, var(--enh-bg) 80%, transparent); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  box-shadow: 0 8px 28px rgba(0,0,0,.14), inset 0 0 0 1px color-mix(in srgb, var(--enh-fg) 10%, transparent);
  opacity: 0; transform: translateY(12px); pointer-events: none; transition: opacity .3s, transform .3s; }
.enh-top.show { opacity: 1; transform: none; pointer-events: auto; }
.enh-top .enh-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
.enh-top circle { fill: none; stroke-width: 2.5; }
.enh-top .enh-track { stroke: color-mix(in srgb, var(--enh-fg) 12%, transparent); }
.enh-top .enh-bar { stroke: var(--enh-accent); stroke-linecap: round; }
.enh-top > svg:last-child { width: 18px; height: 18px; }

.enh-copy { display: inline-grid; place-items: center; width: 28px; height: 28px; margin-left: 6px; padding: 0;
  vertical-align: middle; border-radius: 8px; border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  background: transparent; color: inherit; cursor: pointer; opacity: .7; transition: opacity .2s; }
.enh-copy:hover { opacity: 1; }
.enh-copy svg { width: 15px; height: 15px; }
.enh-toast { position: fixed; left: 50%; bottom: 28px; z-index: 1100; transform: translate(-50%, 16px); opacity: 0;
  pointer-events: none; padding: 10px 16px; border-radius: 999px; font-size: 14px; font-weight: 500;
  background: var(--enh-fg); color: var(--enh-bg); box-shadow: 0 12px 32px rgba(0,0,0,.2); transition: opacity .25s, transform .25s; }
.enh-toast.show { opacity: 1; transform: translate(-50%, 0); }

@media (max-width: 720px) { .enh-top { bottom: 88px; } }

@media print {
  .enh-lb, .enh-top, .enh-copy, .enh-toast, .enh-car-bar { display: none !important; }
  .enh-reveal { opacity: 1 !important; translate: none !important; }
}`;

  /* --------------------------- SHARED UTILITIES ------------------------- */
  // Match the site's colours (and follow light/dark switches).
  function syncColors() {
    const d = document.documentElement, b = document.body;
    const bgOf = n => {
      const c = getComputedStyle(n).backgroundColor;
      return c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c) ? c : '';
    };
    d.style.setProperty('--enh-bg', bgOf(b) || bgOf(d) || '#ffffff');
    d.style.setProperty('--enh-fg', getComputedStyle(b).color || '#111111');
    const link = $('main a[href]') || $('a[href]');
    if (link) d.style.setProperty('--enh-accent', getComputedStyle(link).color);
  }

  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = el('div', 'enh-toast');
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2000);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fallback below */ }
    const ta = el('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  // Finds your Highlights carousel from its ‹ › buttons.
  function findCarousel() {
    const ctl = $$('button, a, [role="button"]', MAIN);
    const label = n => (n.getAttribute('aria-label') || '') + ' ' + (n.getAttribute('title') || '');
    const text = n => n.textContent.trim();
    const prev = ctl.find(n => /^[\u2039\u2190\u276E<]$/.test(text(n)) || /\bprev(ious)?\b/i.test(label(n)));
    const next = ctl.find(n => /^[\u203A\u2192\u276F>]$/.test(text(n)) || /\bnext\b/i.test(label(n)));
    if (!prev || !next) return null;
    let root = prev.parentElement;
    while (root && !root.contains(next)) root = root.parentElement;
    while (root && root !== MAIN && !root.querySelector('img')) root = root.parentElement;
    if (!root || root === MAIN) return null;
    return { root, prev, next, imgs: $$('img', root) };
  }

  /* ------------------------------- FEATURES ----------------------------- */

  // 1. Full-screen photo viewer (gallery links, "View photo" links, carousel images)
  function lightbox() {
    const IMG = /\.(png|jpe?g|webp|avif|gif)(\?.*)?$/i;
    const links = $$('a[href]').filter(a => IMG.test(a.getAttribute('href') || ''));
    if (!links.length && !CAR) return;

    const box = el('div', 'enh-lb',
      '<span class="enh-lb-count" aria-live="polite"></span>' +
      '<button type="button" class="enh-lb-btn enh-lb-close" aria-label="Close">' + ICON.close + '</button>' +
      '<button type="button" class="enh-lb-btn enh-lb-prev" aria-label="Previous photo">' + ICON.prev + '</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>' +
      '<button type="button" class="enh-lb-btn enh-lb-next" aria-label="Next photo">' + ICON.next + '</button>');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    document.body.appendChild(box);

    const img = $('img', box), cap = $('figcaption', box), count = $('.enh-lb-count', box);
    const closeB = $('.enh-lb-close', box), prevB = $('.enh-lb-prev', box), nextB = $('.enh-lb-next', box);
    let items = [], idx = 0, lastFocus = null;

    const captionOf = (node, im) => {
      const fig = node.closest('figure');
      const fc = fig && fig.querySelector('figcaption');
      let t = (fc && fc.innerText) || (im && im.alt) || '';
      if (!t.trim()) {
        const block = node.closest('li, p');
        t = block ? block.textContent.replace(node.textContent, '') : '';
      }
      const lines = t.split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (!lines.length) return '';
      return '<strong>' + esc(lines[0].replace(/[.\s]+$/, '')) + '</strong>' + esc(lines.slice(1).join(' '));
    };

    const show = () => {
      const it = items[idx];
      img.classList.remove('loaded');
      img.onload = img.onerror = () => img.classList.add('loaded');
      img.src = it.src;
      img.alt = it.alt;
      if (img.complete && img.naturalWidth) img.classList.add('loaded');
      cap.innerHTML = it.cap;
      const many = items.length > 1;
      count.textContent = many ? (idx + 1) + ' / ' + items.length : '';
      prevB.hidden = nextB.hidden = !many;
      if (many) [idx + 1, idx - 1].forEach(j => { new Image().src = items[(j + items.length) % items.length].src; });
    };
    const open = (list, k) => {
      items = list; idx = k; lastFocus = document.activeElement;
      show();
      box.classList.add('open');
      document.documentElement.classList.add('enh-lock');
      closeB.focus({ preventScroll: true });
    };
    const close = () => {
      box.classList.remove('open');
      document.documentElement.classList.remove('enh-lock');
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    const go = d => { if (items.length > 1) { idx = (idx + d + items.length) % items.length; show(); } };

    prevB.addEventListener('click', () => go(-1));
    nextB.addEventListener('click', () => go(1));
    closeB.addEventListener('click', close);
    box.addEventListener('click', e => { if (!e.target.closest('.enh-lb-btn, img, figcaption')) close(); });
    document.addEventListener('keydown', e => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab') {
        e.preventDefault();
        const f = [closeB, prevB, nextB].filter(b => !b.hidden);
        const at = f.indexOf(document.activeElement);
        f[(at + (e.shiftKey ? f.length - 1 : 1) + f.length) % f.length].focus();
      }
    });
    let sx = 0, sy = 0;
    box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    box.addEventListener('touchend', e => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      else if (dy > 90 && dy > Math.abs(dx)) close(); // swipe down to close
    }, { passive: true });

    const linkItems = links.map(a => {
      const im = a.querySelector('img');
      return { src: a.href, alt: im ? im.alt : '', cap: captionOf(a, im) };
    });
    links.forEach((a, k) => a.addEventListener('click', e => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // keep "open in new tab"
      e.preventDefault();
      open(linkItems, k);
    }));

    if (CAR) {
      const carItems = CAR.imgs.map(im => ({ src: im.currentSrc || im.src, alt: im.alt, cap: captionOf(im, im) }));
      CAR.imgs.forEach((im, k) => {
        if (im.closest('a')) return;
        im.style.cursor = 'zoom-in';
        im.addEventListener('click', () => open(carItems, k));
      });
    }
  }

  // 2. Highlights carousel: autoplay with progress bar, pause on hover/off-screen, swipe
  function carousel() {
    if (!CAR) return;
    const { root, prev, next, imgs } = CAR;
    let sx = 0, sy = 0;
    root.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    root.addEventListener('touchend', e => {
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) (dx < 0 ? next : prev).click();
    }, { passive: true });

    const ms = CONFIG.carouselAutoplayMs;
    if (!ms || reduce) return;

    // Put the progress bar on the element that holds the slides
    let vp = imgs[0] ? imgs[0].parentElement : null;
    while (vp && vp !== root && !imgs.every(x => vp.contains(x))) vp = vp.parentElement;
    if (vp && vp !== root && getComputedStyle(vp).transform !== 'none') vp = vp.parentElement;
    vp = vp || root;
    if (getComputedStyle(vp).position === 'static') vp.style.position = 'relative';
    const bar = el('div', 'enh-car-bar', '<span></span>');
    bar.setAttribute('aria-hidden', 'true');
    vp.appendChild(bar);
    const fill = bar.firstChild;

    let timer = 0, hover = false, visible = false;
    const restart = () => {
      clearTimeout(timer);
      fill.style.transition = 'none';
      fill.style.transform = 'scaleX(0)';
      if (hover || !visible || document.hidden) return;
      void fill.offsetWidth; // restart the animation
      fill.style.transition = 'transform ' + ms + 'ms linear';
      fill.style.transform = 'scaleX(1)';
      timer = setTimeout(() => next.click(), ms);
    };
    prev.addEventListener('click', restart);
    next.addEventListener('click', restart);
    root.addEventListener('mouseenter', () => { hover = true; restart(); });
    root.addEventListener('mouseleave', () => { hover = false; restart(); });
    document.addEventListener('visibilitychange', restart);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; restart(); }, { threshold: 0.35 }).observe(root);
  }

  // 3. Count-up animation for big standalone numbers ("At a glance")
  function countUp() {
    if (reduce || !window.IntersectionObserver) return;
    const NUM = /^\d[\d,]*\+?$/;
    const nodes = $$('*', MAIN).filter(n => {
      if (n.children.length || n.closest('a, h1, h2, h3, button, time')) return false;
      const t = n.textContent.trim();
      if (!NUM.test(t) || /^0\d/.test(t)) return false;          // skip "01", "02"…
      const v = +t.replace(/\D/g, '');
      if (v >= 1900 && v <= 2100) return false;                  // skip years
      return n.matches('.stat-val') || parseFloat(getComputedStyle(n).fontSize) >= 22; // include mobile stats
    });
    if (!nodes.length) return;
    const run = n => {
      const final = n.dataset.enhFinal, target = +final.replace(/\D/g, ''), plus = final.endsWith('+') ? '+' : '';
      const dur = Math.min(2000, 800 + target * 3), t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        n.textContent = p < 1 ? Math.round(target * (1 - Math.pow(1 - p, 3))) + plus : final;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { io.unobserve(e.target); run(e.target); }
    }), { threshold: 0.5 });
    nodes.forEach(n => {
      n.dataset.enhFinal = n.textContent.trim();
      n.style.fontVariantNumeric = 'tabular-nums';
      n.textContent = '0';
      io.observe(n);
    });
  }

  // 4. Fade-in on scroll (only for content below the first screen)
  function reveal() {
    if (reduce || !window.IntersectionObserver) return;
    const vh = window.innerHeight;
    const sections = $$('section', MAIN).filter(s => !s.parentElement.closest('section'));
    const pool = sections.length ? sections.flatMap(s => Array.from(s.children)) : Array.from(MAIN.children);
    const items = pool.filter(n => {
      if (CAR && CAR.root !== n && CAR.root.contains(n)) return false; // don't touch slides
      const pos = getComputedStyle(n).position;
      if (pos === 'fixed' || pos === 'sticky') return false;
      return n.getBoundingClientRect().top > vh * 0.95;
    });
    if (!items.length) return;
    const io = new IntersectionObserver(entries => {
      let d = 0;
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const n = e.target;
        io.unobserve(n);
        n.style.transitionDelay = Math.min(d++, 4) * 80 + 'ms';
        n.classList.add('enh-in');
        setTimeout(() => { n.classList.remove('enh-reveal', 'enh-in'); n.style.transitionDelay = ''; }, 1300);
      });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach(n => { n.style.transition = 'none'; n.classList.add('enh-reveal'); });
    void document.body.offsetHeight; // apply the hidden state without animating
    items.forEach(n => { n.style.transition = ''; io.observe(n); });
  }

  // 5. Back-to-top button with a reading-progress ring
  function backToTop() {
    const R = 21, C = 2 * Math.PI * R;
    const btn = el('button', 'enh-top',
      '<svg class="enh-ring" viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle class="enh-track" cx="24" cy="24" r="' + R + '"/>' +
      '<circle class="enh-bar" cx="24" cy="24" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/>' +
      '</svg>' + ICON.up);
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(btn);
    const bar = $('.enh-bar', btn);
    let ticking = false;
    const update = () => {
      ticking = false;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
      bar.setAttribute('stroke-dashoffset', String(C * (1 - p)));
      btn.classList.toggle('show', window.scrollY > 500);
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
  }

  // 6. Copy button next to email addresses
  function copyEmail() {
    $$('a[href^="mailto:"]', MAIN).forEach(a => {
      let email = a.getAttribute('href').slice(7).split('?')[0];
      try { email = decodeURIComponent(email); } catch (e) { /* keep raw */ }
      if (!email) return;
      const b = el('button', 'enh-copy', ICON.copy);
      b.type = 'button';
      b.title = 'Copy email';
      b.setAttribute('aria-label', 'Copy email address');
      a.after(b);
      b.addEventListener('click', async () => {
        if (!(await copyText(email))) return;
        toast('Email copied');
        b.innerHTML = ICON.check;
        setTimeout(() => { b.innerHTML = ICON.copy; }, 1600);
      });
    });
  }

  /* -------------------------------- START ------------------------------- */
  const style = document.createElement('style');
  style.id = 'enh-css';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  const start = () => {
    MAIN = $('main') || document.body;
    syncColors();
    const mo = new MutationObserver(syncColors);
    const opts = { attributes: true, attributeFilter: ['class', 'data-theme'] };
    mo.observe(document.documentElement, opts);
    mo.observe(document.body, opts);
    try { CAR = findCarousel(); } catch (e) { CAR = null; }

    const features = { lightbox, carousel, countUp, reveal, backToTop, copyEmail };
    Object.keys(features).forEach(name => {
      if (CONFIG.features[name] === false) return;
      try { features[name](); } catch (err) { console.warn('[enhance] ' + name + ' skipped:', err); }
    });
    window.addEventListener('load', syncColors, { once: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
