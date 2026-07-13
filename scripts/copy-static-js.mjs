import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceRoot = path.join(root, 'src');
const outputRoot = path.join(root, 'public', 'src');
const files = [
  'core/security.js',
  'core/version.js',
  'core/calculations.js',
  'translations.js',
  'store.js',
  'utils.js',
  'ui.js',
  'ui/base.js',
  'ui/pages/dashboard.js',
  'ui/pages/records.js',
  'ui/pages/settings.js',
  'ui/actions/vehicles.js',
  'ui/actions/fuel.js',
  'ui/actions/maintenance.js',
  'ui/actions/records.js',
  'ui/actions/data.js',
  'ui/actions/dialogs.js',
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
