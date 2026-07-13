import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function createEventsHarness() {
  const listeners = new Map();
  const calls = [];
  const context = vm.createContext({
    console,
    document: {
      addEventListener(type, handler) {
        listeners.set(type, handler);
      },
    },
    ui: {
      record(...args) { calls.push(args); },
      closeModal() { calls.push(['close']); },
    },
    router: {
      navigate(page) { calls.push(['navigate', page]); },
    },
    setTimeout,
  });
  const source = await fs.readFile(new URL('../src/ui/events.js', import.meta.url), 'utf8');
  vm.runInContext(`${source}\nglobalThis.__events = FuelMateEvents;`, context);
  context.__events.init();
  return { listeners, calls };
}

function createTarget(attributes, dataset = {}) {
  const element = {
    dataset,
    value: 'field-value',
    checked: true,
    getAttribute(name) { return attributes[name] || null; },
  };
  element.closest = (selector) => selector.includes(Object.keys(attributes)[0]) ? element : null;
  return element;
}

test('delegated UI events decode arguments and append element values', async () => {
  const { listeners, calls } = await createEventsHarness();
  const target = createTarget(
    { 'data-change-action': 'ui' },
    { uiMethod: 'record', uiArgs: encodeURIComponent(JSON.stringify(['setting'])), uiPassValue: 'true' },
  );
  listeners.get('change')({ target, preventDefault() {} });
  assert.deepEqual(calls, [['setting', 'field-value']]);
});

test('delegated click events navigate and only close a directly clicked overlay', async () => {
  const { listeners, calls } = await createEventsHarness();
  const nav = createTarget({ 'data-action': 'navigate' }, { page: 'settings' });
  listeners.get('click')({ target: nav, preventDefault() {} });

  const overlay = createTarget({ 'data-action': 'close-modal' });
  listeners.get('click')({ target: overlay, preventDefault() {} });
  const child = { closest: () => overlay };
  listeners.get('click')({ target: child, preventDefault() {} });

  assert.deepEqual(calls, [['navigate', 'settings'], ['close']]);
});
