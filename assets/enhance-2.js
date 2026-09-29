/*!
 * enhance-2.js (part 2): "Cite" buttons with BibTeX, plus a circular light/dark switch.
 * Adds features only; nothing on your pages is removed or rewritten.
 * Install: save as assets/enhance-2.js, then add this line inside <head> on every
 * page, right after the part 1 line:
 *   <script src="/md-shokor-portfolio/assets/enhance-2.js"></script>
 * Delete that line to undo everything.
 */
(() => {
  'use strict';
  if (window.__enh2) return;
  window.__enh2 = true;

  /* ------------------------------- CONFIG ------------------------------- */
  const CONFIG = {
    features: {
      cite: true,            // "Cite" button (BibTeX + plain text) on every paper
      themeTransition: true  // circular reveal when switching light/dark
    }
  };

  /* ------------------------------- HELPERS ------------------------------ */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clean = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const norm = s => clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const OWN = '.enh2-modal, .enh-lb, .enh-top, .enh-toast';
  const icon = d => '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const ICON = {
    close: icon('<path d="M18 6 6 18M6 6l12 12"/>'),
    copy: icon('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    check: icon('<path d="M20 6 9 17l-5-5"/>'),
    ext: icon('<path d="M7 17 17 7M8 7h9v9"/>')
  };
  const LINK_WORD = /^(publisher|doi|pdf|scholar|researchgate|thesis|article|paper|cite|code|slides|video|abstract|bibtex|preprint|arxiv|html)$/i;
  const PAPER_LINK = /^(publisher|doi|pdf|scholar|researchgate|thesis|article|paper)$/i;

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

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fallback below */ }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }

  /* -------------------------------- STYLES ------------------------------ */
  const CSS = `
html.enh2-lock { overflow: hidden; }
.enh2-modal { position: fixed; inset: 0; z-index: 1050; display: flex; align-items: center; justify-content: center;
  padding: 16px; background: rgba(12,12,16,.45); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  opacity: 0; visibility: hidden; transition: opacity .18s ease, visibility .18s; }
.enh2-modal.open { opacity: 1; visibility: visible; }
.enh2-panel { box-sizing: border-box; width: min(680px, 100%); max-height: calc(100vh - 32px); overflow: auto;
  display: flex; flex-direction: column; gap: 12px; padding: 20px 22px; text-align: left; font: inherit; line-height: 1.5;
  background: var(--enh-bg, #fff); color: var(--enh-fg, #111); border-radius: 16px;
  box-shadow: 0 28px 90px rgba(0,0,0,.28), 0 0 0 1px color-mix(in srgb, var(--enh-fg, #111) 10%, transparent);
  transform: translateY(10px) scale(.985); transition: transform .22s cubic-bezier(.16,1,.3,1); }
.enh2-modal.open .enh2-panel { transform: none; }
.enh2-panel * { box-sizing: border-box; }
.enh2-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.enh2-h { font-size: 1.05rem; font-weight: 650; }
.enh2-x { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 50%;
  background: transparent; color: inherit; cursor: pointer; }
.enh2-x:hover { background: color-mix(in srgb, currentColor 8%, transparent); }
.enh2-title { margin: 0; font-size: 14px; color: color-mix(in srgb, var(--enh-fg, #111) 70%, transparent); }
.enh2-tabs { align-self: flex-start; display: inline-flex; gap: 4px; padding: 4px; border-radius: 10px;
  background: color-mix(in srgb, var(--enh-fg, #111) 6%, transparent); }
.enh2-tabs button { padding: 6px 12px; border: 0; border-radius: 7px; background: transparent; color: inherit;
  font: inherit; font-size: 13px; cursor: pointer; opacity: .7; }
.enh2-tabs button[aria-selected="true"] { opacity: 1; background: var(--enh-bg, #fff); box-shadow: 0 1px 3px rgba(0,0,0,.14); }
.enh2-code { margin: 0; padding: 14px 16px; max-height: 42vh; overflow: auto; white-space: pre-wrap; word-break: break-word;
  border-radius: 12px; font: 12.5px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: inherit;
  background: color-mix(in srgb, var(--enh-fg, #111) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--enh-fg, #111) 9%, transparent); }
.enh2-actions { display: flex; flex-wrap: wrap; gap: 10px; }
.enh2-btn { display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 14px; border-radius: 10px;
  font: inherit; font-size: 14px; font-weight: 500; line-height: 1; text-decoration: none; cursor: pointer; color: inherit;
  background: transparent; border: 1px solid color-mix(in srgb, var(--enh-fg, #111) 16%, transparent); }
.enh2-btn[hidden] { display: none; }
.enh2-btn:hover { filter: brightness(1.1); }
.enh2-primary { color: var(--enh-bg, #fff); background: var(--enh-fg, #111); border-color: transparent; }
@media (prefers-reduced-motion: reduce) { .enh2-modal, .enh2-panel { transition: none; } .enh2-panel { transform: none; } }
html.enh2-vt * { transition: none !important; }
html.enh2-vt::view-transition-old(root), html.enh2-vt::view-transition-new(root) { animation: none; mix-blend-mode: normal; }
@media print { .enh2-modal, .enh2-cite-link { display: none !important; } }`;

  /* ---------------------------- PAPER DETECTION -------------------------- */
  // A paper = a heading (h2–h4) followed by a row with Publisher / PDF / DOI links.
  function paperEntries(root) {
    const out = [], seen = new Set();
    $$('a[href]', root).forEach(a => {
      if (a.closest(OWN) || a.closest('h1, h2, h3, h4, h5, h6')) return;
      if (!/doi\.org\//i.test(a.getAttribute('href') || '') && !PAPER_LINK.test(clean(a.textContent))) return;
      const e = entryFor(a);
      if (e && !seen.has(e.heading)) { seen.add(e.heading); out.push(e); }
    });
    return out;
  }

  function entryFor(a) {
    const body = a.ownerDocument.body, H = 'h2, h3, h4';
    let n = a.parentElement;
    while (n && n !== body) {
      const hs = n.querySelectorAll(H);
      if (hs.length === 1) {
        const h = hs[0];
        if (!(h.compareDocumentPosition(a) & 4) || clean(h.textContent).length < 25) return null;
        return { heading: h, box: n, row: a.parentElement, parts: [] };
      }
      if (hs.length > 1) break;
      n = n.parentElement;
    }
    if (!n || n === body) return null;
    // Flat layout: heading, authors, venue and links are siblings.
    let blk = a;
    while (blk.parentElement !== n) blk = blk.parentElement;
    const parts = [];
    let h = null;
    for (let p = blk.previousElementSibling; p; p = p.previousElementSibling) {
      if (/^H[234]$/.test(p.tagName)) { h = p; break; }
      const inner = p.querySelectorAll(H);
      if (inner.length) { h = inner[inner.length - 1]; break; }
      parts.unshift(p);
    }
    if (!h || clean(h.textContent).length < 25) return null;
    return { heading: h, box: null, row: blk, parts };
  }

  const titleOf = h => {
    const c = h.cloneNode(true);
    $$('svg, [aria-hidden="true"]', c).forEach(n => n.remove());
    return clean(c.textContent.replace(/[\u2605\u2606]/g, ''));
  };

  /* ------------------------------- CITATIONS ----------------------------- */
  const texEsc = s => String(s)
    .replace(/([&%#_])/g, '\\$1')
    .replace(/[\u2080-\u2089]/g, c => '$_{' + (c.charCodeAt(0) - 0x2080) + '}$')   // CO₂ → CO$_{2}$
    .replace(/\u2014/g, '---')
    .replace(/\u2013/g, '--');

  // Keep acronyms and mixed-case words (DAS, CO₂, MIMO, 5G) exactly as written.
  const protect = t => t.split(/(\s+)/).map(w => {
    const m = w.match(/^([("'[]*)(.*?)([)"'\].,:;!?]*)$/);
    if (!m || !m[2]) return w;
    return /.[A-Z]|\d/.test(m[2]) && /[A-Za-z]/.test(m[2]) ? m[1] + '{' + m[2] + '}' + m[3] : w;
  }).join('');

  function parseVenue(venue) {
    const v = clean(venue).replace(/\s*;.*$/, '');            // drop notes like "; Scholar record dated 2021"
    if (/\b(thesis|dissertation)\b/i.test(v)) {
      const school = clean(v.replace(/\b(thesis|dissertation)\b.*$/i, '')) || v;
      if (/ph\.?\s?d|doctor/i.test(v)) return { type: 'phdthesis', f: { school } };
      if (/master|m\.?sc\.?/i.test(v)) return { type: 'mastersthesis', f: { school } };
      return { type: 'misc', f: { howpublished: v } };
    }
    const pp = v.match(/^(.*?),\s*pp\.?\s*([A-Za-z]?\d+(?:\s*[\u2013\u2014-]+\s*[A-Za-z]?\d+)?)\s*$/i);
    if (pp && !/journal|transactions|letters/i.test(pp[1])) return { type: 'incollection', f: { booktitle: pp[1], pages: pp[2] } };
    if (/conference|proceedings|symposium|workshop|congress|\bESTCON\b/i.test(v) && !/\bjournal\b/i.test(v)) {
      return { type: 'inproceedings', f: { booktitle: v } };
    }
    const m = v.match(/^(.*?)\s+(\d+)\s*(?:\(([^)]+)\))?\s*(?:,\s*(?:pp\.?\s*)?([A-Za-z]?\d+(?:\s*[\u2013\u2014-]+\s*[A-Za-z]?\d+)?))?\s*$/);
    if (m) return { type: 'article', f: { journal: m[1].replace(/[,\s]+$/, ''), volume: m[2], number: m[3] || '', pages: m[4] || '' } };
    return { type: 'article', f: { journal: v } };
  }

  function buildCitation(e) {
    const title = titleOf(e.heading);
    const nt = norm(title);
    const lines = (e.box ? [e.box] : [e.heading].concat(e.parts, [e.row]))
      .map(b => b.innerText || b.textContent || '').join('\n').split('\n').map(clean).filter(Boolean);
    const rest = lines.filter(l => {
      const nl = norm(l).replace(/[\u2605\u2606]/g, '').trim();
      if (!nl || nl === nt || nl.indexOf(nt) >= 0 || (nl.length > 20 && nt.indexOf(nl) >= 0)) return false;
      if (/^(19|20)\d{2}$/.test(l) || /^[\u2605\u2606\s]+$/.test(l) || /^featured$/i.test(l)) return false;
      return !l.split(/\s+/).every(w => LINK_WORD.test(w.replace(/[^A-Za-z]/g, '')));
    });
    let ai = 0;
    while (ai < rest.length - 1 && /^[A-Za-z]{2,14}$/.test(rest[ai])) ai++;   // skip tags like "Journal"
    const authorLine = rest[ai] || '';
    const venue = rest[ai + 1] || '';

    const anchors = $$('a[href]', e.box || e.row);
    const doiA = anchors.find(a => /doi\.org\//i.test(a.href));
    let doi = doiA ? doiA.href.replace(/^.*?doi\.org\//i, '') : '';
    try { doi = decodeURIComponent(doi); } catch (x) { /* keep as is */ }
    const pubA = anchors.find(a => /^publisher$/i.test(clean(a.textContent)));
    const url = doi ? 'https://doi.org/' + doi : (pubA ? pubA.href : '');

    let year = lines.find(l => /^(19|20)\d{2}$/.test(l)) || '';
    for (let n = e.heading; !year && n && n.nodeType === 1; n = n.parentElement) {
      const m = n.id && n.id.match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/);   // e.g. year groups with id="g-2026"
      if (m) year = m[1];
    }
    const eventYear = /\b(?:conference|proceedings|symposium|workshop|congress|ESTCON)\b/i.test(venue)
      ? venue.match(/\b(?:19|20)\d{2}\b/) : null;
    if (eventYear) year = eventYear[0];
    if (!year) { const m = (venue + ' ' + doi).match(/\b(19|20)\d{2}\b/); year = m ? m[0] : ''; }

    let others = false;
    const authors = authorLine.split(/\s*,\s*|\s+and\s+|\s*&\s*/).map(clean).filter(x => {
      if (/^et\.?\s*al\.?$/i.test(x)) { others = true; return false; }
      return !!x;
    });

    const ascii = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toLowerCase();
    const STOP = /^(a|an|the|on|of|for|in|to|with|and|using|via|from|by|at|toward|towards)$/i;
    const lastName = ascii((authors[0] || '').split(' ').pop()) || 'paper';
    const firstWord = ((title.match(/[A-Za-z]+/g) || []).find(w => !STOP.test(w)) || 'paper').toLowerCase();

    const pv = parseVenue(venue), f = pv.f;
    const fields = [
      ['title', protect(texEsc(title))],
      ['author', authors.map(texEsc).concat(others ? ['others'] : []).join(' and ')],
      ['journal', f.journal ? texEsc(f.journal) : ''],
      ['booktitle', f.booktitle ? texEsc(f.booktitle) : ''],
      ['school', f.school ? texEsc(f.school) : ''],
      ['howpublished', f.howpublished ? texEsc(f.howpublished) : ''],
      ['volume', f.volume || ''],
      ['number', f.number || ''],
      ['pages', f.pages ? String(f.pages).replace(/\s*[\u2013\u2014-]+\s*/g, '--') : ''],
      ['year', year],
      ['doi', doi],
      ['url', url]
    ].filter(([, v]) => v);
    const w = Math.max.apply(null, fields.map(([k]) => k.length));
    const bib = '@' + pv.type + '{' + lastName + year + firstWord + ',\n' +
      fields.map(([k, v]) => '  ' + k.padEnd(w) + ' = {' + v + '}').join(',\n') + '\n}';

    const strip = s => s.replace(/[.\s]+$/, '');
    const who = /et al\.$/.test(authorLine) ? authorLine : strip(authorLine);
    const plain = [
      who ? who + (year ? ' (' + year + ').' : '.') : (year ? '(' + year + ').' : ''),
      strip(title) + (/[?!]$/.test(title) ? '' : '.'),
      venue ? strip(clean(venue).replace(/\s*;.*$/, '')) + '.' : '',
      url
    ].filter(Boolean).join(' ');

    return { title, bib, plain, url };
  }

  /* ------------------------------ CITE WINDOW ---------------------------- */
  let modal = null;
  function modalEl() {
    if (modal) return modal;
    const m = document.createElement('div');
    m.className = 'enh2-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-labelledby', 'enh2-cite-h');
    m.innerHTML =
      '<div class="enh2-panel">' +
        '<div class="enh2-head"><div class="enh2-h" id="enh2-cite-h">Cite this paper</div>' +
        '<button type="button" class="enh2-x" aria-label="Close">' + ICON.close + '</button></div>' +
        '<p class="enh2-title"></p>' +
        '<div class="enh2-tabs" role="tablist" aria-label="Citation format">' +
          '<button type="button" role="tab" data-fmt="bib">BibTeX</button>' +
          '<button type="button" role="tab" data-fmt="plain">Plain text</button>' +
        '</div>' +
        '<pre class="enh2-code" tabindex="0"></pre>' +
        '<div class="enh2-actions">' +
          '<button type="button" class="enh2-btn enh2-primary enh2-copy">' + ICON.copy + '<span>Copy</span></button>' +
          '<a class="enh2-btn enh2-open" target="_blank" rel="noopener"><span>View paper</span>' + ICON.ext + '</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(m);

    const pre = $('.enh2-code', m), copyB = $('.enh2-copy', m);
    m._fmt = 'bib';
    m._show = fmt => {
      m._fmt = fmt;
      $$('[role="tab"]', m).forEach(t => t.setAttribute('aria-selected', String(t.dataset.fmt === fmt)));
      pre.textContent = m._c ? m._c[fmt] : '';
    };
    $$('[role="tab"]', m).forEach(t => t.addEventListener('click', () => m._show(t.dataset.fmt)));
    copyB.addEventListener('click', async () => {
      if (!(await copyText(pre.textContent))) return;
      copyB.innerHTML = ICON.check + '<span>Copied</span>';
      setTimeout(() => { copyB.innerHTML = ICON.copy + '<span>Copy</span>'; }, 1600);
    });
    $('.enh2-x', m).addEventListener('click', () => closeModal(m));
    m.addEventListener('click', ev => { if (ev.target === m) closeModal(m); });
    m.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { ev.stopPropagation(); closeModal(m); return; }
      if (ev.key !== 'Tab') return;
      const f = $$('button, [href], [tabindex]:not([tabindex="-1"])', m).filter(n => !n.hidden && n.getClientRects().length);
      if (!f.length) return;
      ev.preventDefault();
      const i = f.indexOf(document.activeElement);
      f[(i + (ev.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    });
    modal = m;
    return m;
  }

  function openCite(e) {
    const m = modalEl();
    m._c = buildCitation(e);
    $('.enh2-title', m).textContent = m._c.title;
    const open = $('.enh2-open', m);
    open.hidden = !m._c.url;
    if (m._c.url) open.href = m._c.url;
    m._show(m._fmt);
    m._last = document.activeElement;
    m.classList.add('open');
    document.documentElement.classList.add('enh2-lock');
    setTimeout(() => $('.enh2-copy', m).focus({ preventScroll: true }), 30);
  }

  function closeModal(m) {
    m.classList.remove('open');
    document.documentElement.classList.remove('enh2-lock');
    if (m._last && m._last.focus && document.contains(m._last)) m._last.focus({ preventScroll: true });
  }

  // Put a "Cite" link after Publisher / PDF / Scholar, styled like its neighbours.
  function addCiteLinks() {
    paperEntries($('main') || document.body).forEach(e => {
      if ((e.box || e.row).querySelector('.enh2-cite-link')) return;
      const links = $$('a[href]', e.row).filter(a => !a.closest('h1, h2, h3, h4, h5, h6') &&
        (/doi\.org\//i.test(a.getAttribute('href') || '') || LINK_WORD.test(clean(a.textContent))));
      const last = links[links.length - 1];
      if (!last) return;
      const c = document.createElement('a');
      c.href = '#';
      c.textContent = 'Cite';
      c.setAttribute('role', 'button');
      c.setAttribute('aria-haspopup', 'dialog');
      c.className = String(last.className || '').split(/\s+/)
        .filter(k => k && !/ext|external|outbound/i.test(k)).concat('enh2-cite-link').join(' ');
      c.addEventListener('click', ev => { ev.preventDefault(); openCite(e); });
      c.addEventListener('keydown', ev => { if (ev.key === ' ') { ev.preventDefault(); openCite(e); } });

      // If each link sits in its own wrapper (e.g. <li>), copy the wrapper too.
      let unit = last, holder = c;
      const par = last.parentElement;
      if (par && par !== e.row && par.children.length === 1 && !par.contains(e.heading)) {
        unit = par;
        holder = par.cloneNode(false);
        holder.removeAttribute('id');
        holder.appendChild(c);
      }
      // Copy the separator between links (a space, " · ", etc.) if there is one.
      const ps = unit.previousSibling;
      let sep = null;
      if (ps && ps.nodeType === 3) sep = ps.cloneNode();
      else if (ps && ps.nodeType === 1 && ps.tagName !== 'A' && !ps.querySelector('a') && clean(ps.textContent).length <= 3) sep = ps.cloneNode(true);
      unit.after(holder);
      if (sep) unit.after(sep);
    });
  }

  function initCite() {
    addCiteLinks();
    // Re-run if the Publications page filters or re-renders its list.
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(addCiteLinks, 200); })
      .observe($('main') || document.body, { childList: true, subtree: true });
  }

  /* ------------------------ CIRCULAR THEME SWITCH ------------------------ */
  function themeToggles() {
    const hits = $$('button, [role="button"], a, label, input[type="checkbox"]').filter(n => {
      if (n.closest(OWN)) return false;
      const meta = [n.getAttribute('aria-label'), n.getAttribute('title'), n.id,
        typeof n.className === 'string' ? n.className : ''].join(' ');
      const t = clean(n.textContent);
      return /\b(theme|dark|light|mode)\b/i.test(meta) ||
        (t.length > 0 && t.length <= 6 && /^[\u263C\u263D\u263E\u2600\u2609\u25D0\u25D1\u{1F319}\u{1F31E}\s]+$/u.test(t));
    });
    return hits.filter(n => !hits.some(m => m !== n && m.contains(n)));
  }

  function themeTransition() {
    if (!document.startViewTransition || reduce) return;
    let bypass = false, busy = false;
    window.addEventListener('click', e => {
      if (bypass || busy) return;
      const t = themeToggles().find(n => n.contains(e.target));
      if (!t) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const r = t.getBoundingClientRect();
      const fromKey = e.detail === 0 || (!e.clientX && !e.clientY);
      const x = fromKey ? r.left + r.width / 2 : e.clientX;
      const y = fromKey ? r.top + r.height / 2 : e.clientY;
      const root = document.documentElement;
      const toggle = () => { bypass = true; try { t.click(); } finally { bypass = false; } };
      busy = true;
      root.classList.add('enh2-vt');
      let vt;
      try { vt = document.startViewTransition(toggle); }
      catch (err) { toggle(); root.classList.remove('enh2-vt'); busy = false; return; }
      vt.ready.then(() => {
        const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + R + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 700, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' });
      }).catch(() => {});
      vt.finished.catch(() => {}).then(() => { root.classList.remove('enh2-vt'); busy = false; });
    }, true);
  }

  /* -------------------------------- START ------------------------------- */
  const style = document.createElement('style');
  style.id = 'enh2-css';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  const start = () => {
    syncColors();
    const mo = new MutationObserver(syncColors);
    const opts = { attributes: true, attributeFilter: ['class', 'data-theme'] };
    mo.observe(document.documentElement, opts);
    mo.observe(document.body, opts);
    const run = (name, fn) => {
      if (CONFIG.features[name] === false) return;
      try { fn(); } catch (err) { console.warn('[enhance-2] ' + name + ' skipped:', err); }
    };
    run('themeTransition', themeTransition);
    run('cite', initCite);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
