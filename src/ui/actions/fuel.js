// FuelMate UI module: actions/fuel
Object.assign(ui, {
openAddFuel(id = null) {
                const log = id ? store.data.logs.find(l => String(l.id) === String(id)) : { date: FuelMateCore.localDateKey(), odometer: '', liters: '', cost: '', location: '', notes: '', isPartial: false };
                this._fuelVehicleId = log.vehicleId || store.data.settings.activeVehicleId;
                this._fuelSnapshot = store.fuelWriteSnapshot?.(this._fuelVehicleId);
                this._fuelOriginalLog = id ? JSON.stringify(log) : null;
                this._fuelUnits = store.data.settings.units;
                this._fuelDraftKey = `fuelmate_draft_${this._fuelVehicleId}_${id || 'new'}`;
                const previousFills = store.data.logs.filter(l => l.vehicleId === this._fuelVehicleId && l.type === 'fuel' && Number.isFinite(Number(l.odometer))).sort((a,b) => Number(b.odometer) - Number(a.odometer)).slice(0, 30);
                if (!id) log.odometer = previousFills[0]?.odometer ?? store.data.vehicles.find(v => v.id === this._fuelVehicleId)?.currentOdometer ?? '';
                this._fuelCalcLast = [];
                this._fuelEditingId = id;
                const fuelUnit = utils.getFuelUnit();
                const volLabel = fuelUnit === 'kWh' ? utils.t('kwh') : (fuelUnit === 'Gal' ? utils.t('gallons') : utils.t('liters'));

                this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading flex items-center gap-2"><span class="material-icons text-teal-600">local_gas_station</span> ${utils.t('add_fuel')}</h2>
                    <div class="space-y-4">
                        ${this.getFuelDraft() ? `<button data-testid="restore-fuel-draft" data-action="ui" data-ui-method="restoreFuelDraft" class="w-full p-3 rounded-xl border theme-border">${utils.t('fuel_restore_draft')}</button>` : ''}
                        <div id="l_fuel_feedback" hidden class="p-3 rounded-xl border theme-border text-sm"></div>
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('date')}</label><input id="l_date" type="date" value="${utils.escapeAttr(log.date)}" data-input-action="ui" data-ui-method="refreshFuelTripMode" class="w-full p-3 rounded-xl"></div>

                         <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-xs theme-text-sub">${utils.t('odometer')}</label>
                                <button id="l_odo_mode" data-action="ui" data-ui-method="toggleTripMode" data-ui-pass-element="true" class="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-bold">ODO</button>
                            </div>
                            <input id="l_odo" type="number" min="0" value="${utils.escapeAttr(log.odometer)}" data-mode="odo" class="w-full p-3 rounded-xl">
                            <div id="l_trip_fields" hidden class="mt-2 space-y-2">
                                <label class="block text-xs">${utils.t('trip_choose_base')}<select id="l_trip_record" class="w-full p-3 rounded-xl" data-change-action="ui" data-ui-method="chooseFuelTripBase" data-ui-pass-value="true"><option value="">${utils.t('trip_manual_base')}</option>${previousFills.map(l => `<option value="${utils.escapeAttr(l.id)}">${utils.escapeHtml(l.date)} · ${utils.escapeHtml(l.odometer)} ${utils.getDistUnit()}</option>`).join('')}</select></label>
                                <label class="block text-xs">${utils.t('trip_base')}<input id="l_trip_base" type="number" min="0" class="w-full p-3 rounded-xl"></label>
                                <label class="flex gap-2 text-xs"><input id="l_trip_confirm" type="checkbox">${utils.t('trip_reset_confirm')}</label>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="text-xs theme-text-sub block mb-1">${volLabel}</label><input id="l_liters" type="number" min="0" step="0.01" value="${utils.escapeAttr(log.liters)}" data-input-action="ui" data-ui-method="calcFuel" data-ui-args="${encodeURIComponent(JSON.stringify(['vol']))}" class="w-full p-3 rounded-xl"></div>
                            <div><label class="text-xs theme-text-sub block mb-1">${utils.t('price_unit')}</label><input id="l_price" type="number" min="0" step="0.01" data-input-action="ui" data-ui-method="calcFuel" data-ui-args="${encodeURIComponent(JSON.stringify(['price']))}" class="w-full p-3 rounded-xl bg-slate-50"></div>
                        </div>
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('cost')}</label><input id="l_cost" type="number" min="0" step="0.01" value="${utils.escapeAttr(log.cost)}" data-input-action="ui" data-ui-method="calcFuel" data-ui-args="${encodeURIComponent(JSON.stringify(['cost']))}" class="w-full p-3 rounded-xl"></div>

                        <div class="flex items-center gap-2 bg-amber-50 p-3 rounded-xl">
                            <input type="checkbox" id="l_partial" class="w-5 h-5 text-teal-600 rounded" ${log.isPartial?'checked':''}>
                            <label for="l_partial" class="text-sm font-medium text-amber-800">${utils.t('partial_tank')}</label>
                        </div>

                        <div class="relative">
                            <label class="flex items-start gap-2 p-3 rounded-xl border theme-border">
                                <input id="l_missed_fuel" type="checkbox" class="w-5 h-5 shrink-0" ${log.missedFuel ? 'checked' : ''}>
                                <span class="text-sm theme-text-heading">${utils.t('missed_fuel')}</span>
                            </label>
                        </div>

                        <details id="l_fuel_details"><summary class="text-sm theme-text-sub">${utils.t('fuel_more_details')}</summary><div class="space-y-4 mt-3">
                        ${!id ? `<label class="flex items-center gap-2 text-sm"><input id="l_backfill" type="checkbox" data-change-action="ui" data-ui-method="refreshFuelTripMode">${utils.t('fuel_backfill')}</label>` : ''}
                        <details class="text-xs theme-text-sub"><summary>${utils.t('fuel_full_title')}</summary><p class="mt-2">${utils.t('fuel_full_help')}</p></details>
                        <details class="text-xs theme-text-sub"><summary>${utils.t('fuel_gap_help_title')}</summary><p>${utils.t('missed_fuel_help')} ${utils.t('fuel_backfill_gap_help')}</p></details>
                        <div class="relative">
                             <label class="text-xs theme-text-sub block mb-1">${utils.t('location')}</label>
                             <input id="l_loc" type="text" value="${utils.escapeAttr(log.location || '')}" class="w-full p-3 rounded-xl pr-10">
                             <button data-action="ui" data-ui-method="detectLocationFor" data-ui-args="${encodeURIComponent(JSON.stringify(['l_loc']))}" class="absolute right-3 top-8 text-teal-500"><span class="material-icons">my_location</span></button>
                        </div>

                        <div><label for="l_notes" class="text-xs theme-text-sub">${utils.t('notes')}</label><textarea id="l_notes" class="w-full p-3 rounded-xl">${utils.escapeHtml(log.notes || '')}</textarea></div>
                        <details><summary class="text-sm">${utils.t('meter_convert')}</summary><p class="text-xs theme-text-sub my-2">${utils.t('meter_help')}</p><label class="block text-xs">${utils.t('meter_before')}<input id="l_meter_before" type="number" min="0" class="w-full p-3 rounded-xl"></label><label class="block text-xs">${utils.t('meter_start')}<input id="l_meter_start" type="number" min="0" class="w-full p-3 rounded-xl"></label><label class="block text-xs">${utils.t('meter_now')}<input id="l_meter_now" type="number" min="0" class="w-full p-3 rounded-xl"></label><button class="w-full p-3 rounded-xl border theme-border" data-action="ui" data-ui-method="convertFuelMeter">${utils.t('meter_apply')}</button></details>
                        </div></details>
                        ${log.missedFuel ? `<label class="flex items-start gap-2 p-3 rounded-xl border theme-border"><input id="l_gap_confirm" type="checkbox" class="w-5 h-5 shrink-0"><span class="text-sm theme-text-heading">${utils.t('gap_clear_confirm')}<span class="block text-xs theme-text-sub mt-1">${utils.t('gap_clear_help')}</span></span></label>` : ''}
                        <div class="flex gap-3 mt-4">
                            ${id ? `<button data-action="ui" data-ui-method="deleteLog" data-ui-args="${encodeURIComponent(JSON.stringify([id]))}" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold">${utils.t('delete')}</button>` : ''}
                            <button data-testid="save-fuel" data-action="ui" data-ui-method="submitFuel" data-ui-args="${encodeURIComponent(JSON.stringify([id || '']))}" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
                        </div>
                    </div>
                `);
                // Init calc
                this.refreshFuelTripMode();
                setTimeout(() => ui.calcFuel('init'), 100);
            },

getFuelDraft() {
                try { return JSON.parse(sessionStorage.getItem(this._fuelDraftKey) || 'null') || this._fuelDrafts?.[this._fuelDraftKey] || null; } catch (_) { return this._fuelDrafts?.[this._fuelDraftKey] || null; }
            },

captureFuelDraft() {
                if (!document.querySelector?.('[data-testid="save-fuel"]') || !this._fuelDraftKey || document.getElementById('modal-overlay')?.classList.contains('hidden')) return;
                const fields = {};
                for (const id of ['l_date','l_odo','l_liters','l_price','l_cost','l_loc','l_notes','l_partial','l_missed_fuel','l_backfill','l_trip_base','l_meter_before','l_meter_start','l_meter_now']) {
                    const el = document.getElementById(id);
                    if (el) fields[id] = { value: el.value, checked: el.checked };
                }
                this._fuelDraft = { fields, mode: document.getElementById('l_odo').dataset.mode, snapshot: this._fuelSnapshot, originalLog: this._fuelOriginalLog, units: this._fuelUnits };
                this._fuelDrafts ||= {};
                this._fuelDrafts[this._fuelDraftKey] = this._fuelDraft;
                try { sessionStorage.setItem(this._fuelDraftKey, JSON.stringify(this._fuelDraft)); } catch (_) {}
            },

restoreFuelDraft() {
                const draft = this.getFuelDraft();
                if (!draft?.fields) return;
                for (const [id, field] of Object.entries(draft.fields)) {
                    const el = document.getElementById(id);
                    if (el) { el.value = field.value; el.checked = !!field.checked; }
                }
                document.getElementById('l_odo').dataset.mode = draft.mode || 'odo';
                this._fuelSnapshot = draft.snapshot;
                this._fuelOriginalLog = draft.originalLog;
                this._fuelUnits = draft.units;
                this.refreshFuelTripMode();
                const details = document.getElementById('l_fuel_details');
                if (details) details.open = true;
                this.showFuelRefresh();
            },

showFuelRefresh() {
                const panel = document.getElementById('l_fuel_feedback');
                if (!panel) return;
                panel.hidden = false;
                panel.innerHTML = `<p>${utils.t('fuel_refresh_help')}</p><button data-testid="refresh-fuel-data" data-action="ui" data-ui-method="refreshFuelData" class="w-full p-3 rounded-xl border theme-border mt-2">${utils.t('fuel_refresh')}</button>`;
            },

async refreshFuelData() {
                this.captureFuelDraft();
                try {
                    await store.loadAllData();
                    const vehicle = store.data.vehicles.find(v => v.id === this._fuelVehicleId);
                    const existing = store.data.logs.find(l => l.id === this._fuelEditingId);
                    if (!vehicle || (this._fuelEditingId && !existing)) { alert(utils.t('fuel_source_deleted')); return; }
                    if (existing && JSON.stringify(existing) !== this._fuelOriginalLog && !confirm(`${utils.t('fuel_edit_changed')}\n${existing.date} · ${existing.odometer} ${utils.getDistUnit()} · ${existing.liters} · ${existing.cost}`)) return;
                    if (this._fuelUnits !== store.data.settings.units) {
                        const factor = store.data.settings.units === 'imperial' ? 0.621371192237334 : 1 / 0.621371192237334;
                        for (const id of ['l_odo','l_trip_base','l_meter_before','l_meter_start','l_meter_now']) {
                            const el = document.getElementById(id);
                            if (el?.value !== '' && el?.value != null) el.value = String(Math.round(Number(el.value) * factor * 1000) / 1000);
                        }
                        this._fuelUnits = store.data.settings.units;
                        alert(utils.t('fuel_units_refreshed'));
                    }
                    this._fuelOriginalLog = existing ? JSON.stringify(existing) : null;
                    this._fuelSnapshot = store.fuelWriteSnapshot(this._fuelVehicleId);
                    const panel = document.getElementById('l_fuel_feedback');
                    panel.textContent = utils.t('fuel_refreshed');
                    this.captureFuelDraft();
                } catch (_) { alert(utils.t('fuel_save_failed')); }
            },

chooseFuelTripBase(id) {
                const log = store.data.logs.find(l => l.id === id && l.vehicleId === this._fuelVehicleId);
                document.getElementById('l_trip_base').value = log ? String(log.odometer) : '';
                document.getElementById('l_trip_confirm').checked = false;
            },

convertFuelMeter() {
                const values = ['l_meter_before','l_meter_start','l_meter_now'].map(id => document.getElementById(id).value);
                const [before, start, now] = values.map(Number);
                if (values.some(v => v === '' || !Number.isFinite(Number(v)) || Number(v) < 0) || now < start) { alert(utils.t('validation_odometer')); return; }
                const input = document.getElementById('l_odo');
                input.value = String(before + now - start);
                input.dataset.mode = 'odo';
                this.refreshFuelTripMode();
                this.captureFuelDraft();
                alert(`${utils.t('meter_result')} ${input.value} ${utils.getDistUnit()}`);
            },

openFuelConflict(id) {
                this.captureFuelDraft();
                this.openLogEditorById(id);
            },

detectLocationFor(targetId) {
                utils.detectLocation((location) => {
                    const target = document.getElementById(targetId);
                    if (target) target.value = location;
                });
            },

fuelTripAllowed() {
                const date = document.getElementById('l_date')?.value;
                return !this._fuelEditingId && !document.getElementById('l_backfill')?.checked && (!date || date === FuelMateCore.localDateKey());
            },

refreshFuelTripMode() {
                const input = document.getElementById('l_odo');
                const button = document.getElementById('l_odo_mode');
                const allowed = this.fuelTripAllowed();
                if (!allowed && input?.dataset.mode === 'trip') {
                    input.value = '';
                    input.dataset.mode = 'odo';
                    input.placeholder = 'ODO';
                }
                if (button) {
                    button.disabled = !allowed;
                    button.innerText = input?.dataset.mode === 'trip' ? 'TRIP' : 'ODO';
                }
                const help = document.getElementById('l_trip_help');
                if (help) help.textContent = utils.t('trip_history_help');
                const fields = document.getElementById('l_trip_fields');
                if (fields) fields.hidden = input?.dataset.mode !== 'trip';
            },

toggleTripMode(button) {
                const input = document.getElementById('l_odo');
                if (!input) return;
                if (!this.fuelTripAllowed()) { this.refreshFuelTripMode(); return; }
                if (input.dataset.mode === 'trip') {
                    if (input.value && (!Number.isFinite(Number(input.value)) || Number(input.value) < 0)) {
                        input.reportValidity?.();
                        return;
                    }
                    if (input.value && !this.normalizeTripOdometer(input)) return;
                    else if (!input.value) input.value = input.dataset.previousOdometer || '';
                    input.dataset.mode = 'odo';
                    input.placeholder = 'Total Odo';
                    button.innerText = 'ODO';
                    this.refreshFuelTripMode();
                    return;
                }
                input.dataset.previousOdometer = input.value;
                input.dataset.mode = 'trip';
                button.innerText = 'TRIP';
                input.placeholder = 'Trip Dist (e.g. 400)';
                input.value = '';
                input.focus();
                this.refreshFuelTripMode();
            },

normalizeTripOdometer(input) {
                if (input?.dataset?.mode !== 'trip') return true;
                if (!this.fuelTripAllowed()) { this.refreshFuelTripMode(); return false; }
                const trip = Number(input.value);
                const base = document.getElementById('l_trip_base')?.value;
                if (input.value === '' || !Number.isFinite(trip) || trip < 0 || base === '' || base == null || !Number.isFinite(Number(base)) || Number(base) < 0 || !document.getElementById('l_trip_confirm')?.checked) {
                    alert(utils.t('trip_reset_required')); return false;
                }
                const current = Number(base);
                input.value = String(current + trip);
                input.dataset.mode = 'odo';
                input.placeholder = 'Total Odo';
                const button = document.getElementById('l_odo_mode');
                if (button) button.innerText = 'ODO';
                this.refreshFuelTripMode();
                return true;
            },

calcFuel(trigger) {
                const litersEl = document.getElementById('l_liters');
                const costEl = document.getElementById('l_cost');
                const priceEl = document.getElementById('l_price');

                const vol = parseFloat(litersEl.value) || 0;
                const cost = parseFloat(costEl.value) || 0;
                const price = parseFloat(priceEl.value) || 0;

                const compute = (targetKey) => {
                    if (targetKey === 'liters') {
                        if (price > 0 && cost > 0) litersEl.value = (cost / price).toFixed(2);
                    } else if (targetKey === 'cost') {
                        if (vol > 0 && price > 0) costEl.value = (vol * price).toFixed(2);
                    } else if (targetKey === 'price') {
                        if (vol > 0 && cost > 0) priceEl.value = (cost / vol).toFixed(3);
                    }
                };

                // Initialize derived field without affecting "last 2 inputs" behavior.
                if (trigger === 'init') {
                    if (!price && vol > 0 && cost > 0) compute('price');
                    else if (!cost && vol > 0 && price > 0) compute('cost');
                    else if (!vol && cost > 0 && price > 0) compute('liters');
                    return;
                }

                // Input logic: last 2 edited fields determine the 3rd.
                if (!this._fuelCalcLast) this._fuelCalcLast = [];
                const key = trigger === 'vol' ? 'liters' : trigger; // 'cost' | 'price' | 'liters'
                this._fuelCalcLast = this._fuelCalcLast.filter(k => k !== key);
                this._fuelCalcLast.push(key);
                if (this._fuelCalcLast.length > 2) this._fuelCalcLast = this._fuelCalcLast.slice(-2);
                if (this._fuelCalcLast.length < 2) return;

                const keys = new Set(this._fuelCalcLast);
                const targetKey = ['liters', 'cost', 'price'].find(k => !keys.has(k));
                if (!targetKey) return;

                compute(targetKey);
            },

async submitFuel(id) {
                if (this._savingFuel) return;
                const date = this.validateDateField('l_date');
                if (!date) return;
                if (!this.normalizeTripOdometer(document.getElementById('l_odo'))) return;
                const odometer = this.validateNumberField('l_odo', { messageKey: 'validation_odometer' });
                if (!odometer.ok) return;
                const fuel = this.validateNumberField('l_liters', { positive: true, messageKey: 'validation_fuel' });
                if (!fuel.ok) return;
                const cost = this.validateNumberField('l_cost', { messageKey: 'validation_cost' });
                if (!cost.ok) return;

                const existing = id ? store.data.logs.find(item => item.id === id) : null;
                if (existing?.missedFuel && !document.getElementById('l_missed_fuel')?.checked
                    && !document.getElementById('l_gap_confirm')?.checked) {
                    alert(utils.t('gap_clear_required'));
                    return;
                }
                const log = {
                    ...existing,
                    id: id || utils.newId(),
                    vehicleId: existing?.vehicleId || this._fuelVehicleId || store.data.settings.activeVehicleId,
                    type: 'fuel',
                    date,
                    odometer: odometer.number,
                    liters: fuel.value,
                    cost: cost.value,
                    location: document.getElementById('l_loc').value.trim(),
                    isPartial: document.getElementById('l_partial').checked,
                    missedFuel: !!document.getElementById('l_missed_fuel')?.checked,
                    notes: document.getElementById('l_notes')?.value ?? existing?.notes ?? ''
                };

                const others = store.data.logs.filter(item => item.vehicleId === log.vehicleId && item.id !== log.id);
                const conflicts = others.filter(item => FuelMateCore.isValidIsoDate(item.date) && Number.isFinite(Number(item.odometer)) && item.odometer !== '' && item.odometer != null &&
                    ((item.date < date && Number(item.odometer) > log.odometer) || (item.date > date && Number(item.odometer) < log.odometer)));
                if (conflicts.length) {
                    const panel = document.getElementById('l_fuel_feedback');
                    if (panel) {
                        panel.hidden = false;
                        panel.innerHTML = `<p>${utils.t('fuel_date_odo_conflict')}</p>${conflicts.slice(0, 5).map(item => `<button class="block w-full p-2 border theme-border rounded-xl mt-2" data-action="ui" data-ui-method="openFuelConflict" data-ui-args="${encodeURIComponent(JSON.stringify([item.id]))}">${utils.escapeHtml(item.date)} · ${utils.escapeHtml(item.odometer)} ${utils.getDistUnit()} · ${utils.t('fuel_edit_conflict')}</button>`).join('')}`;
                    }
                    this.captureFuelDraft();
                    alert(`${utils.t('fuel_date_odo_conflict')}\n${conflicts.slice(0, 3).map(item => `${item.date} · ${item.odometer} ${utils.getDistUnit()}`).join('\n')}`); return;
                }
                const duplicate = others.find(item => item.type === 'fuel' && Math.abs(Date.parse(item.date) - Date.parse(date)) <= 86400000 && Math.abs(Number(item.odometer) - log.odometer) <= 2 && Math.abs(Number(item.liters) - Number(log.liters)) <= 0.2 && Math.abs(Number(item.cost) - Number(log.cost)) <= 0.5);
                if (duplicate && !confirm(`${utils.t('fuel_duplicate_confirm')}\n${duplicate.date} · ${duplicate.odometer} ${utils.getDistUnit()} · ${duplicate.liters} · ${duplicate.cost}`)) return;

                this._savingFuel = true;
                try {
                    if (id) await store.updateLog(log, this._fuelSnapshot);
                    else await store.addLog(log, this._fuelSnapshot);
                    try { sessionStorage.removeItem(this._fuelDraftKey); } catch (_) {}
                    if (this._fuelDrafts) delete this._fuelDrafts[this._fuelDraftKey];
                    this._fuelDraft = null;
                    this._fuelDraftKey = null;
                    this.closeModal();
                    this.render();
                } catch (error) {
                    this.captureFuelDraft();
                    if (error?.message === 'fuel_stale') this.showFuelRefresh();
                    alert(utils.t(error?.message === 'fuel_stale' ? 'fuel_stale' : 'fuel_save_failed'));
                } finally { this._savingFuel = false; }
            }
});
