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

  function isValidIsoDateTime(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && /T/.test(value);
  }

  const tirePositions = Object.freeze(['front_left', 'front_right', 'rear_left', 'rear_right']);

  function normalizeTireMoves(log) {
    const positions = new Set(tirePositions);
    const rawMoves = Array.isArray(log?.tireMoves) && log.tireMoves.length
      ? log.tireMoves
      : (Array.isArray(log?.tireSwaps) && log.tireSwaps.length
        ? log.tireSwaps.flatMap((swap) => [{ from: swap?.a, to: swap?.b }, { from: swap?.b, to: swap?.a }])
        : (log?.tireSwapA && log?.tireSwapB
          ? [{ from: log.tireSwapA, to: log.tireSwapB }, { from: log.tireSwapB, to: log.tireSwapA }]
          : []));
    const moves = rawMoves.map((move) => ({ from: move?.from, to: move?.to }));
    const from = new Set();
    const to = new Set();
    for (const move of moves) {
      if (!positions.has(move.from) || !positions.has(move.to) || move.from === move.to) return [];
      if (from.has(move.from) || to.has(move.to)) return [];
      from.add(move.from);
      to.add(move.to);
    }
    return moves;
  }

  function getRecommendedTireMoves(driveType = 'fwd') {
    const recommended = {
      fwd: [
        { from: 'front_left', to: 'rear_left' }, { from: 'front_right', to: 'rear_right' },
        { from: 'rear_left', to: 'front_right' }, { from: 'rear_right', to: 'front_left' },
      ],
      rwd: [
        { from: 'rear_left', to: 'front_left' }, { from: 'rear_right', to: 'front_right' },
        { from: 'front_left', to: 'rear_right' }, { from: 'front_right', to: 'rear_left' },
      ],
      awd: [
        { from: 'front_left', to: 'rear_right' }, { from: 'front_right', to: 'rear_left' },
        { from: 'rear_left', to: 'front_right' }, { from: 'rear_right', to: 'front_left' },
      ],
    };
    const drive = String(driveType || 'fwd').toLowerCase();
    return (recommended[drive] || recommended.fwd).map((move) => ({ ...move }));
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
    if (settings && typeof settings === 'object' && !Array.isArray(settings)) {
      const snoozedUntil = settings.reminderCenter?.snoozedUntil;
      const done = settings.reminderCenter?.done;
      if (snoozedUntil !== undefined && (!snoozedUntil || typeof snoozedUntil !== 'object' || Array.isArray(snoozedUntil))) {
        errors.push('settings_invalid_snoozed_map');
      } else if (snoozedUntil) {
        for (const [id, until] of Object.entries(snoozedUntil)) {
          if (!safeId(id) || !isValidIsoDateTime(until)) errors.push('settings_invalid_snooze');
        }
      }
      if (done !== undefined && (!done || typeof done !== 'object' || Array.isArray(done))) {
        errors.push('settings_invalid_done_map');
      } else if (done) {
        for (const [id, value] of Object.entries(done)) {
          if (!safeId(id) || value !== true) errors.push('settings_invalid_done');
        }
      }
      if (settings.lastBackupDate !== undefined && settings.lastBackupDate !== null && !isValidIsoDateTime(settings.lastBackupDate)) {
        errors.push('settings_invalid_backup_date');
      }
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
        if (log.type === 'tire_rotation') {
          const hasMoves = Array.isArray(log.tireMoves) && log.tireMoves.length > 0;
          const hasSwaps = Array.isArray(log.tireSwaps) && log.tireSwaps.length > 0;
          const expectedMoves = hasMoves ? log.tireMoves.length : (hasSwaps ? log.tireSwaps.length * 2 : (log.tireSwapA && log.tireSwapB ? 2 : 0));
          if (!expectedMoves || normalizeTireMoves(log).length !== expectedMoves) errors.push('log_invalid_tire_rotation');
        }
      }
    }

    if (orphanLogs > 0) warnings.push({ code: 'orphan_logs', count: orphanLogs });
    return { errors: [...new Set(errors)], warnings };
  }

  global.FuelMateCore = Object.freeze({
    buildFuelEfficiencySegments,
    calculateFuelEfficiencyFromLogs,
    calcEfficiencyValue,
    getRecommendedTireMoves,
    isNonNegativeNumber,
    isValidIsoDate,
    isValidIsoDateTime,
    normalizeTireMoves,
    pressureFromKpa,
    pressureToKpa,
    supportedLogTypes,
    toFiniteNumber,
    validateImportPayload,
  });
})(globalThis);
