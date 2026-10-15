"""Builds the globe asset: one small PNG the browser samples at runtime, in the same format the portrait used.

Channels:  R = luminance   G = sqrt-encoded sampling weight   B = soft disc mask (keeps the sky from showing through)
The globe is drawn in orthographic projection, turned so Ottawa sits up and to the left of centre with Europe on the
right. Ottawa is the "eye": the camera dives into it and the tunnel starts there.
Land: Natural Earth via world-atlas (tools/data, ISC licence). Run: python3 tools/build-globe.py
"""
import json, math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
LAND = os.path.join(HERE, 'data', 'land-50m.json')
OUT_PNG = os.path.join(HERE, '..', 'assets', 'globe.png')
OUT_META = os.path.join(HERE, '..', 'js', 'globe-meta.js')

CENTER = (28.0, -42.0)        # lat, lon the globe faces
OTTAWA = (45.4215, -75.6972)  # lat, lon
D = 900                       # globe diameter in pixels
PAD = 14
GRAT = 15                     # graticule spacing, degrees

# ---------- land mask, rasterized once on an equirectangular grid ----------
def land_mask(w=8192, h=4096):
    t = json.load(open(LAND))
    sx, sy = t['transform']['scale']; tx, ty = t['transform']['translate']
    arcs = []
    for arc in t['arcs']:
        x = y = 0; pts = []
        for dx, dy in arc:
            x += dx; y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)
    def ring(ids):
        out = []
        for i in ids:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts if not out else pts[1:])
        return out
    img = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(img)
    to_px = lambda p: ((p[0] + 180) / 360 * w, (90 - p[1]) / 180 * h)
    for g in t['objects']['land']['geometries']:
        polys = g['arcs'] if g['type'] == 'MultiPolygon' else [g['arcs']]
        for poly in polys:
            for k, r in enumerate(poly):
                d.polygon([to_px(p) for p in ring(r)], fill=255 if k == 0 else 0)
    # the data leaves a few hairline slivers (a dotted row of specks across the South Atlantic); no real land is that thin
    img = img.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    return np.asarray(img, dtype=np.float32) / 255.0

mask_eq = land_mask()
MH, MW = mask_eq.shape

# ---------- orthographic globe ----------
S = D + 2 * PAD
R = D / 2
c = S / 2
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
nx, ny = (xx + 0.5 - c) / R, -(yy + 0.5 - c) / R
rho2 = nx * nx + ny * ny
inside = rho2 <= 1
mu = np.sqrt(np.clip(1 - rho2, 0, 1))         # facing the viewer: 1 at the centre, 0 at the rim

lat0, lon0 = map(math.radians, CENTER)
lat = np.arcsin(np.clip(mu * math.sin(lat0) + ny * math.cos(lat0), -1, 1))
lon = lon0 + np.arctan2(nx, mu * math.cos(lat0) - ny * math.sin(lat0))
latd, lond = np.degrees(lat), (np.degrees(lon) + 540) % 360 - 180

land = mask_eq[np.clip(((90 - latd) / 180 * MH).astype(int), 0, MH - 1), np.clip(((lond + 180) / 360 * MW).astype(int), 0, MW - 1)]
land = np.asarray(Image.fromarray((land * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255 * inside
gy, gx = np.gradient(land)
coast = np.clip(np.sqrt(gx * gx + gy * gy) * 3, 0, 1)

# graticule: thin lines every GRAT degrees, thinned toward the rim so they don't crowd there
def near_line(v, step, width):
    f = np.abs(((v + step / 2) % step) - step / 2)
    return np.clip(1 - f / width, 0, 1)
lw = 0.35 / np.maximum(mu, 0.15)
grat = np.maximum(near_line(latd, GRAT, lw), near_line(lond, GRAT, lw / np.maximum(np.cos(lat), 0.2))) * inside * (1 - land)

rim = np.exp(-((1 - np.sqrt(rho2)) / 0.012) ** 2) * inside

# Ottawa: a bright point with a thin ring around it
def project(la, lo):
    la, lo = math.radians(la), math.radians(lo)
    x = math.cos(la) * math.sin(lo - lon0)
    y = math.cos(lat0) * math.sin(la) - math.sin(lat0) * math.cos(la) * math.cos(lo - lon0)
    return x, y
ox, oy = project(*OTTAWA)
opx, opy = c + ox * R, c - oy * R
dO = np.hypot(xx - opx, yy - opy)
pin = np.exp(-(dO / 5.0) ** 2)
halo = np.exp(-((dO - 17) / 2.2) ** 2) * 0.8

shade = 0.3 + 0.7 * mu                          # limb darkening, so the edge doesn't pile up once seen side-on
noise = np.random.default_rng(3).random((S, S)).astype(np.float32)
lum = (0.16 + 0.66 * land * (0.85 + 0.15 * noise) + 0.18 * coast + 0.14 * grat) * shade + 0.1 * rim
lum = np.maximum(lum, np.maximum(pin, halo))
lum = np.clip(lum * inside + pin, 0, 1)

# near the rim the sphere squeezes a lot of surface into few pixels, so thin the points out there or the edge blows out
w = (0.05 * inside * (1 - land) + land * (0.08 + 0.92 * mu ** 2) + 1.4 * coast * mu + 0.5 * grat + 0.2 * rim) * inside
w = w + 14.0 * pin + 5.0 * halo

disc = Image.fromarray((inside * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
soft = np.asarray(disc, dtype=np.float32) / 255

wenc = np.sqrt(w / w.max())
rgb = np.stack([lum * 255, wenc * 255, soft * 255], axis=-1).clip(0, 255).round().astype(np.uint8)
os.makedirs(os.path.dirname(OUT_PNG), exist_ok=True)
Image.fromarray(rgb, 'RGB').save(OUT_PNG, optimize=True)

sc = 1.0 / R   # one local unit = the globe's radius
ottawa = [round(ox, 4), round(oy, 4)]
meta = {
    'width': S, 'height': S, 'cx': c, 'cy': c, 'scale': round(sc, 6),
    'eye': ottawa,                               # where the camera dives in
    'globe': 1.0,                                # points sit on a sphere of this radius (local units)
    'frame': [0.0, 0.0, 1.06, 1.06],             # the box (centre x, y, half sizes) that must stay in frame on the landing screen
    'bboxLocal': [round(-c * sc, 3), round(-c * sc, 3), round(c * sc, 3), round(c * sc, 3)],
}
with open(OUT_META, 'w') as f:
    f.write('// generated by tools/build-globe.py\nexport const GLOBE = ' + json.dumps(meta) + ';\n')
print(json.dumps(meta), os.path.getsize(OUT_PNG), 'bytes')
