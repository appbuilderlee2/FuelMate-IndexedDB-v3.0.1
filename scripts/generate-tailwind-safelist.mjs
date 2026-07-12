import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inputPath = path.join(root, 'index.html');
const outputPath = path.join(root, 'src', 'tailwind-safelist.html');

function isLikelyTailwindToken(token) {
  if (!token) return false;
  if (token.includes('${') || token.includes('}')) return false;
  if (token.includes('`')) return false;
  if (token.includes('<') || token.includes('>')) return false;
  if (token.includes('"') || token.includes("'")) return false;
  if (token.includes('=')) return false;
  if (token.startsWith('http') || token.startsWith('/')) return false;
  if (token.startsWith('ui.') || token.startsWith('utils.') || token.startsWith('store.')) return false;
  if (token.length > 200) return false;

  // Allow Tailwind arbitrary values (e.g. bottom-[calc(...)]), variants (e.g. dark:bg-...), and slashes.
  // Keep it permissive; Tailwind will ignore invalid candidates.
  return /^[^\s]+$/.test(token);
}

function extractClassValues(text) {
  const values = [];
  const re = /\bclass\s*=\s*(["'])(.*?)\1/gs;
  for (const m of text.matchAll(re)) values.push(m[2]);
  return values;
}

const hyphenlessWhitelist = new Set([
  'flex',
  'grid',
  'block',
  'inline',
  'inline-block',
  'hidden',
  'relative',
  'absolute',
  'fixed',
  'sticky',
  'inset-0',
  'overflow-hidden',
  'overflow-visible',
  'overflow-auto',
  'truncate',
  'sr-only',
  'shadow',
  'underline',
  'italic',
  'border',
  'ring',
  'transform',
  'transition',
  'animate',
]);

function extractTokensFromClassValue(classValue) {
  const tokens = new Set();
  const re = /[A-Za-z][A-Za-z0-9_:/.[\]()%+,=-]+/g;
  for (const m of classValue.matchAll(re)) {
    const t = m[0];
    // Skip obvious JS tokens/operators that can appear inside ${...}
    if (t === 'true' || t === 'false' || t === 'null' || t === 'undefined') continue;
    if (t.includes('${') || t.includes('}')) continue;
    if (!isLikelyTailwindToken(t)) continue;

    const hasTailwindShape = /[-:/[\]]/.test(t) || hyphenlessWhitelist.has(t);
    if (!hasTailwindShape) continue;

    // Remove trailing punctuation that can slip in via template expressions.
    tokens.add(t.replace(/[,;]+$/g, ''));
  }
  return tokens;
}

const html = await fs.readFile(inputPath, 'utf8');
const classValues = extractClassValues(html);
const tokens = new Set();

for (const v of classValues) {
  for (const t of extractTokensFromClassValue(v)) tokens.add(t);
}

const sorted = Array.from(tokens).sort();
const lines = [];
lines.push('<!doctype html>');
lines.push('<meta charset="utf-8">');
lines.push('<!-- Auto-generated: Tailwind safelist for runtime templates -->');

const chunkSize = 200;
for (let i = 0; i < sorted.length; i += chunkSize) {
  const chunk = sorted.slice(i, i + chunkSize).join(' ');
  lines.push(`<div class="${chunk}"></div>`);
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, lines.join('\n') + '\n', 'utf8');

console.log(`Generated ${path.relative(root, outputPath)} with ${sorted.length} class tokens.`);
