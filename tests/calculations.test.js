import assert from 'node:assert/strict';
import test from 'node:test';

await import('../src/core/calculations.js');
const {
  addCalendarDays,
  addCalendarMonths,
  calculateFuelEfficiencyFromLogs,
  calcEfficiencyValue,
  daysUntilCalendarDate,
  isNonNegativeNumber,
  isValidIsoDate,
  normalizeTireReplacementEntries,
  pressureFromKpa,
  pressureToKpa,
  validateImportPayload,
} = globalThis.FuelMateCore;

test('local date keys preserve Adelaide date and month boundaries', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'Australia/Adelaide';
  try {
    assert.equal(FuelMateCore.localDateKey(new Date(2026, 8, 11, 8)), '2026-09-11');
    assert.equal(FuelMateCore.localDateKey(new Date(2026, 8, 1)).slice(0, 7), '2026-09');
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('calendar intervals clamp month ends and count local days across daylight saving', () => {
  const previous = process.env.TZ;
  process.env.TZ = 'Australia/Adelaide';
  try {
    assert.equal(addCalendarMonths('2026-08-31', 6), '2027-02-28');
    assert.equal(addCalendarMonths('2024-02-29', 12), '2025-02-28');
  assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');
    assert.equal(FuelMateCore.calendarDaysForMonths('2026-09-26', 12), 365);
    assert.equal(FuelMateCore.calendarDaysForMonths('2024-02-29', 48), 1461);
    assert.equal(FuelMateCore.calendarDaysForMonths('2026-09-26', 1_000_000_000), null);
    assert.equal(daysUntilCalendarDate('2026-10-04', new Date('2026-10-03T23:00:00Z')), 0);
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('import settings reject markup and unsupported enums but retain legacy currencies', () => {
  const validate = settings => validateImportPayload({ vehicles: [], logs: [], settings }, () => true);
  assert.equal(validate({ currency: 'AUD ', units: 'metric', language: 'zh' }).errors.length, 0);
  assert.equal(validate({ currency: '<b>bad</b>', units: 'invalid', language: 'invalid' }).errors.length, 3);
});

test('import rejects malformed reminder settings without rejecting legacy valid values', () => {
  const validate = reminders => validateImportPayload({ vehicles: [], logs: [], settings: { reminders } }, () => true);
  assert.deepEqual(validate({ license: { enabled: true, days: '7' }, insurance: { days: 30 } }).errors, []);
  for (const reminders of [null, [], 'invalid', { license: null }, { insurance: { enabled: 'yes' } }, { registration: { days: '<script>' } }]) {
    assert.ok(validate(reminders).errors.includes('settings_invalid_reminders'));
  }
});

test('import validates AI configuration and rejects API keys in backups', () => {
  const validate = settings => validateImportPayload({ vehicles: [], logs: [], settings }, () => true);
  assert.equal(validate({ aiProvider: 'gemini', aiInvoiceEnabled: true, aiModel: 'gemini-2.5-flash', aiEndpoint: '' }).errors.length, 0);
  assert.equal(validate({ aiProvider: 'openrouter', aiInvoiceEnabled: true, aiModel: 'google/gemini-2.5-flash', aiEndpoint: '' }).errors.length, 0);
  assert.ok(validate({ aiProvider: 'unknown', aiInvoiceEnabled: 'yes', aiModel: '<script>', aiApiKey: 'secret' }).errors.length >= 4);
});

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

test('backup import rejects records belonging to absent vehicles', () => {
  const result = validateImportPayload({
    vehicles: [{ id: 'v1', currentOdometer: 1000 }],
    logs: [{ id: 'orphan', vehicleId: 'missing', type: 'parking', date: '2026-09-26', cost: 8 }],
    settings: {},
  }, value => /^[a-z0-9]+$/.test(value));
  assert.ok(result.errors.includes('log_orphan_vehicle'));
  assert.equal(result.warnings.find(warning => warning.code === 'orphan_logs').count, 1);
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

test('normalizes a multi-position tire replacement while preserving legacy shape', () => {
  const entries = normalizeTireReplacementEntries({
    id: 'rep-batch', type: 'tire_replace',
    tirePositions: ['front_left', 'front_right', 'rear_left'],
    tireIds: { front_left: 't1', front_right: 't2', rear_left: 't3' },
    tireBrand: 'Michelin Primacy 4', tireTread: '7.1', tireRemainingDays: 720,
  });
  assert.deepEqual(entries.map(entry => [entry.position, entry.tireId]), [
    ['front_left', 't1'], ['front_right', 't2'], ['rear_left', 't3'],
  ]);
  assert.equal(entries[1].tireBrand, 'Michelin Primacy 4');
  assert.equal(entries[2].tireRemainingDays, 720);

  const legacy = normalizeTireReplacementEntries({ id: 'legacy', tirePosition: 'rear_right', tireId: 'old-tire' });
  assert.deepEqual(legacy.map(entry => [entry.position, entry.tireId]), [['rear_right', 'old-tire']]);
});

test('validates multi-position tire replacement imports without changing the schema version', () => {
  const safeId = (value) => /^[A-Za-z0-9._:-]+$/.test(value);
  const valid = validateImportPayload({
    vehicles: [{ id: 'v1', currentOdometer: 1000 }],
    logs: [{
      id: 'rep-batch', vehicleId: 'v1', type: 'tire_replace', date: '2026-08-01', odometer: 1000,
      tirePositions: ['front_left', 'front_right'], tireIds: { front_left: 't1', front_right: 't2' }, cost: 400,
    }], settings: {},
  }, safeId);
  assert.deepEqual(valid.errors, []);

  const invalid = validateImportPayload({
    vehicles: [{ id: 'v1', currentOdometer: 1000 }],
    logs: [{
      id: 'rep-bad', vehicleId: 'v1', type: 'tire_replace', date: '2026-08-01', odometer: 1000,
      tirePositions: ['front_left', 'front_left'], cost: 400,
    }], settings: {},
  }, safeId);
  assert.ok(invalid.errors.includes('log_invalid_tire_replacement'));
});
