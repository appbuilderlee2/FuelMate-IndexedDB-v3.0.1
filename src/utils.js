// --- UTILS ---
        const utils = {
            t(key) {
                const lang = store.data.settings.language || 'en';
                return translations[lang][key] || key;
            },
            newId() {
                if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
                    return globalThis.crypto.randomUUID();
                }
                return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
            },
            _debounceTimers: new Map(),
            debounceByKey(key, fn, waitMs = 200) {
                const t = this._debounceTimers.get(key);
                if (t) clearTimeout(t);
                const next = setTimeout(() => {
                    this._debounceTimers.delete(key);
                    fn();
                }, waitMs);
                this._debounceTimers.set(key, next);
            },
            cancelDebounce(key) {
                const t = this._debounceTimers.get(key);
                if (t) clearTimeout(t);
                this._debounceTimers.delete(key);
            },
            csvEscape(value) {
                const s = value === undefined || value === null ? '' : String(value);
                if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                return s;
            },
            formatDate(isoString) {
                if (!isoString) return '';
                const date = new Date(isoString);
                const lang = store.data.settings.language;
                if (lang === 'zh') return `${date.getFullYear()}年${date.getMonth()+1}月${date.getDate()}日`;
                return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
            },
            formatCurrency(amount) {
                if (amount === undefined || amount === null || amount === '--' || isNaN(parseFloat(amount))) return '--';
                return `${store.data.settings.currency}${parseFloat(amount).toFixed(2)}`;
            },
            getCostPerDistLabel() {
                const lang = store.data.settings.language || 'en';
                const unit = store.data.settings.units === 'imperial' ? 'mi' : 'km';
                if (lang === 'zh') return unit === 'mi' ? '每英里成本' : '每公里成本';
                return `Cost/${unit}`;
            },
            getDistUnit() { return store.data.settings.units === 'imperial' ? 'mi' : 'km'; },
            getPressureUnit() {
                const u = store.data.settings.pressureUnit;
                if (u === 'psi' || u === 'kPa' || u === 'bar') return u;
                return store.data.settings.units === 'imperial' ? 'psi' : 'kPa';
            },
            pressureToKpa(value, unit) {
                return FuelMateCore.pressureToKpa(value, unit);
            },
            pressureFromKpa(kpaValue, unit) {
                return FuelMateCore.pressureFromKpa(kpaValue, unit);
            },
            formatPressureFromLog(log) {
                const unit = utils.getPressureUnit();
                let kpa = null;
                if (log && log.tirePressureKpa !== undefined && log.tirePressureKpa !== null && log.tirePressureKpa !== '') {
                    kpa = utils.pressureToKpa(log.tirePressureKpa, 'kPa');
                } else if (log && log.tirePressure !== undefined && log.tirePressure !== null && log.tirePressure !== '') {
                    // Back-compat: older entries assumed psi
                    kpa = utils.pressureToKpa(log.tirePressure, 'psi');
                }
                if (kpa === null) return null;
                const shown = utils.pressureFromKpa(kpa, unit);
                if (shown === null) return null;
                const decimals = unit === 'psi' ? 0 : 1;
                return `${shown.toFixed(decimals)} ${unit}`;
            },
            getFuelUnit() { 
                const v = store.getActiveVehicle();
                return v && v.fuelUnit ? v.fuelUnit : (store.data.settings.units === 'imperial' ? 'Gal' : 'L'); 
            },
            getEfficiencyLabel() {
                 const v = store.getActiveVehicle();
                 const distUnit = utils.getDistUnit();
                 const fuelUnit = v && v.fuelUnit ? v.fuelUnit : (store.data.settings.units === 'imperial' ? 'Gal' : 'L');
                 if (fuelUnit === 'kWh') return `kWh/100${distUnit}`;
                 if (distUnit === 'mi' && fuelUnit === 'Gal') return 'MPG';
                 return `${fuelUnit}/100${distUnit}`;
            },
            calcEfficiencyValue(fuelAmount, distAmount, fuelUnit, distUnit) {
                return FuelMateCore.calcEfficiencyValue(fuelAmount, distAmount, fuelUnit, distUnit);
            },
            filterByDateRange(logs, fromIso, toIso) {
                if (!fromIso && !toIso) return logs;
                const from = fromIso ? new Date(fromIso) : null;
                const to = toIso ? new Date(toIso) : null;
                return logs.filter(l => {
                    const d = new Date(l.date);
                    if (from && d < from) return false;
                    if (to) {
                        const end = new Date(to);
                        end.setHours(23, 59, 59, 999);
                        if (d > end) return false;
                    }
                    return true;
                });
            },
            getTirePositions() { return ['front_left','front_right','rear_left','rear_right']; },
            formatDaysShort(days) {
                const d = Math.max(0, Math.ceil(days));
                return (store.data.settings.language === 'zh') ? `${d}天` : `${d}d`;
            },
            getTireReplacementStatus(vehicle) {
                const distInt = parseInt(vehicle?.tireReplaceDist ?? store.data.settings.tireReplaceDist) || 0;
                const yearsInt = parseInt(vehicle?.tireReplaceYears ?? store.data.settings.tireReplaceYears) || 0;
                const now = new Date();
                const currentOdo = parseFloat(vehicle?.currentOdometer) || 0;
                const events = store.data.logs
                    .filter(l => l.vehicleId === vehicle?.id && (l.type === 'tire_replace' || l.type === 'tire_rotation'))
                    .map(l => ({
                        log: l,
                        odo: parseFloat(l.odometer) || 0,
                        dateMs: l.date ? new Date(l.date).getTime() : 0
                    }))
                    .sort((a, b) => (a.odo - b.odo) || (a.dateMs - b.dateMs));

                const posToTireId = new Map(utils.getTirePositions().map(p => [p, `init:${vehicle?.id}:${p}`]));
                const tireLastReplace = new Map(); // tireId -> { odo, dateMs, logId, log }

                for (const { log, odo, dateMs } of events) {
                    if (log.type === 'tire_replace') {
                        const pos = log.tirePosition;
                        if (!pos) continue;
                        const tireId = log.tireId || `rep:${log.id}`;
                        posToTireId.set(pos, tireId);
                        tireLastReplace.set(tireId, { odo, dateMs, logId: log.id, log });
                    } else if (log.type === 'tire_rotation') {
                        const swaps = Array.isArray(log.tireSwaps) && log.tireSwaps.length
                            ? log.tireSwaps
                            : (log.tireSwapA && log.tireSwapB ? [{ a: log.tireSwapA, b: log.tireSwapB }] : []);
                        for (const s of swaps) {
                            const a = s?.a;
                            const b = s?.b;
                            if (!a || !b || a === b) continue;
                            const idA = posToTireId.get(a);
                            const idB = posToTireId.get(b);
                            posToTireId.set(a, idB);
                            posToTireId.set(b, idA);
                        }
                    }
                }

                const yearDays = 365;
                return utils.getTirePositions().map((pos) => {
                    const tireId = posToTireId.get(pos);
                    const latest = tireId ? tireLastReplace.get(tireId) : null;
                    if (!latest) {
                        return { pos, editLogId: null, isOverdue: false, primary: utils.t('tire_not_set'), secondary: '', remainingKm: null, remainingDays: null, dueDateIso: null, dueOdo: null, isNotSet: true };
                    }

                    const lastOdo = latest.odo;
                    const lastDate = latest.dateMs ? new Date(latest.dateMs) : null;

                    const remainingDistSeed = Number.isFinite(parseFloat(latest.log?.tireRemainingDist))
                        ? parseFloat(latest.log.tireRemainingDist)
                        : null;
                    const remainingDaysSeed = Number.isFinite(parseFloat(latest.log?.tireRemainingDays))
                        ? parseFloat(latest.log.tireRemainingDays)
                        : null;
                    if (remainingDistSeed !== null || remainingDaysSeed !== null) {
                        const distUsed = Math.max(0, currentOdo - lastOdo);
                        const remainingKm = remainingDistSeed === null ? null : (remainingDistSeed - distUsed);
                        const daysElapsed = latest.dateMs ? Math.floor((now.getTime() - latest.dateMs) / 86400000) : 0;
                        const remainingDays = remainingDaysSeed === null ? null : (remainingDaysSeed - daysElapsed);

                        const overdueDist = remainingKm !== null && remainingKm <= 0;
                        const overdueTime = remainingDays !== null && remainingDays <= 0;
                        const isOverdue = overdueDist || overdueTime;

                        const distText = remainingKm === null ? '' : `${Math.max(0, Math.round(remainingKm)).toLocaleString()} ${utils.getDistUnit()}`;
                        const timeText = remainingDays === null ? '' : utils.formatDaysShort(remainingDays);

                        const distFrac = remainingKm === null || !remainingDistSeed ? Number.POSITIVE_INFINITY : (remainingKm / Math.max(1, remainingDistSeed));
                        const timeFrac = remainingDays === null || !remainingDaysSeed ? Number.POSITIVE_INFINITY : (remainingDays / Math.max(1, remainingDaysSeed));
                        const primaryIsDist = distFrac <= timeFrac;

                        const primary = isOverdue ? utils.t('overdue') : (primaryIsDist ? (distText || timeText) : (timeText || distText));
                        const secondaryParts = [];
                        if (!isOverdue && distText && !primaryIsDist) secondaryParts.push(distText);
                        if (!isOverdue && timeText && primaryIsDist) secondaryParts.push(timeText);
                        const secondary = secondaryParts.length ? `${utils.t('due_in')} ${secondaryParts.join(' / ')}` : '';

                        const dueOdo = remainingDistSeed === null ? null : (lastOdo + remainingDistSeed);
                        const dueDate = (remainingDaysSeed !== null && lastDate)
                            ? new Date(lastDate.getTime() + remainingDaysSeed * 86400000)
                            : null;

                        return { pos, editLogId: latest.logId || null, isOverdue, primary, secondary, remainingKm, remainingDays, dueDateIso: dueDate ? dueDate.toISOString() : null, dueOdo, isNotSet: false };
                    }

                    const dueOdo = distInt > 0 ? (lastOdo + distInt) : null;
                    const remainingKm = dueOdo === null ? null : (dueOdo - currentOdo);

                    let dueDate = null;
                    let remainingDays = null;
                    if (yearsInt > 0 && lastDate) {
                        dueDate = new Date(lastDate);
                        dueDate.setFullYear(dueDate.getFullYear() + yearsInt);
                        remainingDays = Math.ceil((dueDate - now) / 86400000);
                    }

                    const overdueDist = remainingKm !== null && remainingKm <= 0;
                    const overdueTime = remainingDays !== null && remainingDays <= 0;
                    const isOverdue = overdueDist || overdueTime;

                    const distText = remainingKm === null ? '' : `${Math.max(0, Math.round(remainingKm)).toLocaleString()} ${utils.getDistUnit()}`;
                    const timeText = remainingDays === null ? '' : utils.formatDaysShort(remainingDays);

                    const distFrac = remainingKm === null ? Number.POSITIVE_INFINITY : (remainingKm / Math.max(1, distInt));
                    const timeFrac = remainingDays === null ? Number.POSITIVE_INFINITY : (remainingDays / Math.max(1, yearsInt * yearDays));
                    const primaryIsDist = distFrac <= timeFrac;

                    const primary = isOverdue ? utils.t('overdue') : (primaryIsDist ? (distText || timeText) : (timeText || distText));
                    const secondaryParts = [];
                    if (!isOverdue && distText && !primaryIsDist) secondaryParts.push(distText);
                    if (!isOverdue && timeText && primaryIsDist) secondaryParts.push(timeText);
                    const secondary = secondaryParts.length ? `${utils.t('due_in')} ${secondaryParts.join(' / ')}` : '';

                    return { pos, editLogId: latest.logId || null, isOverdue, primary, secondary, remainingKm, remainingDays, dueDateIso: dueDate ? dueDate.toISOString() : null, dueOdo, isNotSet: false };
                });
            },

            getTireTimeline(vehicle) {
                const events = store.data.logs
                    .filter(l => l.vehicleId === vehicle?.id && (l.type === 'tire_replace' || l.type === 'tire_rotation'))
                    .map(l => ({
                        log: l,
                        odo: parseFloat(l.odometer) || 0,
                        dateMs: l.date ? new Date(l.date).getTime() : 0
                    }))
                    .sort((a, b) => (a.odo - b.odo) || (a.dateMs - b.dateMs));

                const posToTireId = new Map(utils.getTirePositions().map(p => [p, `init:${vehicle?.id}:${p}`]));
                const tires = new Map(); // tireId -> { tireId, currentPos, lastReplace, events: [] }

                const ensure = (tireId) => {
                    if (!tires.has(tireId)) tires.set(tireId, { tireId, currentPos: null, lastReplace: null, events: [] });
                    return tires.get(tireId);
                };

                for (const { log, odo } of events) {
                    if (log.type === 'tire_replace') {
                        const pos = log.tirePosition;
                        if (!pos) continue;
                        const tireId = log.tireId || `rep:${log.id}`;
                        posToTireId.set(pos, tireId);
                        const t = ensure(tireId);
                        t.lastReplace = { logId: log.id, date: log.date, odometer: odo, brand: log.tireBrand || '' };
                        t.events.push({ kind: 'replace', logId: log.id, date: log.date, odometer: odo, pos, brand: log.tireBrand || '' });
                    } else if (log.type === 'tire_rotation') {
                        const swaps = Array.isArray(log.tireSwaps) && log.tireSwaps.length
                            ? log.tireSwaps
                            : (log.tireSwapA && log.tireSwapB ? [{ a: log.tireSwapA, b: log.tireSwapB }] : []);
                        for (const s of swaps) {
                            const a = s?.a;
                            const b = s?.b;
                            if (!a || !b || a === b) continue;
                            const idA = posToTireId.get(a);
                            const idB = posToTireId.get(b);
                            if (idA) ensure(idA).events.push({ kind: 'rotate', logId: log.id, date: log.date, odometer: odo, from: a, to: b });
                            if (idB) ensure(idB).events.push({ kind: 'rotate', logId: log.id, date: log.date, odometer: odo, from: b, to: a });
                            posToTireId.set(a, idB);
                            posToTireId.set(b, idA);
                        }
                    }
                }

                for (const [pos, tireId] of posToTireId.entries()) {
                    ensure(tireId).currentPos = pos;
                }

                const posRank = new Map(utils.getTirePositions().map((p, i) => [p, i]));
                return Array.from(tires.values()).sort((a, b) => {
                    const ar = a.currentPos ? posRank.get(a.currentPos) ?? 999 : 999;
                    const br = b.currentPos ? posRank.get(b.currentPos) ?? 999 : 999;
                    if (ar !== br) return ar - br;
                    const ad = a.lastReplace?.date ? new Date(a.lastReplace.date).getTime() : 0;
                    const bd = b.lastReplace?.date ? new Date(b.lastReplace.date).getTime() : 0;
                    return bd - ad;
                });
            },
            
            getAvailableYears() {
                const logs = store.getVehicleLogs();
                const years = new Set(
                    logs
                        .map(l => new Date(l.date).getFullYear())
                        .filter(y => Number.isFinite(y))
                );
                if (!years.size) years.add(new Date().getFullYear());
                return Array.from(years).sort((a,b) => b-a);
            },
            filterLogs(logs, filter) {
                if (!filter) return logs;
                return logs.filter(l => {
                    const d = new Date(l.date);
                    if (filter.mode === 'month') {
                        const [y, m] = filter.value.split('-');
                        return d.getFullYear() == y && (d.getMonth() + 1) == m;
                    } else if (filter.mode === 'year') {
                         return d.getFullYear() == filter.value;
                    }
                    return true; 
                });
            },

            calculateStats(logs, category = 'all') {
                if (!logs.length) return { efficiency: '--', costKm: '--', totalCost: 0, totalDist: 0, totalDistCount: 0 };
                
                // 1. Total Cost
                const totalCost = logs.reduce((sum, l) => {
                    const c = parseFloat(l.cost);
                    return sum + (Number.isFinite(c) ? c : 0);
                }, 0);
                
                // 2. Total Distance
                const odoLogs = logs.filter(l => Number.isFinite(parseFloat(l.odometer)));
                const sorted = odoLogs.sort((a, b) => parseFloat(a.odometer) - parseFloat(b.odometer));
                const totalDist = sorted.length > 1
                    ? (parseFloat(sorted[sorted.length-1].odometer) - parseFloat(sorted[0].odometer))
                    : (sorted.length === 1 ? (parseFloat(sorted[0].odometer) || 0) : 0);

                // 3. Fuel Efficiency (Always calc if fuel data exists)
                let efficiency = '--';
                let costKm = '--';
                
                if (category === 'fuel' || category === 'all') {
                    // Filter specifically for fuel logs to calculate efficiency
                    const fuelLogs = logs.filter(l => l.type === 'fuel').sort((a, b) => parseFloat(a.odometer) - parseFloat(b.odometer));
                    const v = store.getActiveVehicle();
                    const isImperial = store.data.settings.units === 'imperial';
                    const isEV = v && v.fuelUnit === 'kWh';
                    const distUnit = utils.getDistUnit();
                    const fuelUnit = v && v.fuelUnit ? v.fuelUnit : (isImperial ? 'Gal' : 'L');
                    
                    if (fuelLogs.length > 1) {
                        let totalFuel = 0;
                        let validDist = 0;
                        
                        for (let i = 0; i < fuelLogs.length - 1; i++) {
                            const curr = fuelLogs[i];
                            const next = fuelLogs[i+1];
                            
                            // Simple efficiency calculation: if segments are consecutive full tanks
                            if (!curr.isPartial && !next.isPartial) {
                                const dist = next.odometer - curr.odometer;
                                if (dist > 0) {
                                    validDist += dist;
                                    totalFuel += parseFloat(next.liters) || 0; 
                                }
                            }
                        }
                        
                        if (validDist > 0 && totalFuel > 0) {
                            const eff = utils.calcEfficiencyValue(totalFuel, validDist, fuelUnit, distUnit);
                            if (eff !== null) efficiency = eff.toFixed(1);
                        }
                    }
                }
                
                // 4. Cost per KM (Total)
                if (totalDist > 0 && totalCost > 0) {
                    costKm = (totalCost / totalDist).toFixed(2);
                }

                return { efficiency, costKm, totalCost, totalDist, totalDistCount: sorted.length };
            },
            
            detectLocation(callback) {
                if (!navigator.geolocation) return callback('');
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                        const data = await res.json();
                        const parts = [data.address.amenity, data.address.road, data.address.suburb].filter(Boolean);
                        callback(parts.join(', ') || `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
                    } catch {
                        callback(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
                    }
                }, () => callback(''));
            },

            generateTrendChart(logs) {
                const fuelLogs = logs.filter(l => l.type === 'fuel' && !l.isPartial).sort((a,b) => new Date(a.date) - new Date(b.date));
                if (fuelLogs.length < 2) return '';
                const v = store.getActiveVehicle();
                const isImperial = store.data.settings.units === 'imperial';
                const distUnit = utils.getDistUnit();
                const fuelUnit = v && v.fuelUnit ? v.fuelUnit : (isImperial ? 'Gal' : 'L');
                
                const monthly = new Map();
                for (let i = 0; i < fuelLogs.length - 1; i++) {
                    const dist = fuelLogs[i+1].odometer - fuelLogs[i].odometer;
                    if (dist <= 0) continue;
                    const fuel = parseFloat(fuelLogs[i+1].liters) || 0;
                    if (fuel <= 0) continue;
                    const ym = fuelLogs[i+1].date ? fuelLogs[i+1].date.slice(0, 7) : '';
                    if (!ym) continue;
                    const cur = monthly.get(ym) || { fuel: 0, dist: 0 };
                    cur.fuel += fuel;
                    cur.dist += dist;
                    monthly.set(ym, cur);
                }
                const recentPoints = Array.from(monthly.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .slice(-12)
                    .map(([ym, v]) => ({
                        val: utils.calcEfficiencyValue(v.fuel, v.dist, fuelUnit, distUnit),
                        month: ym.slice(5, 7)
                    }))
                    .filter(p => p.val !== null);
                if (recentPoints.length < 1) return '';

                const w = 300, h = 120; 
                const max = Math.max(...recentPoints.map(p => p.val)) * 1.1;
                const min = Math.min(...recentPoints.map(p => p.val)) * 0.9;
                const range = max - min || 1;
                const avg = recentPoints.reduce((a,b)=>a+b.val,0) / recentPoints.length;
                const avgY = h - ((avg - min) / range) * h;
                
                const points = recentPoints.map((p, i) => {
                    const x = (i / (recentPoints.length - 1)) * w;
                    const y = h - ((p.val - min) / range) * h;
                    return {x, y, val: p.val, month: p.month};
                });
                
                const pathD = points.map((p, i) => (i===0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ');
                const fillD = `M0,${h} ${pathD} L${w},${h}`;

                return `
                    <svg viewBox="-10 -20 ${w+20} ${h+40}" class="w-full h-full overflow-visible">
                        <defs>
                            <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stop-color="currentColor" stop-opacity="0.3"/>
                                <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
                            </linearGradient>
                        </defs>
                        <!-- Grid -->
                        <line x1="0" y1="${avgY}" x2="${w}" y2="${avgY}" stroke="currentColor" stroke-width="1" stroke-dasharray="5,5" opacity="0.3" />
                        <text x="0" y="${avgY-5}" font-size="8" fill="currentColor" opacity="0.5">AVG: ${avg.toFixed(1)}</text>

                        <!-- Area & Line -->
                        <path d="${fillD}" fill="url(#chartGrad)" class="text-teal-500"/>
                        <path d="${pathD}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-teal-600"/>
                        
                        <!-- Points & Labels -->
                        ${points.map(p => `
                            <circle cx="${p.x}" cy="${p.y}" r="3" fill="white" stroke="currentColor" stroke-width="2" class="text-teal-600"/>
                            <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="8" font-weight="bold" fill="currentColor">${p.val.toFixed(1)}</text>
                            ${p.month ? `<text x="${p.x}" y="${h + 14}" text-anchor="middle" font-size="8" font-weight="600" fill="currentColor" opacity="0.6">${p.month}</text>` : ''}
                        `).join('')}
                    </svg>
                `;
            },
            
            generateMonthlyBarChart(logs) {
                const months = [];
                const now = new Date();
                for (let i=5; i>=0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    months.push(d.toISOString().slice(0, 7)); 
                }
                
                const data = months.map(m => {
                    const monthLogs = logs.filter(l => l.date.startsWith(m));
                    const fuel = monthLogs.filter(l => l.type === 'fuel').reduce((sum, l) => sum + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                    const parking = monthLogs.filter(l => l.type === 'parking').reduce((sum, l) => sum + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                    const fine = monthLogs.filter(l => l.type === 'fine').reduce((sum, l) => sum + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                    const docs = monthLogs.filter(l => ['license', 'insurance', 'registration'].includes(l.type)).reduce((sum, l) => sum + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                    const maintenance = monthLogs
                        .filter(l => !['fuel', 'parking', 'fine', 'license', 'insurance', 'registration'].includes(l.type))
                        .reduce((sum, l) => sum + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                    return { month: m, fuel, maintenance, parking, fine, docs };
                });
                
                const maxVal = Math.max(...data.map(d => d.fuel + d.maintenance + d.parking + d.fine + d.docs)) || 100;
                const w = 360, h = 240;
                const barW = (w / 6) * 0.6;
                const chartBottom = h - 36;
                const formatVal = (v) => `${store.data.settings.currency}${Math.round(v).toLocaleString()}`;
                
                return `
                    <svg viewBox="0 0 ${w} ${h}" class="w-full h-full overflow-visible">
                        <!-- Grid Lines -->
                        ${[0.25, 0.5, 0.75, 1].map(p => {
                            const y = chartBottom - (chartBottom * p);
                            return `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="currentColor" stroke-opacity="0.05" stroke-dasharray="4,4" />`;
                        }).join('')}

                        ${data.map((d, i) => {
                            const x = (w/6) * i + (w/6 - barW)/2;
                            const hFuel = (d.fuel / maxVal) * chartBottom;
                            const hMaintenance = (d.maintenance / maxVal) * chartBottom;
                            const hParking = (d.parking / maxVal) * chartBottom;
                            const hFine = (d.fine / maxVal) * chartBottom;
                            const hDocs = (d.docs / maxVal) * chartBottom;
                            const yFuel = chartBottom - hFuel;
                            const yMaintenance = yFuel - hMaintenance;
                            const yParking = yMaintenance - hParking;
                            const yFine = yParking - hFine;
                            const yDocs = yFine - hDocs;
                            const total = d.fuel + d.maintenance + d.parking + d.fine + d.docs;
                            const labelBaseSize = 11;
                            const labelSmallSize = 9;
                            const labelOpacity = (h) => (h >= 14 ? 0.95 : 0.6);
                            
                            return `
                                <rect x="${x}" y="${yFuel}" width="${barW}" height="${hFuel}" class="fill-teal-500" rx="4" data-label-id="m${i}-fuel" data-label="${utils.t('fuel')}" data-value="${formatVal(d.fuel)}" data-month="${d.month.split('-')[1]}" data-series="fuel" data-month-index="${i}" />
                                <rect x="${x}" y="${yMaintenance}" width="${barW}" height="${hMaintenance}" class="fill-purple-400" rx="4" data-label-id="m${i}-maintenance" data-label="${utils.t('maintenance')}" data-value="${formatVal(d.maintenance)}" data-month="${d.month.split('-')[1]}" data-series="maintenance" data-month-index="${i}" />
                                <rect x="${x}" y="${yParking}" width="${barW}" height="${hParking}" class="fill-blue-400" rx="4" data-label-id="m${i}-parking" data-label="${utils.t('parking')}" data-value="${formatVal(d.parking)}" data-month="${d.month.split('-')[1]}" data-series="parking" data-month-index="${i}" />
                                <rect x="${x}" y="${yFine}" width="${barW}" height="${hFine}" class="fill-red-400" rx="4" data-label-id="m${i}-fine" data-label="${utils.t('traffic_fine')}" data-value="${formatVal(d.fine)}" data-month="${d.month.split('-')[1]}" data-series="fine" data-month-index="${i}" />
                                <rect x="${x}" y="${yDocs}" width="${barW}" height="${hDocs}" class="fill-amber-400" rx="4" data-label-id="m${i}-docs" data-label="${utils.t('fixed_costs')}" data-value="${formatVal(d.docs)}" data-month="${d.month.split('-')[1]}" data-series="fixed" data-month-index="${i}" />
                                ${total > 0 ? `<text x="${x + barW/2}" y="${yDocs - 8}" text-anchor="middle" font-size="12" font-weight="800" fill="currentColor" opacity="0.9">${formatVal(total)}</text>` : ''}
                                ${d.fuel > 0 ? `<text x="${x + barW/2}" y="${yFuel + hFuel/2 + 4}" text-anchor="middle" font-size="${hFuel >= 12 ? labelBaseSize : labelSmallSize}" font-weight="600" fill="white" opacity="${labelOpacity(hFuel)}" data-label-id="m${i}-fuel" data-base-size="${hFuel >= 12 ? labelBaseSize : labelSmallSize}" pointer-events="none">${formatVal(d.fuel)}</text>` : ''}
                                ${d.maintenance > 0 ? `<text x="${x + barW/2}" y="${yMaintenance + hMaintenance/2 + 4}" text-anchor="middle" font-size="${hMaintenance >= 12 ? labelBaseSize : labelSmallSize}" font-weight="600" fill="white" opacity="${labelOpacity(hMaintenance)}" data-label-id="m${i}-maintenance" data-base-size="${hMaintenance >= 12 ? labelBaseSize : labelSmallSize}" pointer-events="none">${formatVal(d.maintenance)}</text>` : ''}
                                ${d.parking > 0 ? `<text x="${x + barW/2}" y="${yParking + hParking/2 + 4}" text-anchor="middle" font-size="${hParking >= 12 ? labelBaseSize : labelSmallSize}" font-weight="600" fill="white" opacity="${labelOpacity(hParking)}" data-label-id="m${i}-parking" data-base-size="${hParking >= 12 ? labelBaseSize : labelSmallSize}" pointer-events="none">${formatVal(d.parking)}</text>` : ''}
                                ${d.fine > 0 ? `<text x="${x + barW/2}" y="${yFine + hFine/2 + 4}" text-anchor="middle" font-size="${hFine >= 12 ? labelBaseSize : labelSmallSize}" font-weight="600" fill="white" opacity="${labelOpacity(hFine)}" data-label-id="m${i}-fine" data-base-size="${hFine >= 12 ? labelBaseSize : labelSmallSize}" pointer-events="none">${formatVal(d.fine)}</text>` : ''}
                                ${d.docs > 0 ? `<text x="${x + barW/2}" y="${yDocs + hDocs/2 + 4}" text-anchor="middle" font-size="${hDocs >= 12 ? labelBaseSize : labelSmallSize}" font-weight="600" fill="white" opacity="${labelOpacity(hDocs)}" data-label-id="m${i}-docs" data-base-size="${hDocs >= 12 ? labelBaseSize : labelSmallSize}" pointer-events="none">${formatVal(d.docs)}</text>` : ''}
                                <text x="${x + barW/2}" y="${h}" text-anchor="middle" font-size="12" font-weight="700" fill="currentColor" opacity="0.7">${d.month.split('-')[1]}</text>
                            `;
                        }).join('')}
                    </svg>
                `;
            },

            exportCSV() {
                const logs = store.getVehicleLogs();
                const fuelUnit = utils.getFuelUnit();
                const rows = [['Date', 'Type', `Odometer (${utils.getDistUnit()})`, `Cost (${store.data.settings.currency})`, 'Details']];
                logs.forEach(l => {
                    let details = l.notes || '';
                    if (l.type === 'fuel') {
                        const tank = l.isPartial ? utils.t('partial') : utils.t('full');
                        details = `${l.liters}${fuelUnit}, ${tank}`;
                    }
                    rows.push([l.date, l.type, l.odometer ?? '', l.cost ?? '', details]);
                });
                const csv = rows.map(r => r.map(utils.csvEscape).join(',')).join('\n') + '\n';
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fuelmate_export_${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
            },
            
            exportCalendar(type, alarmDays) {
                const v = store.getActiveVehicle();
                if (!v) return;
                const logs = store.getVehicleLogs(type);
                if (!logs.length || !logs[0].expiryDate) return alert('No expiry date found for this item.');
                
                const log = logs[0];
                const expDate = log.expiryDate.replace(/-/g, ''); 
                const title = `${utils.t(type)}: ${v.year} ${v.make} ${v.model}`;
                
                let alarmBlock = '';
                if (alarmDays !== null) {
                    const trigger = `-P${alarmDays}D`; 
                    alarmBlock = `BEGIN:VALARM\nTRIGGER:${trigger}\nDESCRIPTION:${title}\nACTION:DISPLAY\nEND:VALARM\n`;
                }

                const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FuelMate//EN
BEGIN:VEVENT
UID:${utils.newId()}@fuelmate
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${expDate}
SUMMARY:${title}
DESCRIPTION:Renew ${utils.t(type)} for ${v.year} ${v.make} ${v.model}
${alarmBlock}END:VEVENT
END:VCALENDAR`;

                const blob = new Blob([ics], { type: 'text/calendar' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fuelmate_${type}.ics`;
                a.click();
            },

            exportDateCalendar(title, isoDate, alarmDays = null) {
                if (!isoDate) return;
                const dateStr = isoDate.slice(0, 10).replace(/-/g, '');
                let alarmBlock = '';
                if (alarmDays !== null) {
                    const trigger = `-P${alarmDays}D`;
                    alarmBlock = `BEGIN:VALARM\nTRIGGER:${trigger}\nDESCRIPTION:${title}\nACTION:DISPLAY\nEND:VALARM\n`;
                }
                const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FuelMate//EN
BEGIN:VEVENT
UID:${utils.newId()}@fuelmate
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART;VALUE=DATE:${dateStr}
SUMMARY:${title}
${alarmBlock}END:VEVENT
END:VCALENDAR`;
                const blob = new Blob([ics], { type: 'text/calendar' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fuelmate_reminder_${dateStr}.ics`;
                a.click();
            },
            formatFileSize(bytes) {
                const b = Number(bytes) || 0;
                if (b < 1024) return `${b} B`;
                if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
                return `${(b / (1024 * 1024)).toFixed(1)} MB`;
            },
            summarizeImportData(data) {
                const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];
                const logs = Array.isArray(data?.logs) ? data.logs : [];
                const typeCounts = logs.reduce((acc, l) => {
                    const t = l?.type || 'unknown';
                    acc[t] = (acc[t] || 0) + 1;
                    return acc;
                }, {});
                const settings = data?.settings || {};
                return {
                    vehiclesCount: vehicles.length,
                    logsCount: logs.length,
                    typeCounts,
                    settings: {
                        units: settings.units,
                        currency: settings.currency,
                        language: settings.language
                    }
                };
            },
            validateImportData(data) {
                const errors = [];
                const warnings = [];
                if (!data || typeof data !== 'object') errors.push('root_not_object');

                const vehicles = Array.isArray(data?.vehicles) ? data.vehicles : null;
                const logs = Array.isArray(data?.logs) ? data.logs : null;
                const settings = data?.settings;

                if (!vehicles) errors.push('vehicles_not_array');
                if (!logs) errors.push('logs_not_array');
                if (settings !== undefined && (settings === null || typeof settings !== 'object')) errors.push('settings_not_object');

                if (vehicles) {
                    const ids = new Set();
                    for (const v of vehicles) {
                        if (!v || typeof v !== 'object') { errors.push('vehicle_not_object'); break; }
                        if (!v.id) { errors.push('vehicle_missing_id'); break; }
                        ids.add(String(v.id));
                    }
                    if (logs) {
                        let orphan = 0;
                        for (const l of logs) {
                            if (!l || typeof l !== 'object') { errors.push('log_not_object'); break; }
                            if (!l.id || !l.vehicleId || !l.type || !l.date) { errors.push('log_missing_fields'); break; }
                            if (!ids.has(String(l.vehicleId))) orphan++;
                        }
                        if (orphan > 0) warnings.push({ code: 'orphan_logs', count: orphan });
                    }
                }

                return {
                    ok: errors.length === 0,
                    errors,
                    warnings,
                    summary: utils.summarizeImportData(data)
                };
            },

            getCarColorClass(color) {
                const map = {
                    teal: 'grad-teal text-white', blue: 'grad-blue text-white', red: 'grad-red text-white',
                    black: 'grad-black text-white', white: 'grad-white', yellow: 'grad-yellow text-white',
                    purple: 'grad-purple text-white', green: 'grad-green text-white', orange: 'grad-orange text-white',
                    brown: 'grad-brown text-white', grey: 'grad-grey text-white', pink: 'grad-pink text-white', cyan: 'grad-cyan text-white'
                };
                return map[color] || map.teal;
            },
            getCarIcon(type) {
                const map = {
                    sedan: 'directions_car',
                    hatch: 'directions_car',
                    suv: 'airport_shuttle',
                    offroad_4x4: 'terrain',
                    ute: 'local_shipping',
                    bike: 'two_wheeler',
                    truck: 'local_shipping',
                    sports: 'sports_motorsports',
                    van: 'airport_shuttle',
                    bus: 'directions_bus'
                };
                return map[type] || 'directions_car';
            }
        };
