import assert from 'node:assert/strict';
import test from 'node:test';

await import('../src/core/calculations.js');
const {
  calculateFuelEfficiencyFromLogs,
  calcEfficiencyValue,
  isNonNegativeNumber,
  isValidIsoDate,
  pressureFromKpa,
  pressureToKpa,
  validateImportPayload,
} = globalThis.FuelMateCore;

test('calculates litres per 100 km', () => {
  assert.equal(calcEfficiencyValue(40, 500, 'L', 'km'), 8);
});

test('calculates miles per gallon', () => {
  assert.equal(calcEfficiencyValue(10, 300, 'Gal', 'mi'), 30);
});

test('rejects empty and non-positive efficiency inputs', () => {
  assert.equal(calcEfficiencyValue(0, 100, 'L', 'km'), null);
  assert.equal(calcEfficiencyValue(10, 0, 'L', 'km'), null);
  assert.equal(calcEfficiencyValue('bad', 100, 'L', 'km'), null);
});

test('converts tyre pressure without losing precision', () => {
  const kpa = pressureToKpa(32, 'psi');
  assert.ok(Math.abs(kpa - 220.63232) < 0.00001);
  assert.ok(Math.abs(pressureFromKpa(kpa, 'psi') - 32) < 0.00001);
  assert.equal(pressureToKpa(2.2, 'bar'), 220.00000000000003);
});

test('validates ISO dates and non-negative form values', () => {
  assert.equal(isValidIsoDate('2026-02-28'), true);
  assert.equal(isValidIsoDate('2026-02-30'), false);
  assert.equal(isValidIsoDate(''), false);
  assert.equal(isNonNegativeNumber(0), true);
  assert.equal(isNonNegativeNumber(-1), false);
  assert.equal(isNonNegativeNumber('1abc'), false);
  assert.equal(isNonNegativeNumber('   '), false);
  assert.equal(isNonNegativeNumber('', { allowEmpty: true }), true);
  assert.equal(isNonNegativeNumber(0, { positive: true }), false);
});

test('combines partial fills between full tanks', () => {
  const logs = [
    { type: 'fuel', odometer: 1000, liters: 40, isPartial: false },
    { type: 'fuel', odometer: 1200, liters: 10, isPartial: true },
    { type: 'fuel', odometer: 1500, liters: 30, isPartial: false },
  ];
  assert.equal(calculateFuelEfficiencyFromLogs(logs, 'L', 'km'), 8);
});

test('rejects malformed imported values, types, and duplicate IDs', () => {
  const safeId = (value) => /^[A-Za-z0-9._:-]+$/.test(value);
  const valid = validateImportPayload({
    vehicles: [{ id: 'v1', year: 2024, currentOdometer: 1000 }],
    logs: [{ id: 'l1', vehicleId: 'v1', type: 'fuel', date: '2026-01-01', odometer: 1100, liters: 40, cost: 80 }],
    settings: {},
  }, safeId);
  assert.deepEqual(valid.errors, []);

  const invalid = validateImportPayload({
    vehicles: [{ id: 'v1' }, { id: 'v1' }],
    logs: [
      { id: 'l1', vehicleId: 'v1', type: 'alien', date: 'not-a-date', odometer: -1 },
      { id: 'l1', vehicleId: 'v1', type: 'fuel', date: '2026-01-01', odometer: 1, liters: -4, cost: -8 },
    ],
    settings: [],
  }, safeId);
  assert.ok(invalid.errors.includes('vehicle_duplicate_id'));
  assert.ok(invalid.errors.includes('log_invalid_type'));
  assert.ok(invalid.errors.includes('log_invalid_date'));
  assert.ok(invalid.errors.includes('log_duplicate_id'));
  assert.ok(invalid.errors.includes('log_invalid_fuel_amount'));
  assert.ok(invalid.errors.includes('log_invalid_cost'));
  assert.ok(invalid.errors.includes('settings_not_object'));
});

test('validates reminder dates and directional tire rotations in imports', () => {
  const safeId = (value) => /^[A-Za-z0-9._:-]+$/.test(value);
  const valid = validateImportPayload({
    vehicles: [{ id: 'v1', currentOdometer: 1000 }],
    logs: [{
      id: 'r1', vehicleId: 'v1', type: 'tire_rotation', date: '2026-07-14', odometer: 1000,
      tireMoves: [
        { from: 'front_left', to: 'rear_left' }, { from: 'front_right', to: 'rear_right' },
        { from: 'rear_left', to: 'front_right' }, { from: 'rear_right', to: 'front_left' },
      ],
    }],
    settings: { reminderCenter: { snoozedUntil: { 'tire:v1:asset:r1': '2026-07-21T00:00:00.000Z' }, done: {} } },
  }, safeId);
  assert.deepEqual(valid.errors, []);

  const invalid = validateImportPayload({
    vehicles: [{ id: 'v1', currentOdometer: 1000 }],
    logs: [{
      id: 'r1', vehicleId: 'v1', type: 'tire_rotation', date: '2026-07-14', odometer: 1000,
      tireMoves: [{ from: 'front_left', to: 'rear_left' }, { from: 'front_right', to: 'rear_left' }],
    }],
    settings: { reminderCenter: { snoozedUntil: { 'tire:v1': 'bad-date' }, done: { 'tire:v1': 'yes' } } },
  }, safeId);
  assert.ok(invalid.errors.includes('log_invalid_tire_rotation'));
  assert.ok(invalid.errors.includes('settings_invalid_snooze'));
  assert.ok(invalid.errors.includes('settings_invalid_done'));
});
