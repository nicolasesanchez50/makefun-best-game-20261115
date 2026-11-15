# LANTERN TIDE

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/nicolasesanchez50/makefun-best-game-20261115/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/nicolasesanchez50/makefun-best-game-20261115/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An entry in the [make.fun best-game-01 bounty](https://make.fun/bounty/best-game-01): build the best
game that runs in a desktop browser from static files, judged on its screenshots and its source.

## The game

You are alone in a small boat at dusk, in an archipelago, with three paper lanterns and one kite
on a long tether. The squall is coming. Hold the line and the kite climbs into the last warm light;
let go and it drifts. Rising rings of wind carry lift, dark cells drink it back, and the line only
takes so much strain before it parts. Fill the lantern through three dusks, each shorter and
windier than the last, and keep all three lanterns alight. It is a game about the rhythm of
pulling and letting go: greedy pulling fills the lantern fast and snaps the line, and a slack line
keeps you safe but lets the squall clock run down.

A kite-flying game at dusk over an archipelago. You sit in a small boat with three paper
lanterns and one kite on a long tether. The squall is coming. Hold the line and the kite climbs
into the last warm light; let go and it drifts. Rising rings of wind carry lift, dark cells drink
it back, and the line only takes so much strain before it parts. Fill the lantern through three
dusks, each shorter and windier than the last, and keep all three lanterns alight.

All art is drawn with Canvas 2D gradients and shapes. There are no image files, no audio files,
no libraries and no network requests: `game/` is a few plain ES modules and a page.

## Play

Serve `game/` with any static server and open `index.html` in a desktop browser:

- `node serve.ts` then open <http://localhost:8080>
- or `python3 -m http.server 8080 --directory game`

Opening `game/index.html` straight from disk works too, but Chrome blocks ES modules on
`file://` unless it is started with `--allow-file-access-from-files`; a static server is the
normal way to play it, and the way the finalist review serves it.

### Controls

| Input | Action |
| --- | --- |
| Space / W / Up, or hold the left mouse button | Pull the line: tension rises and the kite climbs |
| Release | Let the line out: the kite drifts, strain cools |
| A / D / Left / Right, or pointer left-right | Steer the boat and the kite's heading |
| P or Escape | Pause and resume |
| R | Restart the run |
| M | Mute or unmute the synthesised sound |
| Enter / Space / click | Start from the title, restart on the results screen |

### Rules

- Gust pockets are the pale rings that rise from the sea. Fly the kite through one to bank lift
  and score. Chaining pockets within three seconds multiplies the score, up to x5.
- Storm cells are the dark vortices. Inside one the kite is dragged down, the lantern drains and
  the line strains fast. Steer away from them.
- Strain climbs with tension and with altitude. A slack line cools off. At 100 percent the tether
  snaps and you lose a lantern; three lost lanterns end the run.
- The lantern fills with collected lift. Fill it to clear the dusk; the next one has a higher
  target, stronger wind and more cells. Clear all three to win.
- The squall clock is the phase timer. When it runs out the line is torn away: a lantern is lost
  and the clock is pushed back twenty seconds.

Score is collected lift times the phase multiplier, plus a bonus for the lanterns you still hold
and the seconds left when a dusk is cleared, plus a bonus for every lantern kept at the end. The
best score is kept in `localStorage`.

## Files

```
game/index.html        the page: canvas, styles, one module script, a screen-reader status line
game/src/config.js     palette, phase table and every tuning constant
game/src/random.js     seeded PRNG and hash helpers (mulberry32)
game/src/input.js      keyboard and pointer mapping, mute, synthesised WebAudio blips
game/src/sim.js        boat and kite physics, gusts, storms, strain, phases, scoring
game/src/render.js     every drawn thing: sky, sea, islands, kite, HUD and all screens
game/src/shots.js      deterministic staging for ?shot=start|play|squall|end
game/src/main.js       boot, fixed 1/60 s loop, screen transitions, best score
main.ts                the make.fun entrypoint: copies game/ + screenshots/, writes dossier.json
serve.ts               a static server for play-testing
vendor/makefun-game.ts the kit's dossier library, unchanged
screenshots/           four real renders at 1280x720
shots.json             how each screenshot was staged
```

## Screenshots

`?shot=start|play|squall|end` (with an optional `&seed=N`) stages a scene deterministically
instead of running the loop, paints it and sets `window.__shotReady = true`:

```
google-chrome --headless=new --window-size=1280,720 --screenshot=shot.png \
  "file://$PWD/game/index.html?shot=squall&seed=7"
```

## Submitting

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program copies `game/` and `screenshots/` into the output directory and writes
`dossier.json` there with `buildDossier` from `vendor/makefun-game.ts`.

## License

MIT. See `LICENSE`.
