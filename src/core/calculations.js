(function exposeFuelMateCore(global) {
  function toFiniteNumber(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function isValidIsoDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function addCalendarMonths(value, months) {
    if (!isValidIsoDate(value) || !Number.isInteger(months)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const first = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
  }

  function addCalendarDays(value, days) {
    if (!isValidIsoDate(value) || !Number.isFinite(days)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + Math.round(days));
    return date.toISOString().slice(0, 10);
  }

  function calendarDaysForMonths(value, months) {
    if (!isValidIsoDate(value) || !Number.isInteger(months) || months < 0) return null;
    const dueDate = addCalendarMonths(value, months);
    if (!isValidIsoDate(dueDate)) return null;
    return Math.round((Date.parse(`${dueDate}T00:00:00.000Z`) - Date.parse(`${value}T00:00:00.000Z`)) / 86400000);
  }

  function daysUntilCalendarDate(value, now = new Date()) {
    if (!isValidIsoDate(value)) return null;
    return (Date.parse(`${value}T00:00:00.000Z`) - Date.parse(`${localDateKey(now)}T00:00:00.000Z`)) / 86400000;
  }

  function isValidIsoDateTime(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) && /T/.test(value);
  }

  const tirePositions = Object.freeze(['front_left', 'front_right', 'rear_left', 'rear_right']);

  /**
   * Normalise both the original one-position replacement shape and the
   * multi-position shape used by newer records.  The returned entries keep
   * the shared fields on the log as defaults, while allowing a future import
   * to provide a per-position override in tireDetails without changing the
   * IndexedDB schema.
   */
  function normalizeTireReplacementEntries(log) {
    const rawPositions = Array.isArray(log?.tirePositions) && log.tirePositions.length
      ? log.tirePositions
      : (log?.tirePosition ? [log.tirePosition] : []);
    const positions = rawPositions.map(position => typeof position === 'string' ? position : '');
    const allowed = new Set(tirePositions);
    if (!positions.length || positions.some(position => !allowed.has(position)) || new Set(positions).size !== positions.length) return [];

    const idMap = log?.tireIds && typeof log.tireIds === 'object' && !Array.isArray(log.tireIds)
      ? log.tireIds
      : {};
    const detailMap = log?.tireDetails && typeof log.tireDetails === 'object' && !Array.isArray(log.tireDetails)
      ? log.tireDetails
      : {};
    const fields = ['tireBrand', 'tireTread', 'tirePressureKpa', 'tireAlignment', 'tireBalancing', 'tireRemainingDist', 'tireRemainingDays', 'tireRemainingMonths'];
    const legacyId = typeof log?.tireId === 'string' ? log.tireId.trim() : (log?.tireId == null ? '' : String(log.tireId).trim());

    return positions.map((position, index) => {
      const mappedId = typeof idMap[position] === 'string' ? idMap[position].trim() : (idMap[position] == null ? '' : String(idMap[position]).trim());
      const tireId = mappedId || (positions.length === 1 && legacyId ? legacyId : `rep:${log?.id || 'unknown'}:${position}`);
      const details = detailMap[position] && typeof detailMap[position] === 'object' && !Array.isArray(detailMap[position])
        ? detailMap[position]
        : {};
      const entry = { position, tireId, index };
      fields.forEach(field => {
        entry[field] = details[field] !== undefined ? details[field] : log?.[field];
      });
      return entry;
    });
  }

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
      const enums = { units: ['metric', 'imperial'], language: ['en', 'zh'], pressureUnit: ['kPa', 'psi', 'bar'], aiProvider: ['openai', 'gemini', 'groq', 'deepseek', 'openrouter', 'nvidia', 'compatible'] };
      for (const [key, allowed] of Object.entries(enums)) {
        if (settings[key] !== undefined && !allowed.includes(settings[key])) errors.push(`settings_invalid_${key}`);
      }
      // Preserve legacy currency codes/symbols, but never accept markup or controls.
      if (settings.currency !== undefined && (typeof settings.currency !== 'string' || !/^[\p{L}\p{Sc} .]{1,12}$/u.test(settings.currency))) errors.push('settings_invalid_currency');
      if (settings.aiInvoiceEnabled !== undefined && typeof settings.aiInvoiceEnabled !== 'boolean') errors.push('settings_invalid_ai_enabled');
      if (settings.aiModel !== undefined && (typeof settings.aiModel !== 'string' || !/^[\w./:@+-]{1,160}$/.test(settings.aiModel))) errors.push('settings_invalid_ai_model');
      if (settings.aiEndpoint !== undefined && (typeof settings.aiEndpoint !== 'string' || settings.aiEndpoint.length > 500 || /[<>\x00-\x1f]/.test(settings.aiEndpoint))) errors.push('settings_invalid_ai_endpoint');
      if (settings.aiApiKey !== undefined) errors.push('settings_contains_ai_key');
      if (settings.reminders !== undefined) {
        const reminders = settings.reminders;
        if (!reminders || typeof reminders !== 'object' || Array.isArray(reminders)) {
          errors.push('settings_invalid_reminders');
        } else {
          for (const type of ['license', 'insurance', 'registration']) {
            const entry = reminders[type];
            if (entry === undefined) continue;
            if (!entry || typeof entry !== 'object' || Array.isArray(entry)
                || (entry.enabled !== undefined && typeof entry.enabled !== 'boolean')
                || (entry.days !== undefined && ![7, 30, '7', '30'].includes(entry.days))) {
              errors.push('settings_invalid_reminders');
            }
          }
        }
      }
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
        if (log.type === 'tire_replace' && (log.tirePositions !== undefined || log.tirePosition !== undefined)) {
          const expectedPositions = Array.isArray(log.tirePositions) ? log.tirePositions.length : 1;
          const replacementEntries = normalizeTireReplacementEntries(log);
          if (!expectedPositions || replacementEntries.length !== expectedPositions) errors.push('log_invalid_tire_replacement');
          if (new Set(replacementEntries.map(entry => entry.tireId)).size !== replacementEntries.length) errors.push('log_invalid_tire_ids');
          if (log.tireIds !== undefined && (!log.tireIds || typeof log.tireIds !== 'object' || Array.isArray(log.tireIds))) errors.push('log_invalid_tire_ids');
          if (log.tireRemainingMonths !== undefined && log.tireRemainingMonths !== null
              && (!isNonNegativeNumber(log.tireRemainingMonths) || !Number.isInteger(Number(log.tireRemainingMonths))
                  || calendarDaysForMonths(log.date, Number(log.tireRemainingMonths)) === null)) errors.push('log_invalid_tire_months');
        }
        if (log.type === 'tire_rotation') {
          const hasMoves = Array.isArray(log.tireMoves) && log.tireMoves.length > 0;
          const hasSwaps = Array.isArray(log.tireSwaps) && log.tireSwaps.length > 0;
          const expectedMoves = hasMoves ? log.tireMoves.length : (hasSwaps ? log.tireSwaps.length * 2 : (log.tireSwapA && log.tireSwapB ? 2 : 0));
          if (!expectedMoves || normalizeTireMoves(log).length !== expectedMoves) errors.push('log_invalid_tire_rotation');
        }
      }
    }

    if (orphanLogs > 0) {
      errors.push('log_orphan_vehicle');
      warnings.push({ code: 'orphan_logs', count: orphanLogs });
    }
    return { errors: [...new Set(errors)], warnings };
  }

  global.FuelMateCore = Object.freeze({
    addCalendarDays,
    addCalendarMonths,
    calendarDaysForMonths,
    daysUntilCalendarDate,
    localDateKey,
    buildFuelEfficiencySegments,
    calculateFuelEfficiencyFromLogs,
    calcEfficiencyValue,
    getRecommendedTireMoves,
    isNonNegativeNumber,
    isValidIsoDate,
    isValidIsoDateTime,
    normalizeTireMoves,
    normalizeTireReplacementEntries,
    pressureFromKpa,
    pressureToKpa,
    supportedLogTypes,
    toFiniteNumber,
    validateImportPayload,
  });
})(globalThis);
