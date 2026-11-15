// The simulation: one boat, one kite on a tether, rising gust pockets, drifting storm cells and
// three dusk phases that end when the lantern is full. Everything here is plain state plus a
// fixed step, so the same seed and the same inputs always replay the same run. render.js draws
// this; nothing in this file touches a canvas, the DOM or the clock.

import { PHASES, KITE, STRAIN, GUST, STORM, BOAT, SCORE, HORIZON } from './config.js';
import { makeRng, clamp } from './random.js';

export function createWorld(seed) {
  const rng = makeRng(seed);
  return {
    seed,
    rng,
    screen: 'title',
    paused: false,
    t: 0,
    tick: 0,
    phase: 0,
    timeLeft: PHASES[0].time,
    gauge: 0,
    score: 0,
    best: 0,
    newBest: false,
    lanterns: 3,
    strain: STRAIN.start,
    combo: 1,
    comboTimer: 0,
    tension: 0.4,
    boat: { x: 0, vx: 0, tilt: 0, steer: 0 },
    kite: { x: 360, alt: 300, vy: 0, trail: [], flash: 0 },
    gusts: [],
    storms: [],
    sparks: [],
    floaters: [],
    camX: 0,
    camOffset: 0,
    windPhase: rng() * 6.283,
    wind: 0,
    gustTimer: 1.1,
    stormTimer: 6.0,
    clearTimer: 0,
    clearInfo: null,
    invuln: 0,
    shake: 0,
    flash: 0,
    endReason: 'snap',
    endPhase: 0,
    toast: '',
    toastTimer: 0,
    events: [],
    stats: { lift: 0, gusted: 0, phases: 0, snaps: 0, kept: 0 },
  };
}

export function beginRun(world) {
  world.screen = 'play';
  world.paused = false;
  world.score = 0;
  world.lanterns = 3;
  world.strain = STRAIN.start;
  world.combo = 1;
  world.comboTimer = 0;
  world.newBest = false;
  world.endReason = 'snap';
  world.endPhase = 0;
  world.flash = 0;
  world.shake = 0;
  world.invuln = 0;
  world.toast = '';
  world.toastTimer = 0;
  world.gusts = [];
  world.storms = [];
  world.sparks = [];
  world.floaters = [];
  world.boat.x = 0;
  world.boat.vx = 0;
  world.boat.tilt = 0;
  world.boat.steer = 0;
  world.camOffset = 0;
  world.camX = 0;
  world.stats = { lift: 0, gusted: 0, phases: 0, snaps: 0, kept: 0 };
  world.events.push({ type: 'start' });
  startPhase(world, 0);
}

export function startPhase(world, index) {
  const phase = PHASES[clamp(index, 0, PHASES.length - 1)];
  world.phase = index;
  world.timeLeft = phase.time;
  world.gauge = 0;
  world.clearTimer = 0;
  world.clearInfo = null;
  world.gusts = [];
  world.storms = [];
  world.gustTimer = 0.8;
  world.stormTimer = phase.stormEvery * 0.9;
  world.combo = 1;
  world.comboTimer = 0;
  resetKite(world);
  addGust(world, world.boat.x + 150, 130, 41);
}

function resetKite(world) {
  world.kite.x = world.boat.x;
  world.kite.alt = 292;
  world.kite.vy = 0;
  world.kite.trail = [];
  world.tension = 0.4;
}

// A gust pocket, a storm cell and a handful of sparks are the only things ever spawned; each has
// an explicit constructor so ?shot= can place one exactly where the staged frame needs it.
export function addGust(world, x, alt, radius) {
  const r = radius ?? world.rng.range(GUST.radiusMin, GUST.radiusMax);
  const gust = {
    x,
    alt,
    r,
    vy: world.rng.range(GUST.riseMin, GUST.riseMax),
    lift: Math.round(GUST.liftBase + r * GUST.liftPerRadius),
    life: 0,
    seed: world.rng() * 900,
    dead: false,
  };
  world.gusts.push(gust);
  return gust;
}

export function addStorm(world, x, alt, radius, ttl) {
  const storm = {
    x,
    alt,
    r: radius ?? world.rng.range(STORM.radiusMin, STORM.radiusMax),
    ttl: ttl ?? STORM.life,
    life: 0,
    spin: world.rng.range(0.55, 1.15) * world.rng.sign(),
    drift: world.rng.range(0.55, 1.15) * world.rng.sign(),
    seed: world.rng() * 900,
    flash: world.rng() * 3,
    dead: false,
  };
  world.storms.push(storm);
  return storm;
}

