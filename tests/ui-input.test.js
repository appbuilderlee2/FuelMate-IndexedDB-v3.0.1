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
  const tireInputs = [];
  const context = vm.createContext({
    console,
    document: {
      getElementById: getElement,
      querySelectorAll: selector => selector === 'input[name="l_tire_positions"]' ? tireInputs : [],
    },
    store: {
      data: { settings: { activeVehicleId: 'vehicle-1' }, logs: [] },
      getActiveVehicle: () => ({ id: 'vehicle-1', currentOdometer: 1000 }),
      addLog: async (log) => saved.push(log),
      updateLog: async (log) => saved.push(log),
    },
    utils: {
      newId: () => `log-${saved.length + 1}`,
      t: (key) => key,
      getTirePositions: () => ['front_left', 'front_right', 'rear_left', 'rear_right'],
      getTireReplacementPositions: log => Array.isArray(log?.tirePositions) ? log.tirePositions : (log?.tirePosition ? [log.tirePosition] : []),
      getPressureUnit: () => 'kPa',
      pressureToKpa: value => Number(value),
      getDistUnit: () => 'km',
    },
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
  return { ui: context.__ui, getElement, saved, alerts, tireInputs };
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

test('tire replacement submits one shared event for multiple positions', async () => {
  const { ui, getElement, saved, tireInputs } = await createUiHarness();
  tireInputs.push(
    { value: 'front_left', checked: true },
    { value: 'front_right', checked: true },
    { value: 'rear_left', checked: false },
    { value: 'rear_right', checked: false },
  );
  getElement('l_type').value = 'tire_replace';
  getElement('l_date').value = '2026-08-01';
  getElement('l_odo').value = '10000';
  getElement('l_cost').value = '420';
  getElement('l_tire_brand').value = 'Michelin Primacy 4';
  getElement('l_tire_tread').value = '7';
  getElement('l_tire_pressure').value = '240';
  getElement('l_tire_remaining_dist').value = '40000';
  getElement('l_tire_remaining_months').value = '48';
  await ui.submitService('');
  assert.equal(saved.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(saved[0].tirePositions)), ['front_left', 'front_right']);
  assert.deepEqual(JSON.parse(JSON.stringify(Object.keys(saved[0].tireIds))), ['front_left', 'front_right']);
  assert.equal(saved[0].tirePosition, 'front_left');
  assert.equal(saved[0].cost, '420');
});

test('fuel editing saves notes and preserves extra existing fields', async () => {
  const existing = { id: 'old', vehicleId: 'v', notes: 'Previous note', receiptId: 'receipt-1' };
  let saved;
  const fields = { l_loc: { value: 'Station' }, l_partial: { checked: false }, l_notes: { value: 'Updated note' } };
  const ui = { validateDateField: () => '2026-09-11', validateNumberField: () => ({ ok: true, number: 1200, value: '40' }), closeModal() {}, render() {} };
  const context = vm.createContext({ ui, document: { getElementById: id => fields[id] }, store: { data: { logs: [existing], settings: { activeVehicleId: 'other' } }, updateLog: async log => { saved = log; } } });
  vm.runInContext(await fs.readFile(new URL('../src/ui/actions/fuel.js', import.meta.url), 'utf8'), context);
  await ui.submitFuel('old');
  assert.equal(saved.notes, 'Updated note');
  assert.equal(saved.vehicleId, 'v');
  assert.equal(saved.receiptId, 'receipt-1');
  delete fields.l_notes;
  await ui.submitFuel('old');
  assert.equal(saved.notes, 'Previous note');
});

test('parking edit keeps the original vehicle and extra fields', async () => {
  const { ui, getElement, saved } = await createUiHarness();
  const existing = { id: 'park-1', vehicleId: 'other-car', type: 'parking', receiptId: 'receipt-1' };
  // The active vehicle can differ when a saved record is opened by ID.
  const context = vm.createContext({
    ui,
    store: { data: { logs: [existing], settings: { activeVehicleId: 'vehicle-1' } }, updateLog: async log => saved.push(log) },
    document: { getElementById: getElement },
    utils: { newId: () => 'new', t: key => key },
  });
  vm.runInContext(await fs.readFile(new URL('../src/ui/actions/records.js', import.meta.url), 'utf8'), context);
  getElement('p_date').value = '2026-09-26';
  getElement('p_cost').value = '12';
  await ui.submitParking('park-1');
  assert.equal(saved.at(-1).vehicleId, 'other-car');
  assert.equal(saved.at(-1).receiptId, 'receipt-1');
});

test('vehicle edit preserves service baselines and new vehicles establish them', async () => {
  const elements = new Map(Object.entries({ v_make: 'Mazda', v_model: '2', v_year: '2012', v_odo: '110000', v_tire_dist: '40000', v_type: 'hatch', v_unit: 'L', v_drive: 'fwd', v_maint_dist: '10000', v_maint_time: '12', v_tire_years: '4' }).map(([key, value]) => [key, { value }]));
  const saved = [];
  const existing = { id: 'car-1', maintenanceBaselineOdometer: 95000, maintenanceBaselineDate: '2026-01-01', customField: 'keep' };
  const ui = { validateNumberField: id => ({ ok: true, number: Number(elements.get(id).value) }), closeModal() {}, render() {} };
  const context = vm.createContext({
    ui, document: { getElementById: id => elements.get(id), querySelector: () => ({ value: 'red' }) },
    store: { data: { vehicles: [existing], settings: { activeVehicleId: 'car-1' } }, getVehicleLogs: () => [], updateVehicle: async v => saved.push(v), addVehicle: async v => saved.push(v) },
    utils: { newId: () => 'car-2', t: key => key }, FuelMateCore: { localDateKey: () => '2026-09-26' }, alert: () => {},
  });
  vm.runInContext(await fs.readFile(new URL('../src/ui/actions/vehicles.js', import.meta.url), 'utf8'), context);
  await ui.saveVehicle('car-1');
  assert.equal(saved[0].maintenanceBaselineOdometer, 95000);
  assert.equal(saved[0].maintenanceBaselineDate, '2026-01-01');
  assert.equal(saved[0].customField, 'keep');
  await ui.saveVehicle('');
  assert.equal(saved[1].maintenanceBaselineOdometer, 110000);
  assert.equal(saved[1].maintenanceBaselineDate, '2026-09-26');
});
