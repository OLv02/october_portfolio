// The page palette, read once from the CSS custom properties in style.css so the scene and the page share one source.
// Colours that also live outside style.css (keep them in step by hand):
//   index.html  <meta name="theme-color"> and the inline <style>html{background}</style> (its hash is in _headers)
//   404.html    its own inline styles
//   assets/icons/favicon.svg
const css = getComputedStyle(document.documentElement);
const rgb = (name, fallback) => {
  const v = css.getPropertyValue(name).trim();
  const parts = (v || fallback).split(',').map((x) => +x / 255);
  return parts.length === 3 && parts.every((x) => isFinite(x)) ? parts : fallback.split(',').map((x) => +x / 255);
};
const hex = (c) => (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);

export const THEME = {
  bg: rgb('--bg-rgb', '4, 6, 12'),
};
export const bgHex = hex(THEME.bg);