function spawnGust(world) {
  if (world.gusts.length >= GUST.maxAlive) return;
  addGust(world, world.camX + world.rng.range(-660, 660), -20);
}

function spawnStorm(world) {
  if (world.storms.length >= STORM.maxAlive) return;
  addStorm(
    world,
    world.camX + world.rng.range(-720, 720),
    world.rng.range(STORM.altMin, STORM.altMax),
    world.rng.range(STORM.radiusMin, STORM.radiusMax),
  );
}

export function burst(world, x, alt, count, kind) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const speed = world.rng.range(40, kind === 'snap' ? 300 : 170);
    world.sparks.push({
      x,
      alt,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: world.rng.range(0.4, kind === 'snap' ? 1.1 : 0.85),
      max: 1.1,
      size: world.rng.range(1.2, kind === 'clear' ? 4.4 : 3.2),
      kind,
      seed: world.rng() * 10,
    });
  }
}

// The kite's ribbon is a history of its own positions, sampled a little slower than the physics
// so it trails like cloth instead of sticking to the frame.
function pushTrail(world) {
  const trail = world.kite.trail;
  trail.push({ x: world.kite.x, alt: world.kite.alt });
  while (trail.length > KITE.trailMax) trail.shift();
}

export function seedTrail(world, count = 56, curl = 1) {
  const trail = [];
  const kx = world.kite.x;
  const kalt = world.kite.alt;
  for (let i = count; i >= 0; i -= 1) {
    const f = i / count;
    trail.push({
      x: kx - f * 156 * curl + Math.sin(f * 5.2 + world.t * 0.7) * 48 * f,
      alt: kalt - f * 88 + Math.cos(f * 4.1) * 42 * f,
    });
  }
  world.kite.trail = trail;
}

export function placeKite(world, alt, offsetX = 0) {
  world.kite.alt = alt;
  world.kite.x = world.boat.x + offsetX;
  world.kite.vy = 0;
}

export function snapLine(world, reason) {
  if (world.invuln > 0) return;
  world.lanterns -= 1;
  world.stats.snaps += 1;
  world.flash = 1;
  world.shake = 1;
  world.strain = STRAIN.snapReset;
  world.tension = 0;
  world.combo = 1;
  world.comboTimer = 0;
  world.kite.vy = -170;
  world.invuln = STRAIN.invuln;
  world.kite.flash = 1;
  burst(world, world.kite.x, world.kite.alt, 30, 'snap');
  world.events.push({ type: 'snap' });
  if (world.lanterns <= 0) {
    endRun(world, reason === 'squall' ? 'squall' : 'snap');
  } else if (reason === 'squall') {
    world.timeLeft = 20;
    world.events.push({ type: 'warn' });
  }
}

export function endRun(world, reason) {
  if (world.screen === 'over') return;
  world.screen = 'over';
  world.paused = false;
  world.endReason = reason;
  world.endPhase = world.phase;
  world.stats.kept = world.lanterns;
  if (reason === 'victory') {
    world.score += world.lanterns * SCORE.victoryLantern;
    burst(world, world.kite.x, world.kite.alt, 46, 'clear');
    world.events.push({ type: 'over', win: true });
  } else {
    world.events.push({ type: 'over', win: false });
  }
}

export function updateTitle(world, dt) {
  world.t += dt;
  world.tick += 1;
  world.windPhase += dt * 0.3;
  world.wind = Math.sin(world.windPhase * 1.3);
  world.boat.x = Math.sin(world.t * 0.11) * 60;
  world.boat.vx = Math.cos(world.t * 0.11) * 6.6;
  world.boat.tilt = Math.sin(world.t * 0.7) * 0.05;
  world.boat.steer = Math.sin(world.t * 0.21);
  world.camX = world.boat.x + world.camOffset;
  world.kite.x = world.boat.x + 470 + Math.sin(world.t * 0.5) * 34;
  world.kite.alt = 302 + Math.sin(world.t * 0.8) * 26;
  world.kite.vy = Math.cos(world.t * 0.8) * 21;
  world.tension = 0.52 + Math.sin(world.t * 0.55) * 0.14;
  if (world.tick % KITE.trailEvery === 0) pushTrail(world);

  world.gustTimer -= dt;
  if (world.gustTimer <= 0) {
    spawnGust(world);
    world.gustTimer = world.rng.range(1.3, 2.5);
  }
  for (let i = world.gusts.length - 1; i >= 0; i -= 1) {
    const gust = world.gusts[i];
    gust.life += dt;
    gust.alt += gust.vy * dt;
    gust.x += world.wind * GUST.drift * 0.5 * dt;
    if (gust.alt > HORIZON + 20 || gust.life > 13) world.gusts.splice(i, 1);
  }
  updateParticles(world, dt);
}

