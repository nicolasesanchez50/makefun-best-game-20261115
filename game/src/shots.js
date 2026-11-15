// Deterministic staging for the four screenshots. ?shot=start|play|squall|end builds the world a
// fixed number of simulated steps from the URL's seed, then places the kite, the pockets, the
// cells, the gauge and the score exactly where the frame needs them. No Math.random, no wall
// clock: the same URL always paints the same image, which is what makes the shots repeatable.

import { beginRun, startPhase, updateWorld, updateTitle, addGust, addStorm, placeKite, seedTrail, endRun } from './sim.js';

const SHOTS = ['start', 'play', 'squall', 'end'];

export function isShot(name) {
  return typeof name === 'string' && SHOTS.includes(name);
}

export function applyShot(world, name) {
  if (name === 'start') stageStart(world);
  else if (name === 'play') stagePlay(world);
  else if (name === 'squall') stageSquall(world);
  else if (name === 'end') stageEnd(world);
  world.shot = name;
}

// The poster: the title over a living dusk, the kite high on the right, pockets rising past it.
function stageStart(world) {
  world.screen = 'title';
  world.paused = false;
  world.camOffset = 0;
  world.best = 31280;
  for (let i = 0; i < 340; i += 1) updateTitle(world, 1 / 60);

  world.t = 15.4;
  world.boat.x = 0;
  world.boat.vx = 0;
  world.boat.steer = 0;
  world.camX = 0;
  world.kite.x = 470;
  world.kite.alt = 306;
  world.kite.vy = 18;
  world.tension = 0.56;
  seedTrail(world, 58, 1);

  world.gusts = [];
  const pockets = [
    { x: 300, alt: 268, r: 45 },
    { x: 470, alt: 148, r: 33 },
    { x: 205, alt: 360, r: 29 },
    { x: 560, alt: 330, r: 38 },
  ];
  for (const pocket of pockets) {
    const gust = addGust(world, pocket.x, pocket.alt, pocket.r);
    gust.life = 1.6;
  }
  world.storms = [];
  world.sparks = [];
  world.floaters = [];
}

// A clean mid-run frame: three lanterns, a healthy chain and the first storm on the horizon.
function stagePlay(world) {
  beginRun(world);
  world.gustTimer = 99;
  world.stormTimer = 99;
  for (let i = 0; i < 96; i += 1) updateWorld(world, 1 / 60, { pull: i % 42 < 26, steer: 0 });

  world.phase = 0;
  world.timeLeft = 33.4;
  world.gauge = 64;
  world.score = 2940;
  world.strain = 41;
  world.lanterns = 3;
  world.best = 31280;
  world.combo = 3;
  world.comboTimer = 2.3;
  world.t = 16.2;
  world.boat.x = 0;
  world.boat.vx = 34;
  world.boat.steer = 0.35;
  world.camX = 0;
  placeKite(world, 300, 88);
  world.kite.vy = 26;
  world.gusts = [];
  world.storms = [];
  world.sparks = [];
  world.floaters = [];

  const pockets = [
    { x: 262, alt: 318, r: 44 },
    { x: -300, alt: 232, r: 36 },
    { x: 520, alt: 158, r: 48 },
    { x: -86, alt: 372, r: 28 },
  ];
  for (const pocket of pockets) {
    const gust = addGust(world, pocket.x, pocket.alt, pocket.r);
    gust.life = 1.4;
  }

  const left = addStorm(world, -430, 226, 66, 30);
  left.life = 3.4;
  const right = addStorm(world, 700, 300, 80, 30);
  right.life = 2.6;

  world.floaters.push({ x: 262, alt: 344, text: '+780', life: 1.2, max: 1.4, color: '#ffe9b4', size: 26 });
  seedTrail(world, 60, 1);
}

// The squall frame: the last dusk, four cells closing in, the line near its limit.
function stageSquall(world) {
  beginRun(world);
  startPhase(world, 2);
  world.gustTimer = 99;
  world.stormTimer = 99;
  for (let i = 0; i < 110; i += 1) updateWorld(world, 1 / 60, { pull: i % 54 < 30, steer: -0.2 });

  world.timeLeft = 12.4;
  world.gauge = 148;
  world.score = 21860;
  world.strain = 78;
  world.lanterns = 2;
  world.combo = 4;
  world.comboTimer = 2.4;
  world.best = 31280;
  world.t = 24.6;
  world.boat.x = 0;
  world.boat.vx = -18;
  world.boat.steer = -0.45;
  world.camX = 0;
  placeKite(world, 292, -62);
  world.kite.vy = 44;
  world.gusts = [];
  world.storms = [];
  world.sparks = [];
  world.floaters = [];

  const pockets = [
    { x: 236, alt: 252, r: 38 },
    { x: -250, alt: 176, r: 32 },
  ];
  for (const pocket of pockets) {
    const gust = addGust(world, pocket.x, pocket.alt, pocket.r);
    gust.life = 1.3;
  }

  const cells = [
    { x: -480, alt: 240, r: 92 },
    { x: 290, alt: 310, r: 86 },
    { x: 540, alt: 180, r: 100 },
    { x: -140, alt: 130, r: 70 },
  ];
  for (const cell of cells) {
    const storm = addStorm(world, cell.x, cell.alt, cell.r, 30);
    storm.life = 3.6;
  }

  seedTrail(world, 64, 1);
}

// The results screen: a run that ended in the squall, with a plausible score and a best to beat.
function stageEnd(world) {
  world.best = 31280;
  beginRun(world);
  startPhase(world, 2);
  for (let i = 0; i < 80; i += 1) updateWorld(world, 1 / 60, { pull: false, steer: 0 });

  world.score = 26410;
  world.stats = { lift: 486, gusted: 31, phases: 2, snaps: 3, kept: 0 };
  world.lanterns = 0;
  world.t = 31.8;
  world.boat.x = 0;
  world.boat.vx = -10;
  world.camX = 0;
  placeKite(world, 132, -156);
  world.kite.vy = -40;
  world.gusts = [];
  world.storms = [];
  world.sparks = [];
  world.floaters = [];
  const storm = addStorm(world, -300, 320, 98, 30);
  storm.life = 4;
  const far = addStorm(world, 430, 260, 74, 30);
  far.life = 3;
  seedTrail(world, 46, 1);
  endRun(world, 'squall');
  world.best = 31280;
  world.newBest = false;
}
