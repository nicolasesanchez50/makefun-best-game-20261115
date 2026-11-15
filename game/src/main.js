// Boot and the clock. main.js owns the screen state machine (title, play, phase-clear, pause,
// game over), the fixed 1/60 s simulation step, the best score in localStorage and the pages
// ?shot= staging. Everything it draws comes from sim.js through render.js.

import { VIEW, STEP, STORAGE_KEY, PHASES } from './config.js';
import { createWorld, beginRun, updateWorld, updateTitle } from './sim.js';
import { Input } from './input.js';
import { render } from './render.js';
import { applyShot, isShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

canvas.width = VIEW.w;
canvas.height = VIEW.h;

const params = new URLSearchParams(window.location.search);
const seedValue = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isFinite(seedValue) ? Math.abs(seedValue) % 100000 : 3;
const shot = params.get('shot');

const world = createWorld(seed);
world.best = readBest();
world.overLock = 0;
const input = new Input(canvas);
let lastScreen = world.screen;
let lastPhase = world.phase;
let lastTime = 0;
let accumulator = 0;

function readBest() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const value = Number.parseInt(raw ?? '', 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // A blocked localStorage only costs the player the record, not the game.
  }
}

function announce(text) {
  if (statusLine) statusLine.textContent = text;
}

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  canvas.style.width = Math.max(1, Math.round(VIEW.w * scale)) + 'px';
  canvas.style.height = Math.max(1, Math.round(VIEW.h * scale)) + 'px';
}

function startRun() {
  world.best = Math.max(world.best, readBest());
  beginRun(world);
  announce('Lantern Tide. Hold space or the mouse to pull the line, A and D to steer. Fill the lantern before the squall.');
}

function finishRun() {
  if (world.score > world.best) {
    world.best = world.score;
    world.newBest = true;
    writeBest(world.best);
  } else {
    world.newBest = false;
  }
  // A short guard so the click or key that ended the run cannot also restart it.
  world.overLock = 0.6;
  const phase = PHASES[Math.min(world.endPhase, PHASES.length - 1)];
  announce(
    (world.endReason === 'victory' ? 'Every lantern lit. ' : 'The run is over. ') +
      'Score ' + world.score + ', best ' + world.best + '. Reached ' + phase.name + '. Press R or Enter to sail again.',
  );
}

function handleActions() {
  for (const action of input.take()) {
    if (action === 'mute') {
      const muted = input.toggleMute();
      world.toast = muted ? 'SOUND OFF' : 'SOUND ON';
      world.toastTimer = 1.5;
      announce(muted ? 'Sound off.' : 'Sound on.');
    } else if (action === 'pause') {
      if (world.screen === 'play' && world.clearTimer <= 0) {
        world.paused = !world.paused;
        announce(world.paused ? 'Paused. Press P or Escape to sail on.' : 'Sailing again.');
      }
    } else if (action === 'restart') {
      if (world.screen === 'play' || world.screen === 'over') startRun();
    } else if (action === 'confirm') {
      if (world.screen === 'title') startRun();
      else if (world.screen === 'over' && world.overLock <= 0) startRun();
      else if (world.screen === 'play' && world.paused) {
        world.paused = false;
        announce('Sailing again.');
      }
    }
  }
}

function drainEvents() {
  for (const event of world.events) {
    if (event.type === 'gust') input.sound.gust(event.combo);
    else if (event.type === 'snap') input.sound.snap();
    else if (event.type === 'clear') input.sound.clear();
    else if (event.type === 'warn') input.sound.warn();
    else if (event.type === 'start') input.sound.start();
    else if (event.type === 'over') input.sound.over(event.win);
  }
  world.events.length = 0;
}

function step(dt) {
  handleActions();
  if (world.overLock > 0) world.overLock = Math.max(0, world.overLock - dt);
  if (world.screen === 'title') {
    updateTitle(world, dt);
  } else if (world.screen === 'play') {
    if (world.paused) world.t += dt;
    else updateWorld(world, dt, input);
  } else if (world.screen === 'over') {
    world.t += dt;
    if (world.kite.trail.length > 0) world.kite.trail.shift();
  }
  drainEvents();
  if (world.screen === 'play' && world.phase !== lastPhase) {
    lastPhase = world.phase;
    announce(PHASES[world.phase].name + ' begins. ' + PHASES[world.phase].note + '. Fill the lantern before the squall.');
  }
  if (world.screen !== lastScreen) {
    if (world.screen === 'over') finishRun();
    lastScreen = world.screen;
  }
}

function frame(now) {
  if (!lastTime) lastTime = now;
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= STEP && steps < 5) {
    step(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  render(ctx, world);
  window.requestAnimationFrame(frame);
}

window.addEventListener('resize', fitCanvas);
document.addEventListener('visibilitychange', () => {
  lastTime = 0;
  accumulator = 0;
  input.clear();
});
fitCanvas();

if (isShot(shot)) {
  // Staged scenes do not run the loop: paint once, then again after fonts settle, and flag ready.
  applyShot(world, shot);
  const paint = () => {
    render(ctx, world);
    window.__shotReady = true;
  };
  paint();
  window.requestAnimationFrame(paint);
  window.setTimeout(paint, 80);
  announce('Lantern Tide, staged scene: ' + shot + '.');
} else {
  announce('Lantern Tide. Press enter to sail. Hold space to pull the kite, A and D to steer.');
  render(ctx, world);
  window.requestAnimationFrame(frame);
}
