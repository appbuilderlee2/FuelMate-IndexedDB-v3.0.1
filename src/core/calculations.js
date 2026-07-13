(function exposeFuelMateCore(global) {
  function toFiniteNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isValidIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function isNonNegativeNumber(value, { allowEmpty = false, positive = false } = {}) {
    if (value === '' || value === null || value === undefined) return allowEmpty;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '') return allowEmpty;
    const parsed = typeof normalized === 'number' ? normalized : Number(normalized);
    if (!Number.isFinite(parsed) || parsed < 0) return false;
    return !positive || parsed > 0;
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

  function buildFuelEfficiencySegments(logs) {
    const fuelLogs = (Array.isArray(logs) ? logs : [])
      .filter((log) => log && log.type === 'fuel' && isNonNegativeNumber(log.odometer))
      .slice()
      .sort((a, b) => toFiniteNumber(a.odometer) - toFiniteNumber(b.odometer));

    let previousFullOdometer = null;
    let intervalFuel = 0;
    const segments = [];

    for (const log of fuelLogs) {
      const odometer = toFiniteNumber(log.odometer);
      const fuel = toFiniteNumber(log.liters);

      if (previousFullOdometer === null) {
        if (!log.isPartial) previousFullOdometer = odometer;
        continue;
      }

      if (fuel !== null && fuel > 0) intervalFuel += fuel;
      if (log.isPartial) continue;

      const distance = odometer - previousFullOdometer;
      if (distance > 0 && intervalFuel > 0) {
        segments.push({
          date: isValidIsoDate(log.date) ? log.date : '',
          distance,
          fuel: intervalFuel,
          endOdometer: odometer,
        });
      }
      previousFullOdometer = odometer;
      intervalFuel = 0;
    }

    return segments;
  }

  function calculateFuelEfficiencyFromLogs(logs, fuelUnit, distanceUnit) {
    const totals = buildFuelEfficiencySegments(logs).reduce((acc, segment) => ({
      distance: acc.distance + segment.distance,
      fuel: acc.fuel + segment.fuel,
    }), { distance: 0, fuel: 0 });
    return calcEfficiencyValue(totals.fuel, totals.distance, fuelUnit, distanceUnit);
  }

  const supportedLogTypes = Object.freeze([
    'fuel', 'parking', 'service', 'repair', 'tire_replace', 'tire_rotation',
    'periodic_maintenance', 'car_wash', 'car_accessories', 'fine',
    'license', 'insurance', 'registration',
  ]);

  function validateImportPayload(data, isSafeId) {
    const errors = [];
    const warnings = [];
    const safeId = typeof isSafeId === 'function' ? isSafeId : () => false;

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { errors: ['root_not_object'], warnings };
    }

    const vehicles = Array.isArray(data.vehicles) ? data.vehicles : null;
    const logs = Array.isArray(data.logs) ? data.logs : null;
    const settings = data.settings;

    if (!vehicles) errors.push('vehicles_not_array');
    if (!logs) errors.push('logs_not_array');
    if (settings !== undefined && (!settings || typeof settings !== 'object' || Array.isArray(settings))) {
      errors.push('settings_not_object');
    }

    const vehicleIds = new Set();
    if (vehicles) {
      for (const vehicle of vehicles) {
        if (!vehicle || typeof vehicle !== 'object' || Array.isArray(vehicle)) { errors.push('vehicle_not_object'); break; }
        if (!vehicle.id) { errors.push('vehicle_missing_id'); break; }
        const id = String(vehicle.id);
        if (!safeId(id)) { errors.push('vehicle_invalid_id'); break; }
        if (vehicleIds.has(id)) errors.push('vehicle_duplicate_id');
        vehicleIds.add(id);
        if (!isNonNegativeNumber(vehicle.currentOdometer, { allowEmpty: true })) errors.push('vehicle_invalid_odometer');
        if (!isNonNegativeNumber(vehicle.year, { allowEmpty: true, positive: true })) errors.push('vehicle_invalid_year');
      }
    }

    const logIds = new Set();
    let orphanLogs = 0;
    if (logs) {
      for (const log of logs) {
        if (!log || typeof log !== 'object' || Array.isArray(log)) { errors.push('log_not_object'); break; }
        if (!log.id || !log.vehicleId || !log.type || !log.date) { errors.push('log_missing_fields'); break; }
        const id = String(log.id);
        const vehicleId = String(log.vehicleId);
        if (!safeId(id) || !safeId(vehicleId)) { errors.push('log_invalid_id'); break; }
        if (logIds.has(id)) errors.push('log_duplicate_id');
        logIds.add(id);
        if (!supportedLogTypes.includes(log.type)) errors.push('log_invalid_type');
        if (!isValidIsoDate(log.date)) errors.push('log_invalid_date');
        if (!vehicleIds.has(vehicleId)) orphanLogs += 1;
        if (!isNonNegativeNumber(log.odometer, { allowEmpty: !['fuel', 'service', 'repair', 'tire_replace', 'tire_rotation', 'periodic_maintenance'].includes(log.type) })) {
          errors.push('log_invalid_odometer');
        }
        if (!isNonNegativeNumber(log.cost, { allowEmpty: !['fuel', 'parking'].includes(log.type) })) errors.push('log_invalid_cost');
        if (log.type === 'fuel' && !isNonNegativeNumber(log.liters, { positive: true })) errors.push('log_invalid_fuel_amount');
        if (log.expiryDate && !isValidIsoDate(log.expiryDate)) errors.push('log_invalid_expiry_date');
      }
    }

    if (orphanLogs > 0) warnings.push({ code: 'orphan_logs', count: orphanLogs });
    return { errors: [...new Set(errors)], warnings };
  }

  global.FuelMateCore = Object.freeze({
    buildFuelEfficiencySegments,
    calculateFuelEfficiencyFromLogs,
    calcEfficiencyValue,
    isNonNegativeNumber,
    isValidIsoDate,
    pressureFromKpa,
    pressureToKpa,
    supportedLogTypes,
    toFiniteNumber,
    validateImportPayload,
  });
})(globalThis);
