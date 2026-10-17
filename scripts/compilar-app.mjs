import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const main = spawnSync(process.execPath, [path.join(raiz, 'scripts/compilar-main.cjs')],
    { cwd: raiz, stdio: 'inherit', windowsHide: true });
if (main.error) throw main.error;
if (main.status !== 0) process.exit(main.status || 1);
await build({ configFile: path.join(raiz, 'vite.config.mjs') });
