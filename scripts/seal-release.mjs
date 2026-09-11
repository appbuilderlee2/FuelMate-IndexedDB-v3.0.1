import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const hashes = {};
async function walk(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await walk(file);
    else if (file !== 'dist/sw.js') hashes[path.relative('dist', file)] = createHash('sha256').update(await fs.readFile(file)).digest('hex');
  }
}
await walk('dist');
const sw = await fs.readFile('dist/sw.js', 'utf8');
await fs.writeFile('dist/sw.js', sw.replace('const RELEASE_HASHES = null;', `const RELEASE_HASHES = ${JSON.stringify(hashes)};`));
console.log(`Verified-release manifest: ${Object.keys(hashes).length} assets`);
