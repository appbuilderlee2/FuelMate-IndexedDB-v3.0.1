(function exposeFuelMateCore(global) {
  function toFiniteNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function pressureToKpa(value, unit = 'kPa') {
    const parsed = toFiniteNumber(value);
    if (parsed === null) return null;
    if (unit === 'psi') return parsed * 6.89476;
    if (unit === 'bar') return parsed * 100;
    return parsed;
  }

  function pressureFromKpa(value, unit = 'kPa') {
    const parsed = toFiniteNumber(value);
    if (parsed === null) return null;
    if (unit === 'psi') return parsed / 6.89476;
    if (unit === 'bar') return parsed / 100;
    return parsed;
  }

  function calcEfficiencyValue(fuelAmount, distanceAmount, fuelUnit, distanceUnit) {
    const fuel = toFiniteNumber(fuelAmount);
    const distance = toFiniteNumber(distanceAmount);
    if (fuel === null || distance === null || fuel <= 0 || distance <= 0) return null;
    if (distanceUnit === 'mi' && fuelUnit === 'Gal') return distance / fuel;
    return (fuel / distance) * 100;
  }

  global.FuelMateCore = Object.freeze({
    calcEfficiencyValue,
    pressureFromKpa,
    pressureToKpa,
    toFiniteNumber,
  });
})(globalThis);
