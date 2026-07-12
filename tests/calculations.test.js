import assert from 'node:assert/strict';
import test from 'node:test';

await import('../src/core/calculations.js');
const { calcEfficiencyValue, pressureFromKpa, pressureToKpa } = globalThis.FuelMateCore;

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
