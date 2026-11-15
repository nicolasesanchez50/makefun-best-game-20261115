// Every pixel LANTERN TIDE shows: the dusk sky, the sun going down behind the archipelago, the
// sea and its glitter, the boat, the lantern kite and its ribbon, gust pockets, storm cells, the
// HUD, and the title, phase-clear, pause and game-over screens. Canvas 2D only, no images, no
// filters: shapes, gradients and text, so the game stays one small folder of plain files.

import { VIEW, HORIZON, BOAT_Y, SUN, PALETTE, PHASES, FONT_STACK, BODY_STACK } from './config.js';
import { hash01, clamp, smoothstep } from './random.js';

const W = VIEW.w;
const H = VIEW.h;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------
// Small drawing utilities

function setFont(ctx, size, weight = 900, stack = FONT_STACK) {
  ctx.font = weight + ' ' + size + 'px ' + stack;
}

function tracking(ctx, px) {
  ctx.letterSpacing = px + 'px';
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, r = 12, alpha = 0.34, border = 0.16) {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(8,7,20,' + alpha + ')';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,150,' + border + ')';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function formatScore(value) {
  return String(Math.max(0, Math.round(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function clock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function kiteScreen(world) {
  return {
    x: W / 2 + (world.kite.x - world.camX),
    y: HORIZON - world.kite.alt,
  };
}

function boatScreen(world) {
  return {
    x: W / 2 + (world.boat.x - world.camX),
    y: BOAT_Y + Math.sin(world.t * 1.7) * 2.6,
  };
}

// ---------------------------------------------------------------------------------------------

export function render(ctx, world) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  if (world.shake > 0.001) {
    const amount = world.shake * 11;
    ctx.translate(Math.sin(world.t * 91) * amount, Math.cos(world.t * 77) * amount);
  }
  drawSky(ctx, world);
  drawSun(ctx, world);
  drawClouds(ctx, world);
  drawIslands(ctx, world);
  drawSea(ctx, world);
  drawIslandReflections(ctx, world);
  drawSeaLanterns(ctx, world);
  drawBirds(ctx, world);
  drawGusts(ctx, world);
  drawStorms(ctx, world);
  drawRibbon(ctx, world);
  drawTether(ctx, world);
  drawKite(ctx, world);
  drawBoat(ctx, world);
  drawSparks(ctx, world);
  drawFloaters(ctx, world);
  drawAtmosphere(ctx, world);

  if (world.screen === 'play') drawHud(ctx, world);
  if (world.screen === 'play' && world.clearTimer > 0) drawClearBanner(ctx, world);
  if (world.screen === 'play' && world.paused) drawPause(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  if (world.screen === 'over') drawGameOver(ctx, world);

  if (world.flash > 0) {
    ctx.fillStyle = 'rgba(255,238,214,' + (0.5 * world.flash).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (world.toastTimer > 0 && world.toast) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setFont(ctx, 14, 700, BODY_STACK);
    tracking(ctx, 3);
    const width = ctx.measureText(world.toast).width + 40;
    panel(ctx, W / 2 - width / 2, 596, width, 34, 17, 0.5, 0.24);
    ctx.fillStyle = 'rgba(255,236,206,0.92)';
    ctx.fillText(world.toast, W / 2, 614);
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Sky, sun, clouds, stars

function drawSky(ctx, world) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 4);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.26, PALETTE.skyUpper);
  sky.addColorStop(0.52, PALETTE.skyMid);
  sky.addColorStop(0.71, PALETTE.skyWarm);
  sky.addColorStop(0.85, PALETTE.skyGlow);
  sky.addColorStop(0.95, PALETTE.skyLow);
  sky.addColorStop(1, '#ffd9a1');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON + 4);

  for (let i = 0; i < 104; i += 1) {
    const x = hash01(i * 3 + 11) * W;
    const y = Math.pow(hash01(i * 3 + 12), 1.4) * 320;
    const fade = clamp(1 - y / 320, 0, 1);
    const twinkle = 0.62 + 0.38 * Math.sin(world.t * 0.8 + i * 1.7);
    const alpha = (0.16 + hash01(i * 3 + 13) * 0.6) * fade * twinkle;
    if (alpha <= 0.02) continue;
    const r = 0.6 + hash01(i * 3 + 14) * 1.3;
    ctx.fillStyle = 'rgba(228,226,255,' + alpha.toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }

  // A thin bank of high haze catching the last light.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i += 1) {
    const x = hash01(400 + i) * W;
    const y = 220 + hash01(420 + i) * 120;
    const rx = 180 + hash01(440 + i) * 220;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(255,150,120,0.055)');
    g.addColorStop(1, 'rgba(255,150,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, 26 + hash01(460 + i) * 22, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSun(ctx) {
  const { x, y, r } = SUN;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 6.4);
  halo.addColorStop(0, 'rgba(255,176,96,0.55)');
  halo.addColorStop(0.32, 'rgba(255,132,80,0.22)');
  halo.addColorStop(0.7, 'rgba(255,100,76,0.07)');
  halo.addColorStop(1, 'rgba(255,90,70,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - r * 6.6, y - r * 6.6, r * 13.2, r * 13.2);

  const disc = ctx.createRadialGradient(x, y - r * 0.25, r * 0.1, x, y, r);
  disc.addColorStop(0, PALETTE.sunCore);
  disc.addColorStop(0.62, PALETTE.sunMid);
  disc.addColorStop(1, 'rgba(255,150,88,0.92)');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Two low cloud slivers cross the disc the way real haze does at the horizon: soft, warm, and
  // never a hard grey bar.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = 'rgba(106,48,86,0.3)';
  ctx.beginPath();
  ctx.ellipse(x - 12, y + 9, r * 1.15, 5.5, -0.02, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,214,160,0.34)';
  ctx.beginPath();
  ctx.ellipse(x + 10, y + 22, r * 0.95, 2.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(126,58,96,0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y - 16, r * 0.8, 3.4, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawClouds(ctx, world) {
  const groups = [
    { x: 150, y: 106, s: 1.45, a: 0.5, lit: 0.1 },
    { x: 720, y: 78, s: 1.0, a: 0.4, lit: 0.1 },
    { x: 1120, y: 146, s: 1.55, a: 0.46, lit: 0.16 },
    { x: 470, y: 196, s: 2.1, a: 0.34, lit: 0.16 },
    { x: 130, y: 258, s: 1.15, a: 0.28, lit: 0.2 },
    { x: 1010, y: 258, s: 1.3, a: 0.3, lit: 0.24 },
  ];
  for (let gi = 0; gi < groups.length; gi += 1) {
    const cloud = groups[gi];
    const drift = Math.sin(world.t * 0.05 + gi) * 8;
    ctx.save();
    ctx.fillStyle = 'rgba(46,27,62,' + cloud.a + ')';
    for (let i = 0; i < 6; i += 1) {
      const px = cloud.x + drift + (hash01(gi * 31 + i) - 0.5) * 250 * cloud.s;
      const py = cloud.y + (hash01(gi * 37 + i + 9) - 0.5) * 24 * cloud.s;
      const rx = (56 + hash01(gi * 41 + i + 3) * 104) * cloud.s;
      const ry = (9 + hash01(gi * 43 + i + 5) * 20) * cloud.s;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i += 1) {
      const px = cloud.x + drift + (hash01(gi * 53 + i + 2) - 0.5) * 220 * cloud.s;
      const py = cloud.y + 12 * cloud.s + hash01(gi * 59 + i) * 8;
      const rx = (50 + hash01(gi * 61 + i) * 80) * cloud.s;
      const g = ctx.createRadialGradient(px, py, 0, px, py, rx);
      g.addColorStop(0, 'rgba(255,150,104,' + cloud.lit + ')');
      g.addColorStop(1, 'rgba(255,150,104,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px, py, rx, 7 * cloud.s, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// The archipelago: three silhouettes at different parallax distances, near ones carrying palms
// and a few lantern lights so the islands feel lived in.

const ISLAND_TILE = 1760;
const ISLAND_LAYERS = [
  {
    factor: 0.05,
    color: '#5b3f68',
    alpha: 0.8,
    palms: 0,
    lights: 0,
    items: [
      { x: 60, w: 520, h: 54, seed: 1 },
      { x: 470, w: 300, h: 32, seed: 2 },
      { x: 780, w: 440, h: 46, seed: 3 },
      { x: 1180, w: 380, h: 38, seed: 4 },
      { x: 1520, w: 300, h: 30, seed: 5 },
    ],
  },
  {
    factor: 0.13,
    color: '#37234f',
    alpha: 0.94,
    palms: 2,
    lights: 0,
    items: [
      { x: -120, w: 620, h: 88, seed: 11 },
      { x: 380, w: 260, h: 42, seed: 12 },
      { x: 700, w: 520, h: 72, seed: 13 },
      { x: 1240, w: 420, h: 62, seed: 14 },
    ],
  },
  {
    factor: 0.26,
    color: '#130d21',
    alpha: 1,
    palms: 4,
    lights: 3,
    items: [
      { x: -40, w: 560, h: 116, seed: 21 },
      { x: 1480, w: 620, h: 138, seed: 22 },
    ],
  },
];

function drawIslands(ctx, world) {
  for (let li = 0; li < ISLAND_LAYERS.length; li += 1) {
    const layer = ISLAND_LAYERS[li];
    const shift = -world.camX * layer.factor;
    for (let tile = -1; tile <= 1; tile += 1) {
      for (const item of layer.items) {
        const cx = item.x + shift + tile * ISLAND_TILE;
        if (cx < -700 || cx > W + 700) continue;
        drawIsland(ctx, cx, item.w, item.h, item.seed, layer);
      }
    }
    if (li === 0) {
      const haze = ctx.createLinearGradient(0, HORIZON - 150, 0, HORIZON + 2);
      haze.addColorStop(0, 'rgba(255,150,120,0)');
      haze.addColorStop(1, 'rgba(255,160,130,0.14)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, HORIZON - 150, W, 152);
    }
  }
}

function islandPath(ctx, w, h) {
  ctx.moveTo(-w / 2, 0);
  ctx.bezierCurveTo(-w * 0.46, -h * 0.24, -w * 0.36, -h * 0.78, -w * 0.17, -h * 0.86);
  ctx.quadraticCurveTo(-w * 0.08, -h * 0.9, -w * 0.03, -h);
  ctx.bezierCurveTo(w * 0.05, -h * 0.7, w * 0.16, -h * 0.55, w * 0.3, -h * 0.44);
  ctx.bezierCurveTo(w * 0.42, -h * 0.34, w * 0.46, -h * 0.14, w / 2, 0);
  ctx.closePath();
}

function drawIsland(ctx, cx, w, h, seed, layer) {
  const base = HORIZON + 8;
  const dir = hash01(seed * 7 + 3) < 0.5 ? 1 : -1;
  ctx.save();
  ctx.globalAlpha = layer.alpha;
  ctx.fillStyle = layer.color;
  ctx.translate(cx, base);
  ctx.scale(dir, 1);
  ctx.beginPath();
  islandPath(ctx, w, h);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,164,120,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  if (layer.palms > 0) {
    const count = Math.max(1, Math.round(layer.palms * (0.6 + hash01(seed * 11) * 0.8)));
    for (let p = 0; p < count; p += 1) {
      const px = cx + (hash01(seed * 17 + p * 5) - 0.5) * w * 0.52;
      const py = base - h * (0.52 + hash01(seed * 19 + p * 7) * 0.3);
      const height = 20 + hash01(seed * 23 + p * 11) * 24;
      const lean = (hash01(seed * 29 + p * 13) - 0.5) * 26;
      drawPalm(ctx, px, py, height, lean, layer.color);
    }
  }

  if (layer.lights > 0) {
    for (let l = 0; l < layer.lights; l += 1) {
      const lx = cx + (hash01(seed * 31 + l * 9) - 0.5) * w * 0.44;
      const ly = base - 5 - hash01(seed * 37 + l * 3) * 12;
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, 18);
      glow.addColorStop(0, 'rgba(255,206,128,0.55)');
      glow.addColorStop(1, 'rgba(255,190,110,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly, 18, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,228,168,0.95)';
      ctx.beginPath();
      ctx.arc(lx, ly, 1.8, 0, TAU);
      ctx.fill();
    }
  }
}

function drawPalm(ctx, x, baseY, height, lean, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const topX = x + lean;
  const topY = baseY - height;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + lean * 0.35, baseY - height * 0.62, topX, topY);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI * 0.95 + (i / 5) * Math.PI * 0.9;
    const reach = 16 + hash01(x + i * 13) * 14;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(angle) * reach * 0.7,
      topY + Math.sin(angle) * reach * 0.5 - 8,
      topX + Math.cos(angle) * reach,
      topY + Math.sin(angle) * reach * 0.8 + 8,
    );
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The sea: a warm reflection under the sun, then dark water, wave crests and the horizon line.

function drawSea(ctx, world) {
  const sea = ctx.createLinearGradient(0, HORIZON, 0, H);
  sea.addColorStop(0, PALETTE.seaTop);
  sea.addColorStop(0.1, '#4b3358');
  sea.addColorStop(0.4, PALETTE.seaMid);
  sea.addColorStop(0.78, '#111529');
  sea.addColorStop(1, PALETTE.seaDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 58; i += 1) {
    const f = i / 58;
    const y = HORIZON + 5 + Math.pow(f, 1.65) * (H - HORIZON);
    const spread = 14 + f * 176;
    const cx = SUN.x + (hash01(i * 7 + 1) - 0.5) * spread * 2;
    const width = (8 + hash01(i * 7 + 3) * 74) * (0.32 + f);
    const height = 1 + f * 3.4;
    const alpha = (0.3 - f * 0.15) * (0.45 + hash01(i * 7 + 5) * 0.8);
    if (alpha <= 0.01) continue;
    ctx.fillStyle = 'rgba(255,198,134,' + alpha.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(cx, y, width * 0.5, height, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 86; i += 1) {
    const f = i / 86;
    const y = HORIZON + 4 + Math.pow(f, 1.8) * (H - HORIZON);
    const drift = Math.sin(world.t * 0.22 + i * 0.9) * 9;
    const x = (((hash01(i * 5 + 2) * W + drift + f * 40) % (W + 120)) + W + 120) % (W + 120) - 60;
    const len = 7 + Math.pow(f, 1.25) * 86;
    ctx.strokeStyle = 'rgba(198,176,226,' + (0.045 + f * 0.1).toFixed(3) + ')';
    ctx.lineWidth = 1 + f * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,196,142,0.5)';
  ctx.fillRect(0, HORIZON - 1, W, 2);
  ctx.fillStyle = 'rgba(255,150,110,0.12)';
  ctx.fillRect(0, HORIZON + 2, W, 6);
  ctx.restore();
}

// The islands keep a squashed, dim mirror image in the water: the horizon gains depth and the near
// water reads as a surface instead of a flat gradient.
function drawIslandReflections(ctx, world) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HORIZON, W, H - HORIZON);
  ctx.clip();
  for (let li = 1; li < ISLAND_LAYERS.length; li += 1) {
    const layer = ISLAND_LAYERS[li];
    const shift = -world.camX * layer.factor;
    ctx.globalAlpha = 0.14 * layer.alpha;
    ctx.fillStyle = layer.color;
    for (let tile = -1; tile <= 1; tile += 1) {
      for (const item of layer.items) {
        const cx = item.x + shift + tile * ISLAND_TILE;
        if (cx < -700 || cx > W + 700) continue;
        ctx.save();
        ctx.translate(cx, HORIZON + 12);
        ctx.scale(1, -0.55);
        ctx.beginPath();
        islandPath(ctx, item.w, item.h);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.restore();
}

// Paper lanterns released from the islands drift out on the tide. They are scenery, but they give
// the near water a few warm lights of its own and one more layer of depth under the kite.
function drawSeaLanterns(ctx, world) {
  for (let i = 0; i < 11; i += 1) {
    const depth = 0.35 + hash01(i * 5 + 1) * 0.65;
    const span = W + 280;
    let x = hash01(i * 5 + 3) * span + world.t * (3 + depth * 7) - world.camX * (0.04 + depth * 0.05);
    x = (((x % span) + span) % span) - 140;
    const y = HORIZON + 30 + depth * 246 + Math.sin(world.t * 0.9 + i * 1.7) * 2.4;
    const r = 1.5 + depth * 3.2;
    const alpha = 0.4 + depth * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
    glow.addColorStop(0, 'rgba(255,206,136,' + (alpha * 0.45).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,188,120,' + (alpha * 0.16).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 3, r * 1.1, r * 4.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,238,188,' + alpha.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.25, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawBirds(ctx, world) {
  ctx.save();
  ctx.strokeStyle = 'rgba(26,14,30,0.55)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i += 1) {
    const x = 180 + hash01(i * 13 + 2) * 900 + Math.sin(world.t * 0.12 + i) * 30;
    const y = 96 + hash01(i * 17 + 5) * 130;
    const flap = Math.sin(world.t * 2.4 + i * 1.7) * 3.4;
    const span = 6 + hash01(i * 19) * 5;
    ctx.beginPath();
    ctx.moveTo(x - span, y + flap);
    ctx.quadraticCurveTo(x - span * 0.4, y - 3 - flap, x, y);
    ctx.quadraticCurveTo(x + span * 0.4, y - 3 - flap, x + span, y + flap);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Gust pockets and storm cells

function drawGusts(ctx, world) {
  for (const gust of world.gusts) {
    const x = W / 2 + (gust.x - world.camX);
    const y = HORIZON - gust.alt;
    if (x < -180 || x > W + 180) continue;
    const fadeIn = clamp(gust.life * 2.4, 0, 1);
    const fadeTop = clamp((HORIZON - gust.alt) / 120 + 0.25, 0, 1);
    const fade = fadeIn * fadeTop;
    const pulse = 0.9 + 0.1 * Math.sin(world.t * 3 + gust.seed);

    // A pale column of lifted air under the pocket, linking it to the sea.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pillar = ctx.createLinearGradient(x, y + gust.r, x, y + gust.r + 150);
    pillar.addColorStop(0, 'rgba(140,240,220,0.1)');
    pillar.addColorStop(1, 'rgba(140,240,220,0)');
    ctx.fillStyle = pillar;
    ctx.beginPath();
    ctx.ellipse(x, y + gust.r + 74, gust.r * 0.62, 78, 0, 0, TAU);
    ctx.fill();

    const glow = ctx.createRadialGradient(x, y, 0, x, y, gust.r * 2.5);
    glow.addColorStop(0, 'rgba(176,252,232,' + (0.4 * fade).toFixed(3) + ')');
    glow.addColorStop(0.5, 'rgba(120,220,205,' + (0.16 * fade).toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(120,220,205,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, gust.r * 2.5, 0, TAU);
    ctx.fill();
    ctx.restore();

    for (let ring = 0; ring < 3; ring += 1) {
      const rr = gust.r * (0.5 + ring * 0.25) * pulse;
      ctx.strokeStyle = 'rgba(198,255,246,' + ((0.62 - ring * 0.12) * fade).toFixed(3) + ')';
      ctx.lineWidth = 2.8 - ring * 0.55;
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * 0.46, 0, 0, TAU);
      ctx.stroke();
    }

    // Three short streaks inside the ring: this is moving air, not a portal.
    for (let streak = 0; streak < 3; streak += 1) {
      const spin = world.t * 1.9 + streak * 2.1 + gust.seed;
      const rr = gust.r * (0.34 + streak * 0.12);
      ctx.strokeStyle = 'rgba(214,255,248,' + (0.3 * fade).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * 0.42, 0, spin, spin + 1.5);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(226,255,250,' + (0.4 * fade).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x, y, gust.r * 0.3, gust.r * 0.15, 0, 0, TAU);
    ctx.fill();

    for (let spark = 0; spark < 6; spark += 1) {
      const angle = world.t * 1.5 + spark * 1.05 + gust.seed;
      const sx = x + Math.cos(angle) * gust.r * 0.82;
      const sy = y + Math.sin(angle) * gust.r * 0.38;
      ctx.fillStyle = 'rgba(214,255,248,' + (0.45 * fade).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.7, 0, TAU);
      ctx.fill();
    }
  }
}

function drawStorms(ctx, world) {
  for (const storm of world.storms) {
    const x = W / 2 + (storm.x - world.camX);
    const y = HORIZON - storm.alt;
    if (x < -240 || x > W + 240) continue;
    const fade = Math.min(clamp(storm.life * 2.2, 0, 1), clamp((storm.ttl - storm.life) * 1.6 + 0.15, 0, 1));
    const r = storm.r * (0.97 + 0.03 * Math.sin(world.t * 1.6 + storm.seed));

    ctx.save();
    // A broad shade first: a cell should dim the whole sky around it, not sit on it like a sticker.
    const shade = ctx.createRadialGradient(x, y, r * 0.35, x, y, r * 1.5);
    shade.addColorStop(0, 'rgba(8,3,18,' + (0.5 * fade).toFixed(3) + ')');
    shade.addColorStop(0.6, 'rgba(16,7,32,' + (0.26 * fade).toFixed(3) + ')');
    shade.addColorStop(1, 'rgba(20,9,40,0)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.5, 0, TAU);
    ctx.fill();

    const body = ctx.createRadialGradient(x - r * 0.16, y - r * 0.18, r * 0.04, x, y, r);
    body.addColorStop(0, 'rgba(2,1,6,' + (0.98 * fade).toFixed(3) + ')');
    body.addColorStop(0.44, 'rgba(12,6,24,' + (0.96 * fade).toFixed(3) + ')');
    body.addColorStop(0.74, 'rgba(34,15,60,' + (0.9 * fade).toFixed(3) + ')');
    body.addColorStop(0.9, 'rgba(78,40,128,' + (0.46 * fade).toFixed(3) + ')');
    body.addColorStop(1, 'rgba(96,52,152,0)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();

    // A ragged violet lip so the cell does not read as a clean circle.
    ctx.beginPath();
    for (let i = 0; i <= 32; i += 1) {
      const angle = (i / 32) * TAU;
      const rr = r * (0.92 + 0.09 * Math.sin(angle * 5 + world.t * 0.8 + storm.seed) + 0.045 * Math.sin(angle * 9 - world.t * 1.3));
      const px = x + Math.cos(angle) * rr;
      const py = y + Math.sin(angle) * rr * 0.93;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(150,104,222,' + (0.3 * fade).toFixed(3) + ')';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    for (let arm = 0; arm < 3; arm += 1) {
      ctx.beginPath();
      for (let step = 0; step <= 16; step += 1) {
        const f = step / 16;
        const angle = arm * (TAU / 3) + f * 4.6 * storm.spin + world.t * 0.85 * storm.spin + storm.seed;
        const rr = r * (0.2 + f * 0.74);
        const px = x + Math.cos(angle) * rr;
        const py = y + Math.sin(angle) * rr * 0.94;
        if (step === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(164,124,240,' + (0.34 * fade).toFixed(3) + ')';
      ctx.lineWidth = 4.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(224,208,255,' + (0.14 * fade).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    const eye = ctx.createRadialGradient(x, y, 0, x, y, r * 0.22);
    eye.addColorStop(0, 'rgba(206,182,255,' + (0.2 * fade).toFixed(3) + ')');
    eye.addColorStop(1, 'rgba(160,120,235,0)');
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, TAU);
    ctx.fill();

    const flicker = Math.max(0, Math.sin(world.t * 2.1 + storm.seed * 2.7));
    if (flicker > 0.9) {
      const alpha = ((flicker - 0.9) / 0.1) * 0.95 * fade;
      ctx.strokeStyle = 'rgba(226,214,255,' + alpha.toFixed(3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let px = x + (hash01(storm.seed * 31) - 0.5) * r * 0.4;
      let py = y - r * 0.55;
      ctx.moveTo(px, py);
      for (let step = 1; step <= 4; step += 1) {
        px += (hash01(storm.seed * 41 + step) - 0.5) * r * 0.46;
        py += (r * 1.1) / 4;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(150,132,204,' + (0.3 * fade).toFixed(3) + ')';
    ctx.lineWidth = 1.7;
    for (let drop = 0; drop < 11; drop += 1) {
      const dx = x + (hash01(storm.seed * 53 + drop) - 0.5) * r * 1.7;
      const dy = y + r * 0.5 + hash01(storm.seed * 59 + drop) * r * 0.9;
      const length = 12 + hash01(storm.seed * 61 + drop) * 16;
      ctx.beginPath();
      ctx.moveTo(dx, dy);
      ctx.lineTo(dx - 5, dy + length);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------------------------
// The kite: a paper lantern on a cross-frame, its ribbon remembering the last few seconds of flight

function drawRibbon(ctx, world) {
  const trail = world.kite.trail;
  if (trail.length < 2) return;
  const points = trail.map((p) => ({ x: W / 2 + (p.x - world.camX), y: HORIZON - p.alt }));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(255,160,110,0.08)';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();

  for (let i = 1; i < points.length; i += 1) {
    const f = i / (points.length - 1);
    const wave = Math.sin(i * 0.55 + world.t * 2.6) * (2 + f * 7);
    const p0 = points[i - 1];
    const p1 = points[i];
    const nx = -(p1.y - p0.y);
    const ny = p1.x - p0.x;
    const len = Math.hypot(nx, ny) || 1;
    const ox = (nx / len) * wave;
    const oy = (ny / len) * wave;
    const alpha = (0.06 + f * 0.4).toFixed(3);
    const red = 255;
    const green = Math.round(196 - f * 66);
    const blue = Math.round(118 + f * 52);
    ctx.strokeStyle = 'rgba(' + red + ',' + green + ',' + blue + ',' + alpha + ')';
    ctx.lineWidth = 0.7 + f * 5.6;
    ctx.beginPath();
    ctx.moveTo(p0.x + ox, p0.y + oy);
    ctx.lineTo(p1.x + ox, p1.y + oy);
    ctx.stroke();
  }

  for (let i = 0; i < 3; i += 1) {
    const index = Math.floor(points.length * (0.18 + i * 0.22));
    const point = points[index];
    if (!point) continue;
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, 12);
    glow.addColorStop(0, 'rgba(255,232,178,0.55)');
    glow.addColorStop(1, 'rgba(255,200,130,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 12, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawTether(ctx, world) {
  const boat = boatScreen(world);
  const anchorX = boat.x + 14;
  const anchorY = boat.y - 84;
  const kite = kiteScreen(world);
  const slack = 1 - world.tension;
  const midX = (anchorX + kite.x) / 2 + Math.sin(world.t * 1.1) * 10;
  const midY = (anchorY + kite.y) / 2 + slack * 54 + 12;
  const broken = world.invuln > 0.35;
  const endX = broken ? anchorX + (kite.x - anchorX) * 0.45 : kite.x;
  const endY = broken ? anchorY + (kite.y - anchorY) * 0.5 + slack * 20 : kite.y;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,176,120,0.14)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,222,180,0.62)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  for (let i = 1; i <= 3; i += 1) {
    const t = i / 4;
    const bx = (1 - t) * (1 - t) * anchorX + 2 * (1 - t) * t * midX + t * t * endX;
    const by = (1 - t) * (1 - t) * anchorY + 2 * (1 - t) * t * midY + t * t * endY;
    ctx.fillStyle = 'rgba(255,226,170,0.7)';
    ctx.beginPath();
    ctx.arc(bx, by, 1.7, 0, TAU);
    ctx.fill();
  }

  // The masthead lamp the line runs through.
  const bead = ctx.createRadialGradient(anchorX, anchorY, 0, anchorX, anchorY, 13);
  bead.addColorStop(0, 'rgba(255,232,176,0.75)');
  bead.addColorStop(1, 'rgba(255,200,130,0)');
  ctx.fillStyle = bead;
  ctx.beginPath();
  ctx.arc(anchorX, anchorY, 13, 0, TAU);
  ctx.fill();

  if (broken) {
    ctx.strokeStyle = 'rgba(255,200,150,0.4)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX + i * 4, endY + 9 + Math.abs(i));
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawKite(ctx, world) {
  const kite = kiteScreen(world);
  const tilt = clamp(world.kite.vy * 0.0014, -0.32, 0.32) + clamp(world.boat.steer * 0.1, -0.1, 0.1);
  const flash = world.kite.flash;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const radius = (78 + 18 * Math.sin(world.t * 2.4) + flash * 120) * (world.screen === 'title' ? 1.2 : 1);
  const glow = ctx.createRadialGradient(kite.x, kite.y, 3, kite.x, kite.y, radius);
  glow.addColorStop(0, 'rgba(255,228,164,0.55)');
  glow.addColorStop(0.42, 'rgba(255,164,92,0.22)');
  glow.addColorStop(1, 'rgba(255,130,80,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(kite.x, kite.y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(kite.x, kite.y);
  ctx.rotate(tilt);
  if (world.screen === 'title') ctx.scale(1.2, 1.2);

  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.quadraticCurveTo(20, -18, 26, 0);
  ctx.quadraticCurveTo(16, 22, 0, 34);
  ctx.quadraticCurveTo(-16, 22, -26, 0);
  ctx.quadraticCurveTo(-20, -18, 0, -30);
  ctx.closePath();
  const body = ctx.createLinearGradient(0, -32, 0, 36);
  body.addColorStop(0, '#fff4cd');
  body.addColorStop(0.42, '#ffc669');
  body.addColorStop(1, '#ee7836');
  ctx.save();
  ctx.shadowColor = 'rgba(22,7,16,0.55)';
  ctx.shadowBlur = 14;
  ctx.fillStyle = body;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#5a2a14';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(122,54,22,0.45)';
  ctx.lineWidth = 1.2;
  for (const rib of [-14, 0, 14]) {
    ctx.beginPath();
    ctx.moveTo(rib * 0.34, -28 + Math.abs(rib) * 0.22);
    ctx.quadraticCurveTo(rib * 1.12, 2, rib * 0.34, 32 - Math.abs(rib) * 0.22);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-23, -2);
  ctx.lineTo(23, -2);
  ctx.strokeStyle = 'rgba(104,44,18,0.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // The little lantern hanging under the frame.
  const hang = 42 + Math.sin(world.t * 2.1) * 2;
  ctx.strokeStyle = 'rgba(96,42,20,0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, 33);
  ctx.lineTo(0, hang);
  ctx.stroke();
  const bulb = ctx.createRadialGradient(0, hang + 8, 0, 0, hang + 8, 22);
  bulb.addColorStop(0, 'rgba(255,240,190,0.85)');
  bulb.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = bulb;
  ctx.beginPath();
  ctx.arc(0, hang + 8, 22, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffe09a';
  ctx.beginPath();
  ctx.ellipse(0, hang + 8, 5.4, 6.8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,52,20,0.7)';
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The boat and its lantern

function drawBoat(ctx, world) {
  const boat = boatScreen(world);
  const x = boat.x;
  const y = boat.y;
  const tilt = world.boat.tilt * 0.35 + Math.sin(world.t * 1.4) * 0.012;

  // Reflection and wake first, so the hull sits in the water.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const wake = ctx.createLinearGradient(x - 220, y, x + 220, y);
  wake.addColorStop(0, 'rgba(255,190,140,0)');
  wake.addColorStop(0.5, 'rgba(255,190,140,0.1)');
  wake.addColorStop(1, 'rgba(255,190,140,0)');
  ctx.fillStyle = wake;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, 190, 12, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  // The hull's own dark mirror, so the boat sits in the water instead of on top of it.
  ctx.save();
  ctx.translate(x, y + 14);
  ctx.scale(1, -0.5);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#070510';
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.quadraticCurveTo(-44, 16, -20, 18);
  ctx.lineTo(20, 18);
  ctx.quadraticCurveTo(44, 16, 52, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y + 10);
  ctx.strokeStyle = 'rgba(210,190,230,0.2)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 6 + i * 7, 58 + i * 16, 5 + i * 1.6, 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  // Mast and pennant.
  ctx.strokeStyle = '#160e22';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(16, -8);
  ctx.lineTo(16, -86);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,168,104,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(17.6, -10);
  ctx.lineTo(17.6, -84);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,150,96,0.85)';
  ctx.beginPath();
  ctx.moveTo(17.5, -86);
  ctx.lineTo(40, -78);
  ctx.lineTo(17.5, -68);
  ctx.closePath();
  ctx.fill();

  // Hull.
  ctx.beginPath();
  ctx.moveTo(-58, 0);
  ctx.quadraticCurveTo(-52, 18, -26, 20);
  ctx.lineTo(26, 20);
  ctx.quadraticCurveTo(52, 18, 58, 0);
  ctx.quadraticCurveTo(30, -8, 0, -8);
  ctx.quadraticCurveTo(-30, -8, -58, 0);
  ctx.closePath();
  ctx.fillStyle = '#0e0a17';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,160,96,0.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,170,110,0.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-42, 3);
  ctx.quadraticCurveTo(0, -2, 44, 3);
  ctx.stroke();

  // Seated flyer with a conical hat.
  ctx.fillStyle = '#0b0812';
  ctx.beginPath();
  ctx.ellipse(2, -16, 9, 13, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2, -33, 6.4, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-13, -36);
  ctx.lineTo(17, -36);
  ctx.lineTo(2, -48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0b0812';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(7, -24);
  ctx.quadraticCurveTo(16, -34, 16, -44);
  ctx.stroke();

  // The prow lantern, and its light on the water.
  const lanternX = -40;
  const lanternY = -16;
  ctx.strokeStyle = 'rgba(20,12,24,0.9)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-40, -8);
  ctx.lineTo(-40, -10);
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(lanternX, lanternY, 0, lanternX, lanternY, 58);
  glow.addColorStop(0, 'rgba(255,220,150,0.55)');
  glow.addColorStop(0.45, 'rgba(255,170,96,0.18)');
  glow.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lanternX, lanternY, 58, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffe6ab';
  ctx.beginPath();
  ctx.ellipse(lanternX, lanternY, 6, 8, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,54,22,0.8)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(30,18,26,0.9)';
  ctx.fillRect(lanternX - 4.4, lanternY - 10, 8.8, 2.4);

  ctx.restore();

  // Lantern light spilled on the water under the prow.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i += 1) {
    const ly = y + 18 + i * 7;
    const alpha = 0.18 - i * 0.03;
    ctx.fillStyle = 'rgba(255,204,136,' + Math.max(0, alpha).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x - 40 + Math.sin(world.t * 1.1 + i) * 4, ly, 16 + i * 6, 2, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Particles and floating score text

function drawSparks(ctx, world) {
  if (world.sparks.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const spark of world.sparks) {
    const x = W / 2 + (spark.x - world.camX);
    const y = HORIZON - spark.alt;
    const alpha = clamp(spark.life / 0.6, 0, 1);
    let color = '188,255,236';
    if (spark.kind === 'snap') color = '255,186,132';
    if (spark.kind === 'clear') color = '255,228,160';
    ctx.fillStyle = 'rgba(' + color + ',' + (alpha * 0.8).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, spark.size * (0.4 + alpha * 0.6), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawFloaters(ctx, world) {
  if (world.floaters.length === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const floater of world.floaters) {
    const x = W / 2 + (floater.x - world.camX);
    const y = HORIZON - floater.alt;
    const life = clamp(floater.life / floater.max, 0, 1);
    setFont(ctx, floater.size, 900);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20,8,18,' + (0.5 * life).toFixed(3) + ')';
    ctx.strokeText(floater.text, x, y);
    ctx.fillStyle = 'rgba(255,236,190,' + life.toFixed(3) + ')';
    ctx.fillText(floater.text, x, y);
  }
  ctx.restore();
}

// Vignette, danger glow and the grit of dusk air.
function drawAtmosphere(ctx, world) {
  const danger = clamp((world.strain - 70) / 30, 0, 1);
  if (danger > 0.01) {
    const pulse = 0.55 + 0.45 * Math.sin(world.t * 6);
    const red = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.86);
    red.addColorStop(0, 'rgba(255,40,60,0)');
    red.addColorStop(1, 'rgba(255,34,54,' + (0.34 * danger * pulse).toFixed(3) + ')');
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, W, H);
  }
  const vignette = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.28, W / 2, H * 0.5, H * 0.95);
  vignette.addColorStop(0, 'rgba(3,4,12,0)');
  vignette.addColorStop(1, 'rgba(3,4,12,0.58)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------------------------------------
// HUD

function drawHud(ctx, world) {
  const phase = PHASES[world.phase];
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Phase and squall clock.
  panel(ctx, 26, 22, 250, 58, 12, 0.4);
  ctx.textAlign = 'left';
  setFont(ctx, 26, 900);
  tracking(ctx, 2);
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText(phase.name, 44, 55);
  tracking(ctx, 0);
  ctx.textAlign = 'right';
  setFont(ctx, 12, 700, BODY_STACK);
  ctx.fillStyle = 'rgba(255,214,170,0.7)';
  ctx.fillText(world.phase + 1 + ' / 3', 258, 54);

  // Lantern gauge.
  panel(ctx, 26, 88, 250, 96, 12, 0.4);
  ctx.textAlign = 'left';
  setFont(ctx, 10, 700, BODY_STACK);
  tracking(ctx, 2.2);
  ctx.fillStyle = 'rgba(255,226,186,0.78)';
  ctx.fillText('LANTERN LIFT', 44, 110);
  ctx.textAlign = 'right';
  setFont(ctx, 13, 700, BODY_STACK);
  tracking(ctx, 1);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(Math.round(world.gauge) + ' / ' + phase.target, 258, 110);
  tracking(ctx, 0);

  const gx = 44;
  const gy = 120;
  const gw = 214;
  const gh = 18;
  roundRect(ctx, gx, gy, gw, gh, 9);
  ctx.fillStyle = 'rgba(8,6,16,0.66)';
  ctx.fill();
  const fill = clamp(world.gauge / phase.target, 0, 1);
  if (fill > 0.001) {
    ctx.save();
    roundRect(ctx, gx, gy, Math.max(gh, gw * fill), gh, 9);
    ctx.clip();
    const bar = ctx.createLinearGradient(gx, 0, gx + gw, 0);
    bar.addColorStop(0, '#ff9a4e');
    bar.addColorStop(0.55, '#ffc46b');
    bar.addColorStop(1, '#fff0c0');
    ctx.fillStyle = bar;
    ctx.fillRect(gx, gy, gw, gh);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(gx, gy + 2, gw, 4);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,214,160,0.28)';
  ctx.lineWidth = 1;
  roundRect(ctx, gx, gy, gw, gh, 9);
  ctx.stroke();
  for (let tick = 1; tick < 5; tick += 1) {
    const tx = gx + (gw / 5) * tick;
    ctx.fillStyle = 'rgba(10,8,20,0.4)';
    ctx.fillRect(tx, gy + 3, 1.5, gh - 6);
  }

  const low = world.timeLeft <= 12;
  ctx.textAlign = 'left';
  setFont(ctx, 10, 700, BODY_STACK);
  tracking(ctx, 2.2);
  ctx.fillStyle = low ? '#ff8f8f' : 'rgba(255,214,170,0.6)';
  ctx.fillText('SQUALL', 44, 165);
  tracking(ctx, 0);
  ctx.textAlign = 'right';
  setFont(ctx, 14, 900, BODY_STACK);
  ctx.fillStyle = low ? PALETTE.danger : 'rgba(255,232,200,0.92)';
  ctx.fillText(clock(world.timeLeft), 258, 166);
  const timeFrac = clamp(world.timeLeft / phase.time, 0, 1);
  ctx.fillStyle = 'rgba(8,6,16,0.6)';
  ctx.fillRect(86, 156, 104, 4);
  ctx.fillStyle = low ? PALETTE.danger : 'rgba(255,190,140,0.75)';
  ctx.fillRect(86, 156, 104 * timeFrac, 4);

  // Score, best and the lanterns still aloft.
  panel(ctx, 1000, 22, 254, 98, 12, 0.4);
  ctx.textAlign = 'right';
  setFont(ctx, 10, 700, BODY_STACK);
  tracking(ctx, 2.6);
  ctx.fillStyle = 'rgba(255,226,186,0.75)';
  ctx.fillText('SCORE', 1234, 44);
  tracking(ctx, 0);
  setFont(ctx, 42, 900);
  ctx.fillStyle = '#fff0cd';
  ctx.fillText(formatScore(world.score), 1234, 82);
  setFont(ctx, 11, 700, BODY_STACK);
  tracking(ctx, 1.8);
  ctx.fillStyle = 'rgba(255,214,170,0.62)';
  ctx.fillText('BEST ' + formatScore(world.best), 1234, 104);
  tracking(ctx, 0);

  panel(ctx, 1084, 128, 170, 56, 12, 0.4);
  ctx.textAlign = 'right';
  setFont(ctx, 9, 700, BODY_STACK);
  tracking(ctx, 2);
  ctx.fillStyle = 'rgba(255,226,186,0.7)';
  ctx.fillText('LANTERNS', 1234, 146);
  tracking(ctx, 0);
  for (let i = 0; i < 3; i += 1) {
    drawLanternIcon(ctx, 1150 + i * 36, 168, 13, i < world.lanterns, world.t);
  }

  // Strain, bottom left.
  panel(ctx, 26, 622, 300, 74, 12, 0.4);
  ctx.textAlign = 'left';
  setFont(ctx, 10, 700, BODY_STACK);
  tracking(ctx, 2.2);
  ctx.fillStyle = 'rgba(255,226,186,0.78)';
  ctx.fillText('LINE STRAIN', 44, 646);
  tracking(ctx, 0);
  ctx.textAlign = 'right';
  setFont(ctx, 16, 900, BODY_STACK);
  ctx.fillStyle = world.strain > 78 ? PALETTE.danger : world.strain > 52 ? '#ffb27a' : '#b6f0e2';
  ctx.fillText(Math.round(world.strain) + '%', 308, 647);

  const sx = 44;
  const sy = 656;
  const sw = 264;
  const sh = 14;
  roundRect(ctx, sx, sy, sw, sh, 7);
  ctx.fillStyle = 'rgba(8,6,16,0.66)';
  ctx.fill();
  const strainFill = clamp(world.strain / 100, 0, 1);
  if (strainFill > 0.002) {
    ctx.save();
    roundRect(ctx, sx, sy, Math.max(sh, sw * strainFill), sh, 7);
    ctx.clip();
    const bar = ctx.createLinearGradient(sx, 0, sx + sw, 0);
    bar.addColorStop(0, '#63dcc9');
    bar.addColorStop(0.6, '#ffc46b');
    bar.addColorStop(1, '#ff4f5e');
    ctx.fillStyle = bar;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255,214,160,0.28)';
  ctx.lineWidth = 1;
  roundRect(ctx, sx, sy, sw, sh, 7);
  ctx.stroke();

  if (world.strain > 78) {
    const pulse = 0.5 + 0.5 * Math.sin(world.t * 7);
    ctx.textAlign = 'left';
    setFont(ctx, 9, 700, BODY_STACK);
    tracking(ctx, 1.8);
    ctx.fillStyle = 'rgba(255,120,120,' + (0.55 + 0.45 * pulse).toFixed(3) + ')';
    ctx.fillText('RELEASE TO COOL THE LINE', 44, 688);
    tracking(ctx, 0);
  } else {
    ctx.textAlign = 'left';
    setFont(ctx, 9, 700, BODY_STACK);
    tracking(ctx, 1.6);
    ctx.fillStyle = 'rgba(255,226,186,0.45)';
    ctx.fillText('HOLD TO PULL - LET GO TO COOL', 44, 688);
    tracking(ctx, 0);
  }

  // Combo callout near the kite.
  if (world.combo > 1) {
    const kite = kiteScreen(world);
    const fade = clamp(world.comboTimer / 1.2, 0, 1);
    ctx.textAlign = 'center';
    setFont(ctx, 22, 900);
    ctx.fillStyle = 'rgba(255,226,168,' + (0.5 + fade * 0.5).toFixed(3) + ')';
    ctx.fillText('x' + world.combo, kite.x, kite.y - 54);
    setFont(ctx, 9, 700, BODY_STACK);
    tracking(ctx, 1.6);
    ctx.fillStyle = 'rgba(255,214,170,0.7)';
    ctx.fillText('CHAIN', kite.x, kite.y - 40);
    tracking(ctx, 0);
  }

  ctx.textAlign = 'right';
  setFont(ctx, 11, 700, BODY_STACK);
  tracking(ctx, 1.5);
  ctx.fillStyle = 'rgba(255,232,200,0.55)';
  ctx.fillText('HOLD SPACE / MOUSE TO PULL   A / D STEER   P PAUSE   M SOUND', 1254, 690);
  tracking(ctx, 0);
  ctx.restore();
}

function drawLanternIcon(ctx, x, y, scale, lit, t) {
  ctx.save();
  ctx.translate(x, y);
  if (lit) {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, scale * 2.6);
    glow.addColorStop(0, 'rgba(255,206,128,0.4)');
    glow.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, scale * 2.6, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = lit ? '#5c2c12' : 'rgba(30,24,40,0.85)';
  ctx.fillRect(-scale * 0.34, -scale * 1.1, scale * 0.68, scale * 0.22);
  const body = ctx.createLinearGradient(0, -scale, 0, scale);
  if (lit) {
    body.addColorStop(0, '#fff1c2');
    body.addColorStop(0.5, '#ffc76c');
    body.addColorStop(1, '#e87a34');
  } else {
    body.addColorStop(0, 'rgba(96,86,114,0.5)');
    body.addColorStop(1, 'rgba(44,38,58,0.5)');
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, scale * 0.66, scale * 0.9, 0, 0, TAU);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = lit ? 'rgba(92,42,18,0.85)' : 'rgba(120,110,140,0.45)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.strokeStyle = lit ? 'rgba(120,54,20,0.35)' : 'rgba(120,110,140,0.2)';
  for (const rib of [-0.28, 0, 0.28]) {
    ctx.beginPath();
    ctx.moveTo(scale * rib, -scale * 0.72);
    ctx.quadraticCurveTo(scale * rib * 1.25, 0, scale * rib, scale * 0.72);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// Screens

function drawClearBanner(ctx, world) {
  const info = world.clearInfo;
  if (!info) return;
  const t = 1 - clamp(world.clearTimer / 2.8, 0, 1);
  const alpha = Math.min(smoothstep(t / 0.16), 1 - smoothstep((t - 0.78) / 0.22));
  if (alpha <= 0.001) return;
  const rise = (1 - smoothstep(t / 0.22)) * 22;
  const phase = PHASES[info.phase];
  const next = PHASES[info.next];

  ctx.save();
  ctx.globalAlpha = alpha;
  const band = ctx.createLinearGradient(0, 236, 0, 404);
  band.addColorStop(0, 'rgba(8,6,18,0)');
  band.addColorStop(0.28, 'rgba(8,6,18,0.78)');
  band.addColorStop(0.72, 'rgba(8,6,18,0.78)');
  band.addColorStop(1, 'rgba(8,6,18,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 236, W, 168);
  ctx.fillStyle = 'rgba(255,204,130,0.55)';
  ctx.fillRect(320, 286, W - 640, 1);
  ctx.fillRect(320, 358, W - 640, 1);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  setFont(ctx, 12, 700, BODY_STACK);
  tracking(ctx, 5);
  ctx.fillStyle = 'rgba(255,206,150,0.85)';
  ctx.fillText(phase.name + ' COMPLETE', W / 2, 272 + rise);
  tracking(ctx, 0);

  setFont(ctx, 66, 900);
  tracking(ctx, 4);
  ctx.fillStyle = '#ffedc0';
  ctx.fillText('PHASE CLEAR', W / 2, 338 + rise);
  tracking(ctx, 0);

  ctx.textAlign = 'center';
  setFont(ctx, 18, 700, BODY_STACK);
  tracking(ctx, 2);
  ctx.fillStyle = 'rgba(255,224,176,0.92)';
  const tail = next ? 'NEXT: ' + next.name + ' - ' + next.note.toUpperCase() : 'THE LAST LANTERN IS LIT';
  ctx.fillText('LIFT BANKED +' + formatScore(info.bonus) + '   |   ' + tail, W / 2, 384 + rise);
  tracking(ctx, 0);
  ctx.restore();
}

function drawTitle(ctx, world) {
  const scrim = ctx.createLinearGradient(0, 0, 860, 0);
  scrim.addColorStop(0, 'rgba(4,5,14,0.78)');
  scrim.addColorStop(0.58, 'rgba(4,5,14,0.46)');
  scrim.addColorStop(1, 'rgba(4,5,14,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, 900, H);

  // A few lanterns drifting up from the islands, all through the title.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i += 1) {
    const baseX = 180 + hash01(i * 7 + 3) * 1020;
    const drift = Math.sin(world.t * 0.25 + i * 2.1) * 26;
    const rise = (world.t * (6 + hash01(i * 7 + 9) * 10) + hash01(i * 7 + 5) * 620) % 620;
    const x = baseX + drift;
    const y = 600 - rise;
    const alpha = 0.5 * clamp(1 - rise / 640, 0, 1) * (0.5 + hash01(i * 7 + 11) * 0.6);
    if (alpha <= 0.02) continue;
    const r = 1.2 + hash01(i * 7 + 13) * 1.8;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
    glow.addColorStop(0, 'rgba(255,206,132,' + alpha.toFixed(3) + ')');
    glow.addColorStop(1, 'rgba(255,180,100,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,238,190,' + Math.min(1, alpha * 1.6).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  setFont(ctx, 12, 700, BODY_STACK);
  tracking(ctx, 5.4);
  ctx.fillStyle = 'rgba(255,210,160,0.85)';
  ctx.fillText('A KITE-FLYING TALE AT DUSK', 88, 132);
  tracking(ctx, 0);

  drawTitleWord(ctx, 'LANTERN', 84, 248, 104);
  drawTitleWord(ctx, 'TIDE', 84, 350, 104);

  ctx.fillStyle = 'rgba(255,204,140,0.5)';
  ctx.fillRect(90, 374, 300, 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rule = ctx.createLinearGradient(90, 0, 390, 0);
  rule.addColorStop(0, 'rgba(255,190,120,0.55)');
  rule.addColorStop(1, 'rgba(255,190,120,0)');
  ctx.fillStyle = rule;
  ctx.fillRect(90, 374, 300, 1.5);
  ctx.restore();

  setFont(ctx, 16, 700, BODY_STACK);
  tracking(ctx, 2.6);
  ctx.fillStyle = 'rgba(255,232,198,0.88)';
  ctx.fillText('HARVEST THE WIND BEFORE THE SQUALL', 90, 408);
  tracking(ctx, 0);

  const pulse = 0.5 + 0.5 * Math.sin(world.t * 3.2);
  panel(ctx, 88, 436, 392, 62, 14, 0.46, 0.3);
  ctx.save();
  roundRect(ctx, 88, 436, 392, 62, 14);
  ctx.strokeStyle = 'rgba(255,204,130,' + (0.3 + pulse * 0.5).toFixed(3) + ')';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
  setFont(ctx, 19, 900);
  tracking(ctx, 3);
  ctx.fillStyle = 'rgba(255,242,214,' + (0.7 + pulse * 0.3).toFixed(3) + ')';
  ctx.fillText('PRESS ENTER TO SAIL', 108, 476);
  tracking(ctx, 0);
  drawLanternIcon(ctx, 448, 467, 12, true, world.t);

  setFont(ctx, 11, 700, BODY_STACK);
  tracking(ctx, 1.8);
  ctx.fillStyle = 'rgba(255,226,190,0.62)';
  ctx.fillText('HOLD SPACE OR THE MOUSE TO PULL THE LINE', 90, 528);
  ctx.fillText('A / D OR POINTER LEFT-RIGHT TO STEER THE BOAT', 90, 548);
  ctx.fillStyle = 'rgba(255,226,190,0.45)';
  ctx.fillText('THREE DUSKS   |   THREE LANTERNS   |   ONE SQUALL', 90, 574);
  tracking(ctx, 0);

  setFont(ctx, 11, 700, BODY_STACK);
  tracking(ctx, 2.4);
  ctx.fillStyle = 'rgba(255,214,168,0.62)';
  ctx.fillText('BEST VOYAGE', 90, 610);
  tracking(ctx, 0);
  setFont(ctx, 18, 900, BODY_STACK);
  ctx.fillStyle = 'rgba(255,236,200,0.9)';
  ctx.fillText(world.best > 0 ? formatScore(world.best) : '--', 186, 611);
}

function drawTitleWord(ctx, text, x, y, size) {
  setFont(ctx, size, 900);
  tracking(ctx, 5);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(26,8,20,0.92)';
  ctx.strokeText(text, x, y);
  ctx.shadowColor = 'rgba(255,120,60,0.45)';
  ctx.shadowBlur = 38;
  const fill = ctx.createLinearGradient(0, y - size, 0, y + 10);
  fill.addColorStop(0, '#fff8e2');
  fill.addColorStop(0.5, '#ffdc96');
  fill.addColorStop(1, '#ff9a52');
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
  tracking(ctx, 0);
}

function drawGameOver(ctx, world) {
  const win = world.endReason === 'victory';
  const squall = world.endReason === 'squall';
  ctx.fillStyle = 'rgba(4,5,14,0.7)';
  ctx.fillRect(0, 0, W, H);

  const pw = 660;
  const ph = 462;
  const px = (W - pw) / 2;
  const py = 132;
  ctx.save();
  roundRect(ctx, px, py, pw, ph, 22);
  const shell = ctx.createLinearGradient(0, py, 0, py + ph);
  shell.addColorStop(0, 'rgba(20,15,34,0.94)');
  shell.addColorStop(1, 'rgba(8,7,16,0.96)');
  ctx.fillStyle = shell;
  ctx.fill();
  ctx.strokeStyle = win ? 'rgba(255,214,140,0.7)' : 'rgba(255,150,130,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, px + 8, py + 8, pw - 16, ph - 16, 16);
  ctx.strokeStyle = 'rgba(255,204,130,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  setFont(ctx, 11, 700, BODY_STACK);
  tracking(ctx, 4.5);
  ctx.fillStyle = win ? 'rgba(255,224,150,0.9)' : 'rgba(255,150,140,0.9)';
  ctx.fillText(win ? 'ALL THREE DUSKS FLOWN' : squall ? 'THE SQUALL TOOK THE SKY' : 'THE TETHER GAVE WAY', W / 2, py + 52);
  tracking(ctx, 0);

  setFont(ctx, 42, 900);
  tracking(ctx, 2);
  ctx.fillStyle = win ? '#ffe9ad' : '#ffd8bc';
  ctx.fillText(win ? 'EVERY LANTERN LIT' : squall ? 'THE SQUALL WINS' : 'THE LINE SNAPPED', W / 2, py + 106);
  tracking(ctx, 0);

  ctx.strokeStyle = 'rgba(255,204,130,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 96, py + 128);
  ctx.lineTo(px + pw - 96, py + 128);
  ctx.stroke();

  setFont(ctx, 10, 700, BODY_STACK);
  tracking(ctx, 3);
  ctx.fillStyle = 'rgba(255,220,180,0.7)';
  ctx.fillText('SCORE', W / 2, py + 162);
  tracking(ctx, 0);
  setFont(ctx, 64, 900);
  ctx.fillStyle = '#fff0cd';
  ctx.fillText(formatScore(world.score), W / 2, py + 222);

  setFont(ctx, 12, 700, BODY_STACK);
  tracking(ctx, 1.8);
  ctx.fillStyle = 'rgba(255,220,180,0.66)';
  ctx.fillText('BEST  ' + formatScore(world.best), W / 2, py + 252);
  if (world.newBest) {
    const pulse = 0.6 + 0.4 * Math.sin(world.t * 5);
    ctx.fillStyle = 'rgba(255,204,120,' + (0.7 + 0.3 * pulse).toFixed(3) + ')';
    setFont(ctx, 11, 900, BODY_STACK);
    tracking(ctx, 2.2);
    ctx.fillText('NEW BEST', W / 2, py + 274);
    tracking(ctx, 0);
  }

  setFont(ctx, 12, 700, BODY_STACK);
  tracking(ctx, 1.2);
  ctx.fillStyle = 'rgba(255,232,200,0.62)';
  const reached = 'DUSK ' + ['I', 'II', 'III'][world.endPhase] + '  |  LANTERNS KEPT ' + world.stats.kept + '  |  LIFT HARVESTED ' + Math.round(world.stats.lift);
  ctx.fillText(reached, W / 2, py + 306);
  tracking(ctx, 0);

  const pulse = 0.5 + 0.5 * Math.sin(world.t * 3.4);
  panel(ctx, px + 108, py + 340, pw - 216, 56, 12, 0.4, 0.22);
  ctx.save();
  roundRect(ctx, px + 108, py + 340, pw - 216, 56, 12);
  ctx.strokeStyle = 'rgba(255,204,130,' + (0.28 + pulse * 0.45).toFixed(3) + ')';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
  setFont(ctx, 17, 900);
  tracking(ctx, 2.6);
  ctx.fillStyle = 'rgba(255,240,210,' + (0.72 + pulse * 0.28).toFixed(3) + ')';
  ctx.fillText('PRESS R OR ENTER TO SAIL AGAIN', W / 2, py + 375);
  tracking(ctx, 0);

  setFont(ctx, 10, 700, BODY_STACK);
  tracking(ctx, 2);
  ctx.fillStyle = 'rgba(255,226,190,0.45)';
  ctx.fillText('M  SOUND', W / 2, py + 424);
  tracking(ctx, 0);
}

function drawPause(ctx, world) {
  ctx.fillStyle = 'rgba(4,5,14,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  setFont(ctx, 64, 900);
  tracking(ctx, 6);
  ctx.fillStyle = '#ffedc6';
  ctx.fillText('PAUSED', W / 2, 320);
  tracking(ctx, 0);
  setFont(ctx, 14, 700, BODY_STACK);
  tracking(ctx, 2.4);
  ctx.fillStyle = 'rgba(255,226,190,0.8)';
  ctx.fillText('P OR ESC TO RESUME', W / 2, 364);
  ctx.fillStyle = 'rgba(255,226,190,0.55)';
  ctx.fillText('R TO START THE RUN AGAIN', W / 2, 392);
  ctx.fillText('M TO TOGGLE SOUND', W / 2, 416);
  tracking(ctx, 0);
}
