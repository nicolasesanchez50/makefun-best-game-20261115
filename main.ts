// LANTERN TIDE's entrypoint for make.fun's best-game-01 bounty. Node 22, standard library only:
// it copies this repository's game/ (the playable static game) and screenshots/ into the output
// directory and writes dossier.json there with the kit's own buildDossier, so the judge reads one
// self-contained artifact and the gate can rebuild the dossier byte for byte.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps, as the kit states them. buildDossier refuses an entry that breaks one, so a
// run of this program fails loudly here instead of at grading time.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyFolder(name: string): void {
  const source = join(repoRoot, name);
  if (!existsSync(source)) {
    throw new Error('main.ts: ' + name + '/ is missing beside the entrypoint');
  }
  cpSync(source, join(outputDir, name), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyFolder('game');
copyFolder('screenshots');

const dossier = buildDossier(outputDir, CAPS);
const dossierPath = join(outputDir, 'dossier.json');
writeFileSync(dossierPath, dossier);

const indexHtml = join(outputDir, 'game', 'index.html');
const indexBytes = statSync(indexHtml).size;
if (indexBytes > 1024 * 1024) {
  throw new Error('main.ts: game/index.html is ' + indexBytes + ' bytes, over the 1 MiB cap');
}

const shots = readdirSync(join(outputDir, 'screenshots')).filter((name) => /\.(png|jpe?g)$/i.test(name));
console.log('lantern-tide: dossier ' + dossier.byteLength + ' bytes -> ' + dossierPath);
console.log('lantern-tide: game/index.html ' + indexBytes + ' bytes, ' + shots.length + ' screenshots, output dir ' + outputDir);
