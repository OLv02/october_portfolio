// Every tunable number of the scene, in one place. These are the committed defaults: the hidden ?tune panel
// (js/tune.js) edits a live copy and can export it as JSON, but nothing a visitor changes is ever written back here.
//
// Values come from the Windborne handoff (proof v22, 16 Oct 2026). "Selected" values were chosen by Owen on a phone
// and a desktop; "proposed" values are starting points that still need a look in the real page.

// Seed look, per device profile. The mobile profile is used on a phone, or on any screen 600px wide or less.
export const PROFILES = {
  mobile: { windSpeed: 0.3, seeds: 3600, seedSize: 1.4, playfulness: 1.4 },    // selected
  desktop: { windSpeed: 0.4, seeds: 3600, seedSize: 2.0, playfulness: 1.5 },   // selected
};
export const profileFor = ({ phone, width }) => (phone || width <= 600 ? 'mobile' : 'desktop');

export const CONFIG = {
  look: {                       // selected, shared by both profiles
    backgroundBrightness: 2.5,  // gain of the free seeds in the wind
    pointStrength: 0.3,         // the four small points on each seed's filaments; 0 skips drawing them
    titleBrightness: 1.6,       // saved for the optional particle name; not used in the story
    titleWhiteness: 0,
    font: 'fraunces',           // the heading face (17 Oct): 'fraunces', or 'georgia' (the original)
  },
  globe: {
    mode: 'coast',              // selected: 'coast' (compact + coast), 'compact', or 'current'
    brightness: 1.6,
    opening: 'blow',            // selected 16 Oct: 'blow' = one breath from the right blows the globe away (right side and rim first, a left clump around Ottawa last) while the camera dives slightly into Ottawa; 'part' = the seeds part around Ottawa (original)
    blowDive: 0.35,             // selected: how far the camera dives into Ottawa during the blow (0 drift in late .. 1 full original dive)
    ottawaLast: true,           // selected: Ottawa's seeds are the last to let go
    aperture: 1,                // selected 1.0: breath strength when blown; how far the seeds part around Ottawa when parting
    compactScale: 0.38,         // sprite size on the globe
    coastShare: 3 / 7,          // share of seeds given an alternate spot on a coastline
    bank: false,
  },
  plant: {                      // the approved ivory daisy (proof v27, "This daisy is perfect")
    ending: false,              // in the back pocket: true puts the warm light, the landings and the daisy back at the foot of
                                // the page, past Let's talk (?daisy previews it)
    variant: 'pair',            // one opposing pair of the original leaves on a short stem; 'original' = six-leaf reference
    brightness: 1.2,
    sway: 1.1,
    showRoots: true,
    scale: 3.6,                 // world units from soil to flower (proposed; production framing)
  },
  landing: {                    // proposed
    light: 0.85,                // warm light strength
    spread: 1,                  // how far apart the three landing seeds settle
    roles: [0, 7, 19],          // parents that visibly land
    plantRight: 0.18,           // on wide screens the plant sits right of centre by this share of the view
  },
  flight: {                     // proposed; the camera itself follows the page scroll
    halfHeight: 18,             // the field's cross-section: [max(minHalfWidth, halfHeight * aspect), halfHeight]
    minHalfWidth: 10,
    motionEase: 0.12,           // seconds; how quickly "moving" settles once the page stops
    motionSpeed: 4,             // world units per second that count as fully moving
  },
  structure: {                  // not sliders: allocation and the size of what the worker builds
    capacity: 8000,             // parents built once; the profile count is a prefix of these
    pointsPerSeed: 4,
  },
  render: {                     // proposed: compensation for this engine's tone curve and bloom, which the proof didn't have
    globeGain: 1.5,             // extra gain on the globe's seeds
    occluder: 0.55,             // how strongly the soft disc behind the globe hides the canopy light
    companionGain: 1.3,         // extra gain on the formed companions, for the same tone curve (their own brightness stays as approved)
    companionScale: 1.2,        // every companion 20% bigger on its stage (17 Oct); their own sizes stay as approved
  },
  // The section companions (approved objects and settings from the through-fern package), built from the background
  // seeds themselves; size scales the object on its stage (.companion-slot in style.css).
  companions: {
    bridge: { brightness: 1.2, size: 1 },                 // Work: Little bridge, 60% span, four posts a side, no heart
    seedling: { brightness: 0.9, size: 0.85, light: 1.8 },// Highlights: spotlit seedling, rest pose .82
    compass: { brightness: 1.2, size: 0.7 },              // Leadership: tabletop compass
    quill: { brightness: 0.5, size: 0.85 },               // Writing: quill with one ink trail
    fern: { brightness: 0.8, size: 0.85 },                // Education: unfurling fern
    laurel: { brightness: 1.1, size: 0.85 },              // Awards: open laurel, mirrored, rooted growth (v52)
    envelope: { brightness: 1, size: 0.9 },               // Let's talk: open envelope, sprout curving right (v52, in review)
  },
  // the daisy now finishes at the foot of the page, so this step-back only applies if content is ever added after it
  after: { pullBack: 0.5, shiftRight: 0.2, shiftDown: 0.12 },
  // the light and landing sequence runs over this part of the page's flight progress
  segments: { dive: [0.05, 0.25], landing: [0.66, 1] },
};

// Tier caps on the number of parents, so a struggling phone draws fewer seeds rather than dropping frames.
export const TIER_SEEDS = { high: 8000, med: 6000, low: 3600 };

// Slider ranges for the ?tune panel: [min, max, step]
export const RANGES = {
  windSpeed: [0, 2.5, 0.05], seeds: [500, 8000, 100], seedSize: [0.5, 2, 0.05], playfulness: [0, 2, 0.05],
  'look.backgroundBrightness': [0, 10, 0.1], 'look.pointStrength': [0, 2, 0.1],
  'globe.brightness': [0.3, 8, 0.1], 'globe.aperture': [0, 2, 0.1], 'globe.blowDive': [0, 1, 0.05], 'globe.compactScale': [0.25, 0.7, 0.01],
  'plant.brightness': [0.3, 3, 0.1], 'plant.sway': [0, 2, 0.05], 'plant.scale': [2, 6, 0.1],
  'landing.light': [0, 2, 0.05], 'landing.spread': [0.25, 2, 0.05], 'landing.plantRight': [0, 0.3, 0.01],
  'companions.bridge.size': [0.3, 2, 0.05], 'companions.seedling.size': [0.3, 2, 0.05], 'companions.seedling.light': [0, 4, 0.1],
  'companions.compass.size': [0.3, 2, 0.05], 'companions.quill.size': [0.3, 2, 0.05], 'companions.fern.size': [0.3, 2, 0.05],
  'companions.laurel.size': [0.3, 2, 0.05], 'companions.envelope.size': [0.3, 2, 0.05],
  'after.pullBack': [0, 1.5, 0.05], 'after.shiftRight': [-0.3, 0.4, 0.01], 'after.shiftDown': [-0.2, 0.4, 0.01],
  'render.globeGain': [0.5, 4, 0.05], 'render.occluder': [0, 1, 0.05], 'render.companionGain': [0.5, 3, 0.05], 'render.companionScale': [0.5, 2, 0.05],
  'flight.halfHeight': [8, 30, 0.5], 'flight.minHalfWidth': [6, 20, 0.5], 'flight.motionEase': [0.02, 0.5, 0.01],
};
