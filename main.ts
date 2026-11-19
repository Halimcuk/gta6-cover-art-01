// Neon Coast — entry for make.fun's gta6-cover-art-01 ("Make GTA 6 Cover Art").
// A Node 22 program, standard library only. It hands the app in: it copies this
// repository's app/ (the offline cover maker) and screenshots/ into the output
// directory and writes dossier.json with the vendored make.fun library, so the
// judge can read the app's source and screenshots.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output; without it the
// program writes to /output. Running it twice writes the same bytes both times.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps (reference/gate.json): text_max_bytes is the only one that
// shapes the dossier's bytes; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or
// 48 MiB of app files in all, or a path under app/ over 1000 bytes). app/ counts
// beside /output's own 1000-entry cap, together with screenshots/ and dossier.json.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