export function updateWorld(world, dt, input) {
  const phase = PHASES[world.phase];
  world.t += dt;
  world.tick += 1;
  world.flash = Math.max(0, world.flash - dt * 2.6);
  world.shake = Math.max(0, world.shake - dt * 2.4);
  world.kite.flash = Math.max(0, world.kite.flash - dt * 3.2);
  if (world.toastTimer > 0) {
    world.toastTimer -= dt;
    if (world.toastTimer <= 0) world.toast = '';
  }
  updateParticles(world, dt);

  // A cleared phase holds the frame for a beat so the banner can land before the next dusk.
  if (world.clearTimer > 0) {
    world.clearTimer -= dt;
    if (world.clearTimer <= 0) {
      world.clearTimer = 0;
      if (world.phase + 1 >= PHASES.length) endRun(world, 'victory');
      else startPhase(world, world.phase + 1);
    }
    return;
  }
  if (world.invuln > 0) world.invuln = Math.max(0, world.invuln - dt);

  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 1;
  }

  world.windPhase += dt * 0.35;
  world.wind = Math.sin(world.windPhase * 1.7) * 0.62 + Math.sin(world.windPhase * 0.63 + 1.4) * 0.38;

  // The boat: thrust while a direction is held, water drag when it is not.
  const steer = input.steer;
  if (steer !== 0) world.boat.vx += steer * BOAT.accel * dt;
  world.boat.vx *= Math.pow(BOAT.drag, dt);
  world.boat.vx = clamp(world.boat.vx, -BOAT.maxSpeed, BOAT.maxSpeed);
  world.boat.x = clamp(world.boat.x + world.boat.vx * dt, -BOAT.limit, BOAT.limit);
  world.boat.steer += (steer - world.boat.steer) * Math.min(1, 7 * dt);
  world.boat.tilt += (-world.boat.vx / BOAT.maxSpeed - world.boat.tilt) * Math.min(1, 4 * dt);

  // The line: holding pull winds tension in, letting go lets it out.
  const rate = input.pull ? KITE.tensionUp : KITE.tensionDown;
  world.tension += ((input.pull ? 1 : 0) - world.tension) * Math.min(1, rate * dt);

  // Lift against weight and drag. Phase wind scales the lift, a storm drags the kite down.
  let accel = world.tension * KITE.lift * phase.wind - KITE.weight - world.kite.vy * KITE.drag;
  let inStorm = false;
  for (const storm of world.storms) {
    const dx = storm.x - world.kite.x;
    const dy = storm.alt - world.kite.alt;
    const reach = storm.r * STORM.hitScale;
    if (dx * dx + dy * dy < reach * reach) {
      inStorm = true;
      break;
    }
  }
  if (inStorm) accel -= STORM.pull;
  world.kite.vy = clamp(world.kite.vy + accel * dt, -330, 340);
  world.kite.alt += world.kite.vy * dt;
  if (world.kite.alt < KITE.minAlt) {
    world.kite.alt = KITE.minAlt;
    world.kite.vy = Math.max(0, world.kite.vy) * 0.3;
  }
  if (world.kite.alt > KITE.maxAlt) {
    world.kite.alt = KITE.maxAlt;
    world.kite.vy = Math.min(0, world.kite.vy) * 0.2;
  }

  const lead = world.boat.steer * KITE.lead - world.tension * 22;
  const targetX = world.boat.x + lead + world.wind * KITE.driftAmp;
  world.kite.x += (targetX - world.kite.x) * Math.min(1, (KITE.follow - world.tension * 0.8) * dt);
  world.kite.x += world.wind * 9 * dt;

  // Strain: tension and height cost, a slack line pays back, a storm costs a lot at once.
  const exposure = Math.max(0, world.kite.alt - STRAIN.altitudeFrom);
  let strainRate = world.tension * STRAIN.tension + exposure * STRAIN.altitude + (inStorm ? STRAIN.storm : 0);
  strainRate *= phase.wind;
  if (!input.pull && !inStorm) strainRate = -STRAIN.cool * (0.55 + 0.45 * (1 - world.tension));
  if (world.invuln <= 0) {
    world.strain = clamp(world.strain + strainRate * dt, 0, STRAIN.max);
    if (world.strain >= STRAIN.max) snapLine(world, 'strain');
  }

  // The lantern only fills from harvest, and a storm drinks from it.
  if (inStorm && world.invuln <= 0) world.gauge = Math.max(0, world.gauge - STORM.drain * dt);

  world.gustTimer -= dt;
  if (world.gustTimer <= 0) {
    spawnGust(world);
    world.gustTimer = phase.gustEvery * world.rng.range(0.72, 1.3);
  }
  for (let i = world.gusts.length - 1; i >= 0; i -= 1) {
    const gust = world.gusts[i];
    gust.life += dt;
    gust.alt += gust.vy * dt;
    gust.x += world.wind * GUST.drift * dt;
    if (gust.alt > HORIZON + 30 || gust.life > 13) {
      world.gusts.splice(i, 1);
      continue;
    }
    const dx = gust.x - world.kite.x;
    const dy = gust.alt - world.kite.alt;
    const reach = gust.r + 30;
    if (dx * dx + dy * dy < reach * reach && world.invuln <= 0) {
      collectGust(world, gust);
      world.gusts.splice(i, 1);
    }
  }

  world.stormTimer -= dt;
  if (world.stormTimer <= 0) {
    spawnStorm(world);
    world.stormTimer = phase.stormEvery * world.rng.range(0.75, 1.3);
  }
  for (let i = world.storms.length - 1; i >= 0; i -= 1) {
    const storm = world.storms[i];
    storm.life += dt;
    storm.x += storm.drift * STORM.drift * dt;
    storm.alt += Math.sin(storm.life * 0.9 + storm.seed) * 7 * dt;
    if (storm.life > storm.ttl) world.storms.splice(i, 1);
  }

  world.timeLeft -= dt;
  if (world.timeLeft <= 0) {
    snapLine(world, 'squall');
    if (world.screen === 'play') world.timeLeft = 20;
  }

  if (world.tick % KITE.trailEvery === 0) pushTrail(world);
  world.camX += (world.boat.x + world.camOffset - world.camX) * Math.min(1, 8 * dt);

  if (world.screen === 'play' && world.clearTimer <= 0 && world.gauge >= phase.target) {
    const bonus = Math.round((world.lanterns * SCORE.phaseBonusLantern + Math.max(0, world.timeLeft) * SCORE.phaseBonusSecond) * phase.mult);
    world.score += bonus;
    world.clearTimer = 2.8;
    world.clearInfo = { phase: world.phase, bonus, next: world.phase + 1 };
    world.stats.phases += 1;
    burst(world, world.kite.x, world.kite.alt, 28, 'clear');
    world.events.push({ type: 'clear' });
  }
}

