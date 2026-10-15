# October portfolio

Owen Lavender's portfolio: a one-page site where a globe drawn in stars, with Ottawa marked, turns into a flight
as you scroll. The camera dives into Ottawa, flies a tunnel under About, Work and Highlights, passes through a sun,
and opens a vault that the rest of the page scrolls over. English, French and German.

Live at **https://olv02.github.io/october_portfolio/** once GitHub Pages is turned on (see below).

## Credit

Based on [Armaan Sidhu's site](https://realarmaansidhu.com/), used with permission.
The globe, content, languages and blog feed are new. Libraries: [three.js](https://github.com/mrdoob/three.js) r169
and [Lenis](https://github.com/darkroomengineering/lenis) 1.1.13 (both MIT, in `js/vendor/`). Coastlines: Natural
Earth via [world-atlas](https://github.com/topojson/world-atlas) (ISC, `tools/data/`).

## Running it locally

No build step, just files. From the repository root:

```sh
python3 tools/serve.py        # http://localhost:8642
```

`serve.py` turns caching off and applies the security headers in `_headers`, so they're tested locally too.
Useful URL flags: `?static` (the plain fallback page), `?lang=fr` / `?lang=de`, `?tier=low|med|high`,
`?debug` (shows the quality tier), `?shot&p=0.5` (a still frame at that point in the flight, for screenshots).

## Where things are

| What | Where |
| --- | --- |
| Page text | `index.html` |
| French and German | `js/i18n.js`: one row per English string, `[English, French, German]` |
| Styles | `style.css` |
| The flight (scroll → camera, every act) | `js/main.js` |
| The globe image | `assets/globe.png`, built by `tools/build-globe.py` (writes `js/globe-meta.js` too) |
| Stars → tunnel → vault | `js/build-data.js` (where each star goes) and `js/particles.js` (the shader) |
| Screen-size framing | `js/layout.js` |
| Latest blog posts | `js/site.js` reads `https://olv02.github.io/rss.xml` (the Astro blog in `OLv02.github.io`) |
| Sound | `js/audio.js` (synthesized, no audio files) |

### Changing the globe

Edit `CENTER` (where the globe faces) or `OTTAWA` in `tools/build-globe.py`, then:

```sh
pip install numpy pillow
python3 tools/build-globe.py
```

### Adding a highlight (a mission, a delegation)

Copy a `<figure class="highlight card reveal">` block in the Highlights section of `index.html`. A photo is optional:
put an `<img>` first inside the figure (16:10 works best; it's cropped to that). Add the new English strings to
`js/i18n.js` with their French and German versions. `window.__i18n.missing('fr')` in the browser console lists any
string that still needs one.

## Publishing

`.github/workflows/deploy.yml` publishes every push to `main`. One-time setup: in the repository's
**Settings → Pages**, set **Source** to **GitHub Actions**.
