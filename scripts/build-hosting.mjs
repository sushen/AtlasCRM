import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
const root = new URL('../', import.meta.url);
const target = new URL('.firebase/hosting-public/', root);
// Resolve and verify the fixed staging directory before clearing stale assets.
if (resolve(fileURLToPath(target)) !== join(resolve(fileURLToPath(root)), '.firebase', 'hosting-public')) throw Error('Invalid staging directory');
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const path of ['index.html', 'login.html', '404.html', 'css', 'js', 'images']) {
  await cp(new URL(path, root), new URL(path, target), { recursive: true });
}
console.log('Hosting assets prepared in .firebase/hosting-public');
