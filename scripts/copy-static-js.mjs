import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const outputRoot = path.join(root, 'public', 'src');
const files = [
  'core/security.js',
  'core/calculations.js',
  'translations.js',
  'store.js',
  'utils.js',
  'ui.js',
  'main.js',
];

await fs.rm(outputRoot, { recursive: true, force: true });

for (const file of files) {
  const source = path.join(sourceRoot, file);
  const output = path.join(outputRoot, file);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.copyFile(source, output);
}

console.log(`Copied ${files.length} application scripts into public/src.`);
