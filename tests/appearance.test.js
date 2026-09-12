import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

async function harness() {
  const root = { dataset: {}, style: {} };
  const stored = new Map();
  const media = { matches: false, addEventListener(_, fn) { this.change = fn; } };
  const context = vm.createContext({
    window: { matchMedia: () => media },
    document: { documentElement: root, querySelector: () => null },
    localStorage: { setItem: (k, v) => stored.set(k, v) },
    ui: {}, store: { data: { settings: { appearance: 'apple-fluid-system' } }, saveData: async () => {} },
  });
  const main = await fs.readFile(new URL('../src/main.js', import.meta.url), 'utf8');
  vm.runInContext(main.slice(0, main.indexOf('const router')), context);
  vm.runInContext(await fs.readFile(new URL('../src/ui/pages/settings.js', import.meta.url), 'utf8'), context);
  context.ui.render = () => {};
  return { context, root, stored, media, appearance: context.window.FuelMateAppearance };
}

test('all appearance families follow system changes and explicit modes stay fixed', async () => {
  const h = await harness();
  for (const family of ['apple-fluid', 'ios-native', 'ios-glass']) {
    h.media.matches = false;
    assert.equal(h.appearance.apply(`${family}-system`), `${family}-system`);
    assert.equal(h.root.dataset.colorScheme, 'light');
    h.media.matches = true;
    h.media.change();
    assert.equal(h.root.dataset.colorScheme, 'dark');
    h.appearance.apply(`${family}-light`);
    h.media.change();
    assert.equal(h.root.dataset.colorScheme, 'light');
    h.appearance.apply(`${family}-dark`);
    assert.equal(h.stored.get('fuelmate_appearance'), `${family}-dark`);
  }
  assert.equal(h.appearance.normalize('unknown'), 'apple-fluid-system');
});

test('failed appearance persistence preserves the previous selection and rendered theme', async () => {
  const h = await harness();
  h.appearance.apply('apple-fluid-system');
  h.context.store.saveData = async () => { throw new Error('disk full'); };
  await assert.rejects(h.context.ui.updateAppearance('ios-glass-dark'), /disk full/);
  assert.equal(h.context.store.data.settings.appearance, 'apple-fluid-system');
  assert.equal(h.root.dataset.appearance, 'apple-fluid-system');
  h.context.store.saveData = async () => {};
  await h.context.ui.updateAppearance('ios-native-light');
  assert.equal(h.root.dataset.appearance, 'ios-native-light');
});

test('transparency preference is persisted and restored without changing the style', async () => {
  const h = await harness();
  await h.context.ui.updateTransparency({ checked: true });
  assert.equal(h.root.dataset.reduceTransparency, 'true');
  assert.equal(h.stored.get('fuelmate_reduce_transparency'), 'true');
  assert.equal(h.context.store.data.settings.appearance, 'apple-fluid-system');
});
