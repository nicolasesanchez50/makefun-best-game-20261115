// LANTERN TIDE -- every number the game is tuned by lives here: the view, the dusk palette, the
// three phase table, and the forces behind the kite, the gusts, the storms, the strain line and
// the score. render.js reads the palette and the view; sim.js reads the rest, so a change to the
// feel of the game is a change to this file alone.

export const VIEW = { w: 1280, h: 720 };

// The waterline in view space. The kite flies in the sky above it, the boat floats below it.
export const HORIZON = 430;
export const BOAT_Y = 616;
export const SUN = { x: 872, y: 394, r: 64 };

export const PALETTE = {
  skyTop: '#070b1e',
  skyUpper: '#1c1738',
  skyMid: '#4b2551',
  skyWarm: '#a63f56',
  skyGlow: '#ef7a45',
  skyLow: '#ffc079',
  sunCore: '#fff7dc',
  sunMid: '#ffe2a2',
  sunHalo: '#ff9646',
  seaTop: '#6a3f62',
  seaMid: '#2a2748',
  seaDeep: '#070b19',
  foam: '#ffd6a4',
  islandFar: '#553a61',
  islandMid: '#2f1e42',
  islandNear: '#120c1e',
  amber: '#ffc46b',
  ember: '#ff7a3c',
  lantern: '#ffdf9a',
  aqua: '#a8f4e2',
  aquaDeep: '#43c9b6',
  stormInk: '#150c26',
  stormLip: '#8a5bd6',
  cream: '#fff2d6',
  gold: '#ffcf7d',
  ink: '#05070f',
  danger: '#ff4f5e',
};

// Three dusk phases. Each is shorter and windier than the last: the squall closes in faster,
// storms arrive more often and the lantern needs more lift to fill.
export const PHASES = [
  {
    name: 'DUSK I',
    roman: 'I',
    target: 100,
    time: 62,
    wind: 1.0,
    gustEvery: 2.15,
    stormEvery: 8.0,
    mult: 1,
    tint: '#ffbd6b',
    note: 'A light breeze off the islands',
  },
  {
    name: 'DUSK II',
    roman: 'II',
    target: 132,
    time: 54,
    wind: 1.16,
    gustEvery: 1.85,
    stormEvery: 6.0,
    mult: 2,
    tint: '#ff9670',
    note: 'The wind turns, the sea gets loud',
  },
  {
    name: 'DUSK III',
    roman: 'III',
    target: 165,
    time: 46,
    wind: 1.34,
    gustEvery: 1.6,
    stormEvery: 4.6,
    mult: 3,
    tint: '#c98cff',
    note: 'The squall is here. Fly anyway',
  },
];

// Kite and tether. Tension pulls the kite up; gravity and drag bring it back down.
export const KITE = {
  minAlt: 68,
  maxAlt: 398,
  lift: 382,
  weight: 238,
  drag: 1.15,
  tensionUp: 2.7,
  tensionDown: 1.9,
  follow: 2.6,
  lead: 92,
  gustKick: 108,
  driftAmp: 22,
  trailEvery: 3,
  trailMax: 64,
};

// The line. Strain climbs with tension and with height; a slack line cools off.
export const STRAIN = {
  start: 18,
  max: 100,
  tension: 4.4,
  altitude: 0.03,
  altitudeFrom: 240,
  storm: 17,
  cool: 2.9,
  gust: 1.6,
  snapReset: 30,
  invuln: 1.6,
};

export const GUST = {
  radiusMin: 30,
  radiusMax: 54,
  riseMin: 44,
  riseMax: 78,
  drift: 26,
  maxAlive: 12,
  liftBase: 6,
  liftPerRadius: 0.16,
  comboWindow: 3.2,
  comboMax: 5,
};

export const STORM = {
  radiusMin: 56,
  radiusMax: 104,
  altMin: 168,
  altMax: 372,
  drift: 30,
  life: 11.5,
  maxAlive: 8,
  drain: 6.5,
  pull: 210,
  hitScale: 0.82,
};

export const BOAT = {
  accel: 640,
  // Fraction of the boat's speed kept each second: 0.12 gives a quick reach and a soft glide.
  drag: 0.12,
  maxSpeed: 268,
  limit: 1600,
  steerLean: 0.16,
};

export const SCORE = {
  // Big numbers read as an arcade score without hiding the maths: lift units x 20, multiplied by
  // the chain and the dusk, plus bonuses for lanterns kept and seconds left on the clock.
  perLift: 20,
  phaseBonusLantern: 200,
  phaseBonusSecond: 30,
  victoryLantern: 1500,
};

export const STEP = 1 / 60;

export const FONT_STACK = '"Lato Black", "Lato", "DejaVu Sans", system-ui, sans-serif';
export const BODY_STACK = '"Lato", "DejaVu Sans", system-ui, sans-serif';

export const STORAGE_KEY = 'lantern-tide.best';
