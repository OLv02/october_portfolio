# October portfolio

Owen Lavender's portfolio ("Windborne"): a one-page site where a globe made of dandelion seeds, with Ottawa marked,
turns into a flight as you scroll. A breath from the right blows the globe away, leaving a clump around Ottawa for last, while
the camera dives gently into Ottawa; then it follows the wind through the seeds under About through Let's talk (with a
seed-made companion beside Work, Highlights, Leadership, Writing, Education, Awards and Let's talk). The light, landing and daisy ending is kept in
the back pocket: off by default (`plant.ending` in `js/config.js`), previewable with `?daisy`. English, French and German.

Live at **https://olv02.github.io/october_portfolio/** once GitHub Pages is turned on (see below).

## Credit

The site code is adapted from [Armaan Sidhu's](https://realarmaansidhu.com/) personal site, used with permission.
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
`?debug` (shows the quality tier), `?shot&p=0.5` (a still frame at that point in the flight, for screenshots),
`?tune` (the hidden tuning panel: live sliders for every scene setting, with Copy/Export JSON),
`?shot&sec=writing&y=.4` (a still with that section's heading at 40% of the screen, for the companions).

## Where things are

| What | Where |
| --- | --- |
| Page text | `index.html` |
| French and German | `js/i18n.js`: one row per English string, `[English, French, German]` |
| Styles | `style.css` |
| The flight (scroll → camera, every act) | `js/main.js` |
| The globe image | `assets/globe.png`, built by `tools/build-globe.py` (writes `js/globe-meta.js` too) |
| Seeds → wind → daisy | `js/build-data.js` (where each seed goes) and `js/particles.js` (seed atlas and shaders) |
| Section companions (Work bridge, Highlights seedling, Leadership compass, Writing quill, Education fern, Awards laurel, Let's talk envelope) | `js/companion-data.js` (shapes, ported from the proof), `js/companion-shader.js` (the background seeds that build them), `js/companions.js` (scroll, staging, and the reserve that builds them after the landing), `.companion-slot` in `index.html`/`style.css` |
| Every tunable number | `js/config.js` (device profiles, globe, journey, landing, daisy); `?tune` edits a live copy |
| The forest air | `js/sky.js`; palette tokens in `style.css` `:root`, read by `js/theme.js` |
| Coastline weights | `assets/coast.png`, from the Windborne handoff (same projection as `globe.png`; no generator yet) |
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