function collectGust(world, gust) {
  const phase = PHASES[world.phase];
  world.combo = world.comboTimer > 0 ? Math.min(GUST.comboMax, world.combo + 1) : 1;
  world.comboTimer = GUST.comboWindow;
  const gained = Math.round(gust.lift * SCORE.perLift * world.combo * phase.mult);
  world.score += gained;
  world.gauge = Math.min(phase.target, world.gauge + gust.lift);
  world.stats.lift += gust.lift;
  world.stats.gusted += 1;
  world.kite.vy += KITE.gustKick;
  world.strain = Math.min(STRAIN.max - 6, world.strain + STRAIN.gust);
  world.floaters.push({
    x: gust.x,
    alt: gust.alt,
    text: '+' + gained,
    life: 1.4,
    max: 1.4,
    color: '#ffe9b4',
    size: 20 + Math.min(10, world.combo * 2),
  });
  burst(world, gust.x, gust.alt, 14, 'gust');
  world.events.push({ type: 'gust', combo: world.combo });
}

function updateParticles(world, dt) {
  for (let i = world.sparks.length - 1; i >= 0; i -= 1) {
    const spark = world.sparks[i];
    spark.life -= dt;
    spark.x += spark.vx * dt;
    spark.alt += spark.vy * dt;
    spark.vy -= 60 * dt;
    if (spark.life <= 0) world.sparks.splice(i, 1);
  }
  for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
    const floater = world.floaters[i];
    floater.life -= dt;
    floater.alt += 42 * dt;
    if (floater.life <= 0) world.floaters.splice(i, 1);
  }
}
