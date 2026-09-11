import assert from 'node:assert/strict';
import test from 'node:test';

await import('../src/core/security.js');
const { escapeAttribute, escapeHtml, isSafeId, neutralizeSpreadsheetFormula } = globalThis.FuelMateSecurity;

test('escapes executable HTML in notes and labels', () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)">'),
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;',
  );
});

test('escapes quotes and backticks used in HTML attributes', () => {
  assert.equal(escapeAttribute('" onfocus=`alert(1)`'), '&quot; onfocus=&#96;alert(1)&#96;');
});

test('accepts generated IDs and rejects injection-shaped IDs', () => {
  assert.equal(isSafeId('doc:vehicle-123:insurance'), true);
  assert.equal(isSafeId('abc_123.def-456'), true);
  assert.equal(isSafeId("x');alert(1);//"), false);
  assert.equal(isSafeId(''), false);
});

test('neutralizes formulas in spreadsheet exports', () => {
  assert.equal(neutralizeSpreadsheetFormula('=HYPERLINK("https://example.com")'), '\'=HYPERLINK("https://example.com")');
  assert.equal(neutralizeSpreadsheetFormula('  +1+1'), "'  +1+1");
  assert.equal(neutralizeSpreadsheetFormula('ordinary note'), 'ordinary note');
});
test('import preview escapes filenames and all settings summary values', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/ui/actions/data.js', import.meta.url), 'utf8');
  assert.ok(source.includes('utils.escapeHtml(fileName)'));
  for (const field of ['units', 'currency', 'language']) assert.ok(source.includes(`utils.escapeHtml(incomingSummary.settings.${field}`));
});
