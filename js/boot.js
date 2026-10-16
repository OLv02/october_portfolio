// Runs first, before anything else on the page.
// The 3D flight needs WebGL and modern JavaScript. When either is missing, or the scene fails to start,
// the page falls back to its plain version: the loader steps aside and the content sits on a quiet forest green.
// Without JavaScript at all, the stylesheet shows that plain version on its own.
(function () {
  var root = document.documentElement;
  root.classList.add('js', 'locked');

  // Which language to open in: a ?lang= link, else the one the visitor picked before, else the first of their
  // device's languages that the site speaks, else English. js/i18n.js applies it; until then the text stays hidden
  // so nobody sees the English flash past first.
  var SPOKEN = { en: 1, fr: 1, de: 1 };
  var pick = function (tag) { var p = String(tag || '').toLowerCase().split(/[^a-z]/)[0]; return SPOKEN[p] ? p : null; };
  var lang = pick((location.search.match(/[?&]lang=([a-zA-Z-]+)/) || [])[1]);
  if (!lang) { try { lang = pick(localStorage.getItem('site.lang')); } catch (e) { /* storage blocked */ } }
  if (!lang) {
    var device = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < device.length && !lang; i++) lang = pick(device[i]);
  }
  window.__siteLang = lang || 'en';
  if (window.__siteLang !== 'en') {
    root.classList.add('i18n-wait');
    setTimeout(function () { root.classList.remove('i18n-wait'); }, 4000);
  }

  var done = false;
  function fallback(why) {
    if (done) return;
    done = true;
    window.__siteStatic = true;
    var apply = function () {
      root.classList.remove('locked');
      root.classList.add('static');
      // a minimal menu, unless the full one in site.js is already running
      var btn = document.getElementById('menu-btn'), menu = document.getElementById('menu');
      if (btn && menu && !window.__siteMenu) {
        var set = function (open) {
          menu.classList.toggle('open', open);
          menu.setAttribute('aria-hidden', String(!open));
          btn.setAttribute('aria-expanded', String(open));
          root.classList.toggle('menu-open', open);
        };
        btn.addEventListener('click', function () { set(!menu.classList.contains('open')); });
        menu.addEventListener('click', function (e) { if (e.target === menu || (e.target.closest && e.target.closest('a'))) set(false); });
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
    if (window.console) console.info('Showing the page without the 3D scene (' + why + ').');
  }
  window.__siteFallback = fallback;

  if (/[?&]static(=|&|$)/.test(location.search)) return fallback('asked for in the URL');
  if (!('noModule' in HTMLScriptElement.prototype)) return fallback('this browser is too old for the scene');
  var gl = null;
  try { var c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { gl = null; }
  if (!gl) return fallback('WebGL is not available');
  var lose = gl.getExtension('WEBGL_lose_context');
  if (lose) lose.loseContext();   // the scene makes its own context; don't hold on to this one

  // A script error before the visitor is in, or a scene that never starts, also means plan B.
  var early = function (msg) { if (!window.__siteEntered) fallback(msg); };
  window.addEventListener('error', function (e) { if (e.filename && /\/js\//.test(e.filename)) early('a script failed: ' + e.message); });
  window.addEventListener('unhandledrejection', function () { early('a script failed while loading'); });
  setTimeout(function () { if (!window.__siteLive) fallback('the scene took too long to load'); }, 30000);
})();
