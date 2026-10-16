// The content layer: the section menu, jump links (which fly you through the scene), the latest posts from the blog,
// and small conveniences. The 3D conductor hands in how to scroll, so jumps stay smooth with or without Lenis.
import { t, locale, onLangChange } from './i18n.js';

// The blog is the Astro site at the root of olv02.github.io; its RSS feed lists every post.
const BLOG = 'https://olv02.github.io/blog/';
const FEED = 'https://olv02.github.io/rss.xml';

export function initSite({ scrollTo, lockScroll }) {
  const root = document.documentElement;
  const menu = document.getElementById('menu'), btn = document.getElementById('menu-btn');

  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    btn.setAttribute('aria-expanded', String(open));
    root.classList.toggle('menu-open', open);
    lockScroll(open);
    if (open) menu.querySelector('a').focus({ preventScroll: true });
  };
  window.__siteMenu = true;   // tells boot.js the full menu is wired up
  btn.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', (e) => { if (e.target === menu) setMenu(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); btn.focus(); } });

  const go = (id) => {
    const el = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !el) return;
    scrollTo(el ? el : 0);
    history.replaceState(null, '', id === 'top' ? location.pathname + location.search : '#' + id);
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-go]');
    if (!a) return;
    e.preventDefault();
    if (menu.classList.contains('open')) setMenu(false);
    go(a.getAttribute('href').slice(1));
  });

  const copies = [...document.querySelectorAll('[data-copy]')];
  const copyLabel = () => copies.forEach((b) => { if (!b.dataset.busy) b.textContent = t('Copy'); });
  copies.forEach((b) => b.addEventListener('click', async () => {
    b.dataset.busy = '1';
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = t('Copied'); }
    catch (e) { b.textContent = t('Press and hold to copy'); }
    setTimeout(() => { delete b.dataset.busy; copyLabel(); }, 1600);
  }));
  copyLabel();
  onLangChange(copyLabel);

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  loadEssays();
  sectionMotion();
  cardGlow();
  hello();

  // a link straight to a section (…/#work) still plays the entrance, then flies there.
  const hash = location.hash.slice(1);
  return {
    onEnter() { if (hash && (hash === 'top' || document.getElementById(hash))) setTimeout(() => go(hash), 1400); },
  };
}

// Where an element sits in the page, ignoring transforms (the sections below are moved by them).
export function layoutTop(el) { let t = 0; for (let n = el; n; n = n.offsetParent) t += n.offsetTop; return t; }

// Each section rises into place as it scrolls in from the bottom, and settles back as it leaves the top.
// Drives --in and --out on every .sec (the transform itself lives in style.css), and only writes when a value moves.
function sectionMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const secs = [...document.querySelectorAll('.sec')].map((el) => ({ el, top: 0, h: 0, i: -1, o: -1 }));
  const measure = () => { for (const s of secs) { s.top = layoutTop(s.el); s.h = s.el.offsetHeight; } };
  measure();
  addEventListener('resize', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(document.body);
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const tick = () => {
    const vh = innerHeight, y = scrollY;
    for (const s of secs) {
      const top = s.top - y, bottom = top + s.h;
      const i = Math.round((1 - Math.pow(1 - clamp((vh * 0.98 - top) / (vh * 0.62)), 3)) * 1000) / 1000;
      const o = Math.round(clamp((vh * 0.32 - bottom) / (vh * 0.5)) * 1000) / 1000;
      if (i !== s.i) { s.el.style.setProperty('--in', i); s.i = i; }
      if (o !== s.o) { s.el.style.setProperty('--out', o); s.o = o; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// On a mouse or trackpad, a soft light follows the pointer across whichever card it's over.
function cardGlow() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let card = null;
  addEventListener('pointermove', (e) => {
    const c = e.target.closest && e.target.closest('.card');
    if (c !== card) card = c;
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${(e.clientX - r.left).toFixed(0)}px`);
    card.style.setProperty('--my', `${(e.clientY - r.top).toFixed(0)}px`);
  }, { passive: true });
}

// For anyone who opens the console.
function hello() {
  console.log(
    '%cHello, curious one.%c\nNo framework, no build step: three.js, a few shaders and a lot of stars, on code from Armaan Sidhu\'s site.\nSay hi: owen.lavender.02@gmail.com',
    'font: 400 16px Georgia, serif; color: #b9c9a5;',
    'font: 12px ui-monospace, Menlo, Consolas, monospace; color: #9dab94;',
  );
}

// Latest posts from the blog's RSS feed. The feed is text from elsewhere, so it only ever lands in textContent and
// https links. Rendered again in the new language when the visitor switches.
async function loadEssays() {
  const box = document.getElementById('essays');
  if (!box) return;
  let items;
  try {
    const res = await fetch(FEED);
    if (!res.ok) return;
    const xml = new DOMParser().parseFromString(await res.text(), 'application/xml');
    if (xml.querySelector('parsererror')) return;
    const field = (it, name) => (it.querySelector(name) || {}).textContent || '';
    items = [...xml.querySelectorAll('item')]
      .map((it) => ({ title: field(it, 'title'), link: field(it, 'link'), description: field(it, 'description'), pubDate: field(it, 'pubDate') }))
      .sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0))
      .slice(0, 5);
    if (!items.length) return;
  } catch (e) { return; }
  renderEssays(box, items);
  onLangChange(() => renderEssays(box, items));
}

function renderEssays(box, items) {
  const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === 'https:' ? x.href : null; } catch (e) { return null; } };
  const toText = (html) => (new DOMParser().parseFromString(html || '', 'text/html').body.textContent || '').replace(/\s+/g, ' ').trim();
  // RSS dates are RFC 822 ("Mon, 15 Jan 2024 00:00:00 GMT"), which every browser parses; shown as the UTC day they were published
  const fmt = (d) => { const when = new Date(d); return isNaN(when) ? '' : when.toLocaleDateString(locale(), { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase(); };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  const frag = document.createDocumentFragment();
  for (const it of items) {
    const href = safeUrl(it.link);
    if (!href) continue;
    const a = el('a', 'essay card in');
    a.href = href; a.rel = 'noopener';
    const thumb = safeUrl(it.thumbnail);
    if (thumb) { const img = el('img', 'thumb'); img.src = thumb; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 600; img.height = 338; a.append(img); }
    a.append(el('p', 'mono', [t('BLOG'), fmt(it.pubDate)].filter(Boolean).join(' · ')), el('h4', null, toText(it.title) || t('Untitled')));
    const ex = toText(it.description).slice(0, 180);
    if (ex) a.append(el('p', 'ex', ex));
    a.append(el('p', 'go', t('Read the post ↗')));
    frag.append(a);
  }
  if (!frag.childNodes.length) return;
  const more = el('a', 'essay card more in');
  more.href = BLOG; more.rel = 'noopener';
  more.append(el('p', 'mono', t('ARCHIVE')), el('h4', null, t('Every post on the blog')), el('p', 'go', t('All posts ↗')));
  frag.append(more);
  box.replaceChildren(frag);
}
