import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('opening a new editor cancels a previous modal close animation', async () => {
  const timers = new Map();
  let nextTimer = 0;
  const element = () => {
    const classes = new Set(['hidden', 'opacity-0', 'translate-y-full']);
    return {
      innerHTML: '',
      classList: {
        add: name => classes.add(name),
        remove: name => classes.delete(name),
        contains: name => classes.has(name),
      },
    };
  };
  const overlay = element();
  const content = element();
  const context = vm.createContext({
    ui: {}, store: { data: { settings: { appearance: 'apple-fluid-system' } } },
    document: { getElementById: id => id === 'modal-overlay' ? overlay : content },
    setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
  });
  vm.runInContext(await fs.readFile(new URL('../src/ui/base.js', import.meta.url), 'utf8'), context);

  context.ui.openModal('Reminder details');
  context.ui.closeModal();
  context.ui.openModal('Source editor');
  for (const callback of [...timers.values()]) callback();
  assert.equal(overlay.classList.contains('hidden'), false);
  assert.equal(overlay.classList.contains('opacity-0'), false);
  assert.equal(content.innerHTML, 'Source editor');
});

test('a parking card without odometer does not render an orphaned distance unit', async () => {
  const context = vm.createContext({
    ui: {},
    store: { data: { vehicles: [], settings: { currency: '$' } } },
    utils: {
      formatDate: value => value,
      formatCurrency: value => `$${value}`,
      getDistUnit: () => 'km',
      escapeHtml: value => String(value),
      escapeAttr: value => String(value),
      t: key => key,
    },
  });
  vm.runInContext(await fs.readFile(new URL('../src/ui/base.js', import.meta.url), 'utf8'), context);
  const withoutOdometer = context.ui.renderLogCard({ id: 'p1', vehicleId: 'v1', type: 'parking', date: '2026-09-26', cost: 12, odometer: '' });
  assert.doesNotMatch(withoutOdometer, /class="text-xs theme-text-sub mt-0\.5">\s*km/);
  const withOdometer = context.ui.renderLogCard({ id: 'p2', vehicleId: 'v1', type: 'parking', date: '2026-09-26', cost: 12, odometer: 0 });
  assert.match(withOdometer, />0 km<\/div>/);
});
