// FuelMate UI module: actions/fuel
Object.assign(ui, {
openAddFuel(id = null) {
                const log = id ? store.data.logs.find(l => String(l.id) === String(id)) : { date: new Date().toISOString().slice(0, 10), odometer: store.getActiveVehicle()?.currentOdometer || '', liters: '', cost: '', location: '', notes: '', isPartial: false };
                this._fuelCalcLast = [];
                const fuelUnit = utils.getFuelUnit();
                const volLabel = fuelUnit === 'kWh' ? utils.t('kwh') : (fuelUnit === 'Gal' ? utils.t('gallons') : utils.t('liters'));

                this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading flex items-center gap-2"><span class="material-icons text-teal-600">local_gas_station</span> ${utils.t('add_fuel')}</h2>
                    <div class="space-y-4">
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('date')}</label><input id="l_date" type="date" value="${utils.escapeAttr(log.date)}" class="w-full p-3 rounded-xl"></div>

                         <div>
                            <div class="flex justify-between items-center mb-1">
                                <label class="text-xs theme-text-sub">${utils.t('odometer')}</label>
                                <button id="l_odo_mode" onclick="ui.toggleTripMode(this)" class="text-[10px] bg-slate-200 px-2 py-0.5 rounded font-bold">ODO</button>
                            </div>
                            <input id="l_odo" type="number" min="0" value="${utils.escapeAttr(log.odometer)}" data-mode="odo" class="w-full p-3 rounded-xl" onblur="ui.normalizeTripOdometer(this)">
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="text-xs theme-text-sub block mb-1">${volLabel}</label><input id="l_liters" type="number" min="0" step="0.01" value="${utils.escapeAttr(log.liters)}" class="w-full p-3 rounded-xl" oninput="ui.calcFuel('vol')"></div>
                            <div><label class="text-xs theme-text-sub block mb-1">${utils.t('price_unit')}</label><input id="l_price" type="number" min="0" step="0.01" class="w-full p-3 rounded-xl bg-slate-50" oninput="ui.calcFuel('price')"></div>
                        </div>
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('cost')}</label><input id="l_cost" type="number" min="0" step="0.01" value="${utils.escapeAttr(log.cost)}" class="w-full p-3 rounded-xl" oninput="ui.calcFuel('cost')"></div>

                        <div class="flex items-center gap-2 bg-amber-50 p-3 rounded-xl">
                            <input type="checkbox" id="l_partial" class="w-5 h-5 text-teal-600 rounded" ${log.isPartial?'checked':''}>
                            <label for="l_partial" class="text-sm font-medium text-amber-800">${utils.t('partial_tank')}</label>
                        </div>

                        <div class="relative">
                             <label class="text-xs theme-text-sub block mb-1">${utils.t('location')}</label>
                             <input id="l_loc" type="text" value="${utils.escapeAttr(log.location || '')}" class="w-full p-3 rounded-xl pr-10">
                             <button onclick="utils.detectLocation(l => document.getElementById('l_loc').value=l)" class="absolute right-3 top-8 text-teal-500"><span class="material-icons">my_location</span></button>
                        </div>

                        <div class="flex gap-3 mt-4">
                            ${id ? `<button onclick="ui.deleteLog('${id}')" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold">${utils.t('delete')}</button>` : ''}
                            <button data-testid="save-fuel" onclick="ui.submitFuel('${id || ''}')" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
                        </div>
                    </div>
                `);
                // Init calc
                setTimeout(() => ui.calcFuel('init'), 100);
            },

toggleTripMode(button) {
                const input = document.getElementById('l_odo');
                if (!input) return;
                const enteringTrip = input.dataset.mode !== 'trip';
                input.dataset.mode = enteringTrip ? 'trip' : 'odo';
                button.innerText = enteringTrip ? 'TRIP' : 'ODO';
                input.placeholder = enteringTrip ? 'Trip Dist (e.g. 400)' : 'Total Odo';
                if (enteringTrip) {
                    input.dataset.previousOdometer = input.value;
                    input.value = '';
                    input.focus();
                } else if (!input.value) {
                    input.value = input.dataset.previousOdometer || store.getActiveVehicle()?.currentOdometer || '';
                }
            },

normalizeTripOdometer(input) {
                if (input?.dataset?.mode !== 'trip' || input.value === '') return;
                const trip = Number(input.value);
                if (!Number.isFinite(trip) || trip < 0) return;
                const current = Number(store.getActiveVehicle()?.currentOdometer) || 0;
                input.value = String(current + trip);
                input.dataset.mode = 'odo';
                input.placeholder = 'Total Odo';
                const button = document.getElementById('l_odo_mode');
                if (button) button.innerText = 'ODO';
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
                const date = this.validateDateField('l_date');
                if (!date) return;
                const odometer = this.validateNumberField('l_odo', { messageKey: 'validation_odometer' });
                if (!odometer.ok) return;
                const fuel = this.validateNumberField('l_liters', { positive: true, messageKey: 'validation_fuel' });
                if (!fuel.ok) return;
                const cost = this.validateNumberField('l_cost', { messageKey: 'validation_cost' });
                if (!cost.ok) return;

                const log = {
                    id: id || utils.newId(),
                    vehicleId: store.data.settings.activeVehicleId,
                    type: 'fuel',
                    date,
                    odometer: odometer.number,
                    liters: fuel.value,
                    cost: cost.value,
                    location: document.getElementById('l_loc').value.trim(),
                    isPartial: document.getElementById('l_partial').checked,
                    notes: ''
                };

                if (id) await store.updateLog(log);
                else await store.addLog(log);
                this.closeModal();
                this.render();
            }
});
