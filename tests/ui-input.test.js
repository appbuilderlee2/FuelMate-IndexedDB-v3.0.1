import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

async function createUiHarness() {
  const elements = new Map();
  const getElement = (id) => {
    if (!elements.has(id)) {
      elements.set(id, {
        value: '',
        checked: false,
        dataset: {},
        innerText: '',
        placeholder: '',
        focus() {},
        classList: { contains: () => false },
      });
    }
    return elements.get(id);
  };
  const saved = [];
  const alerts = [];
  const context = vm.createContext({
    console,
    document: { getElementById: getElement },
    store: {
      data: { settings: { activeVehicleId: 'vehicle-1' }, logs: [] },
      getActiveVehicle: () => ({ id: 'vehicle-1', currentOdometer: 1000 }),
      addLog: async (log) => saved.push(log),
      updateLog: async (log) => saved.push(log),
    },
    utils: { newId: () => 'log-1', t: (key) => key },
    alert: (message) => alerts.push(message),
    setTimeout,
    clearTimeout,
  });
  const calculations = await fs.readFile(new URL('../src/core/calculations.js', import.meta.url), 'utf8');
  vm.runInContext(calculations, context);
  for (const file of [
    'src/ui.js',
    'src/ui/base.js',
    'src/ui/actions/fuel.js',
    'src/ui/actions/maintenance.js',
    'src/ui/actions/records.js',
  ]) {
    const source = await fs.readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    vm.runInContext(source, context);
  }
  vm.runInContext('globalThis.__ui = ui;', context);
  context.__ui.closeModal = () => {};
  context.__ui.render = () => {};
  return { ui: context.__ui, getElement, saved, alerts };
}

test('fuel input calculates the third value from the last two fields', async () => {
  const { ui, getElement } = await createUiHarness();
  getElement('l_liters').value = '40';
  getElement('l_price').value = '2';
  ui._fuelCalcLast = [];
  ui.calcFuel('vol');
  ui.calcFuel('price');
  assert.equal(getElement('l_cost').value, '80.00');
});

test('fuel submission rejects negative and missing values', async () => {
  const { ui, getElement, saved, alerts } = await createUiHarness();
  getElement('l_date').value = '';
  getElement('l_odo').value = '-10';
  getElement('l_liters').value = '-5';
  getElement('l_cost').value = '-20';
  await ui.submitFuel('');
  assert.equal(saved.length, 0);
  assert.deepEqual(alerts, ['validation_date']);
});

test('valid fuel submission preserves the IndexedDB-compatible record shape', async () => {
  const { ui, getElement, saved } = await createUiHarness();
  getElement('l_date').value = '2026-07-13';
  getElement('l_odo').value = '1200';
  getElement('l_liters').value = '40';
  getElement('l_cost').value = '80';
  getElement('l_loc').value = ' Station ';
  getElement('l_partial').checked = true;
  await ui.submitFuel('');
  assert.deepEqual(JSON.parse(JSON.stringify(saved[0])), {
    id: 'log-1',
    vehicleId: 'vehicle-1',
    type: 'fuel',
    date: '2026-07-13',
    odometer: 1200,
    liters: '40',
    cost: '80',
    location: 'Station',
    isPartial: true,
    notes: '',
  });
});

test('trip mode converts once and returns to odometer mode', async () => {
  const { ui, getElement } = await createUiHarness();
  const input = getElement('l_odo');
  const button = getElement('l_odo_mode');
  input.value = '1000';
  input.dataset.mode = 'odo';
  ui.toggleTripMode(button);
  input.value = '250';
  ui.normalizeTripOdometer(input);
  assert.equal(input.value, '1250');
  assert.equal(input.dataset.mode, 'odo');
  ui.normalizeTripOdometer(input);
  assert.equal(input.value, '1250');
});

test('service and parking submissions reject negative values', async () => {
  const { ui, getElement, saved, alerts } = await createUiHarness();
  getElement('l_type').value = 'service';
  getElement('l_date').value = '2026-07-13';
  getElement('l_odo').value = '-1';
  getElement('l_cost').value = '';
  await ui.submitService('');
  assert.equal(saved.length, 0);
  assert.equal(alerts.at(-1), 'validation_odometer');

  getElement('p_date').value = '2026-07-13';
  getElement('p_cost').value = '-1';
  await ui.submitParking('');
  assert.equal(saved.length, 0);
  assert.equal(alerts.at(-1), 'validation_cost');
});
