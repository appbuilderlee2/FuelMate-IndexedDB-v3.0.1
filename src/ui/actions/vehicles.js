// FuelMate UI module: actions/vehicles
Object.assign(ui, {
openAddVehicle(id = null) {
                const v = id ? store.data.vehicles.find(v => v.id === id) : {
                    make: '',
                    model: '',
                    year: new Date().getFullYear(),
                    currentOdometer: '',
                    color: 'teal',
                    type: 'sedan',
                    fuelUnit: 'L',
                    driveType: 'fwd',
                    maintenanceDist: store.data.settings.maintenanceDist,
                    maintenanceTime: store.data.settings.maintenanceTime,
                    tireReplaceDist: store.data.settings.tireReplaceDist,
                    tireReplaceYears: store.data.settings.tireReplaceYears
                };
                const colors = ['teal','blue','red','black','white','yellow','purple','green','orange','brown','grey','pink','cyan'];

                this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading">${id ? utils.t('edit_vehicle') : utils.t('add_vehicle')}</h2>
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-3">
                            <div><label class="text-xs theme-text-sub block mb-1">Make</label><input id="v_make" type="text" value="${utils.escapeAttr(v.make)}" class="w-full p-3 rounded-xl" placeholder="Honda"></div>
                            <div><label class="text-xs theme-text-sub block mb-1">Model</label><input id="v_model" type="text" value="${utils.escapeAttr(v.model)}" class="w-full p-3 rounded-xl" placeholder="Civic"></div>
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                             <div><label class="text-xs theme-text-sub block mb-1">Year</label><input id="v_year" type="number" min="1886" max="${new Date().getFullYear() + 1}" value="${utils.escapeAttr(v.year)}" class="w-full p-3 rounded-xl"></div>
                             <div><label class="text-xs theme-text-sub block mb-1">${utils.t('odometer')}</label><input id="v_odo" type="number" min="0" value="${utils.escapeAttr(v.currentOdometer)}" class="w-full p-3 rounded-xl"></div>
                        </div>

                        <div>
                             <label class="text-xs theme-text-sub block mb-1">${utils.t('color')}</label>
                             <div class="grid grid-cols-7 gap-2">
                                 ${colors.map(c => `
                                     <label class="cursor-pointer relative flex items-center justify-center">
                                         <input type="radio" name="v_color" value="${c}" class="sr-only color-radio" ${v.color===c ? 'checked' : ''}>
                                         <div class="w-8 h-8 rounded-full ${utils.getCarColorClass(c)} transition-transform hover:scale-110"></div>
                                     </label>
                                 `).join('')}
                             </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                             <div>
                                <label class="text-xs theme-text-sub block mb-1">${utils.t('type')}</label>
                                <select id="v_type" class="w-full p-3 rounded-xl text-sm">
                                    ${['sedan','hatch','suv','offroad_4x4','ute','bike','truck','sports','van','bus'].map(t => `<option value="${t}" ${v.type===t?'selected':''}>${utils.t('type_'+t)}</option>`).join('')}
                                </select>
                             </div>
                             <div>
                                <label class="text-xs theme-text-sub block mb-1">Fuel/Energy</label>
                                <select id="v_unit" class="w-full p-3 rounded-xl text-sm">
                                    <option value="L" ${v.fuelUnit==='L'?'selected':''}>Liters (Gas)</option>
                                    <option value="Gal" ${v.fuelUnit==='Gal'?'selected':''}>Gallons (Gas)</option>
                                    <option value="kWh" ${v.fuelUnit==='kWh'?'selected':''}>kWh (EV)</option>
                                </select>
                             </div>
                        </div>

                        <div>
                            <label class="text-xs theme-text-sub block mb-1">${utils.t('drive_type')}</label>
                            <select id="v_drive" class="w-full p-3 rounded-xl text-sm">
                                <option value="fwd" ${(v.driveType||'fwd')==='fwd'?'selected':''}>${utils.t('drive_fwd')}</option>
                                <option value="rwd" ${(v.driveType||'fwd')==='rwd'?'selected':''}>${utils.t('drive_rwd')}</option>
                                <option value="awd" ${(v.driveType||'fwd')==='awd'?'selected':''}>${utils.t('drive_awd')}</option>
                            </select>
                        </div>

                        <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border theme-border">
                            <div class="text-xs font-bold theme-text-heading uppercase tracking-wider mb-2">${utils.t('interval_settings')}</div>
                            <div class="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <div class="text-[10px] font-bold theme-text-sub uppercase tracking-wider mb-1">${utils.t('service_interval')}</div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('service_interval_dist')}</label>
                                    <select id="v_maint_dist" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                        <option value="none" ${(v.maintenanceDist ?? store.data.settings.maintenanceDist)==='none'?'selected':''}>${utils.t('int_none')}</option>
                                        <option value="5000" ${(v.maintenanceDist ?? store.data.settings.maintenanceDist)==='5000'?'selected':''}>${utils.t('int_5k')}</option>
                                        <option value="10000" ${(v.maintenanceDist ?? store.data.settings.maintenanceDist)==='10000'?'selected':''}>${utils.t('int_10k')}</option>
                                    </select>
                                    <label class="text-xs theme-text-sub block mb-1 mt-2">${utils.t('service_interval_time')}</label>
                                    <select id="v_maint_time" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                        <option value="none" ${(v.maintenanceTime ?? store.data.settings.maintenanceTime)==='none'?'selected':''}>${utils.t('int_none')}</option>
                                        <option value="6" ${(v.maintenanceTime ?? store.data.settings.maintenanceTime)==='6'?'selected':''}>${utils.t('int_6m')}</option>
                                        <option value="12" ${(v.maintenanceTime ?? store.data.settings.maintenanceTime)==='12'?'selected':''}>${utils.t('int_1yr')}</option>
                                    </select>
                                </div>
                                <div>
                                    <div class="text-[10px] font-bold theme-text-sub uppercase tracking-wider mb-1">${utils.t('tire_replace')}</div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_interval_dist')} (${utils.getDistUnit()})</label>
                                    <input id="v_tire_dist" type="number" min="0" step="100" value="${v.tireReplaceDist ?? store.data.settings.tireReplaceDist ?? 40000}" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                    <label class="text-xs theme-text-sub block mb-1 mt-2">${utils.t('tire_interval_time')}</label>
                                    <select id="v_tire_years" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                        ${[0,2,3,4,5,6].map(y => `<option value="${y}" ${parseInt(v.tireReplaceYears ?? store.data.settings.tireReplaceYears)==y?'selected':''}>${y===0 ? utils.t('int_none') : y}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="flex gap-3 mt-6">
                            ${id ? `<button data-action="ui" data-ui-method="deleteVehicle" data-ui-args="${encodeURIComponent(JSON.stringify([id]))}" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold">${utils.t('delete')}</button>` : ''}
                            <button data-testid="save-vehicle" data-action="ui" data-ui-method="saveVehicle" data-ui-args="${encodeURIComponent(JSON.stringify([id || '']))}" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
                        </div>
                        ${id ? `<button data-action="ui" data-ui-method="clearVehicleData" data-ui-args="${encodeURIComponent(JSON.stringify([id]))}" class="w-full mt-2 text-xs text-red-400 py-2 border border-red-100 rounded-xl hover:bg-red-50">${utils.t('clear_history')}</button>` : ''}
                    </div>
                `);
            },

async saveVehicle(id) {
                const make = document.getElementById('v_make').value.trim();
                const model = document.getElementById('v_model').value.trim();
                if (!make || !model) return alert('Make and Model are required');
                const year = this.validateNumberField('v_year', { positive: true, integer: true, messageKey: 'validation_year' });
                const odometer = this.validateNumberField('v_odo', { required: false, messageKey: 'validation_odometer' });
                const tireDistance = this.validateNumberField('v_tire_dist', { required: false, messageKey: 'validation_nonnegative' });
                if (!year.ok || !odometer.ok || !tireDistance.ok) return;
                if (year.number < 1886 || year.number > new Date().getFullYear() + 1) return alert(utils.t('validation_year'));
                const existing = id ? store.data.vehicles.find(v => v.id === id) : null;

                const vehicle = {
                    id: id || utils.newId(),
                    make, model,
                    year: String(year.number),
                    currentOdometer: odometer.number ?? 0,
                    color: document.querySelector('input[name="v_color"]:checked').value,
                    type: document.getElementById('v_type').value,
                    fuelUnit: document.getElementById('v_unit').value,
                    driveType: document.getElementById('v_drive').value,
                    maintenanceDist: document.getElementById('v_maint_dist').value,
                    maintenanceTime: document.getElementById('v_maint_time').value,
                    tireReplaceDist: tireDistance.number ?? 0,
                    tireReplaceYears: parseInt(document.getElementById('v_tire_years').value) || 0
                };

                if (id) await store.updateVehicle(vehicle);
                else await store.addVehicle(vehicle);

                this.closeModal();
                this.render();
            },

deleteVehicle(id) {
                setTimeout(() => {
                    if (confirm(utils.t('confirm_delete'))) {
                        store.deleteVehicle(id).then(() => {
                            this.closeModal();
                            this.render();
                        });
                    }
                }, 50);
            },

clearVehicleData(id) {
                setTimeout(() => {
                    if (confirm(utils.t('confirm_clear'))) {
                        setTimeout(() => {
                            if (confirm(utils.t('confirm_clear_2'))) {
                                store.clearVehicleLogs(id).then(() => {
                                    this.closeModal();
                                    this.render();
                                });
                            }
                        }, 200);
                    }
                }, 50);
            },

async addDemoCar() {
                const existing = store.data.vehicles.find(v => v.make === 'DEMO' && v.model === 'Car');
                if (existing) {
                    store.data.settings.activeVehicleId = existing.id;
                    await store.saveData();
                    this.render();
                    return;
                }

                const now = new Date();
                const isoDaysAgo = (daysAgo) => {
                    const d = new Date(now);
                    d.setDate(d.getDate() - daysAgo);
                    return d.toISOString().slice(0, 10);
                };
                const isoDaysFromNow = (daysFromNow) => {
                    const d = new Date(now);
                    d.setDate(d.getDate() + daysFromNow);
                    return d.toISOString().slice(0, 10);
                };

                const vehicleId = utils.newId();
                const demoVehicle = {
                    id: vehicleId,
                    make: 'DEMO',
                    model: 'Car',
                    year: now.getFullYear(),
                    currentOdometer: 24222,
                    color: 'teal',
                    type: 'sedan',
                    fuelUnit: (store.data.settings.units === 'imperial') ? 'Gal' : 'L',
                    driveType: 'fwd',
                    maintenanceDist: store.data.settings.maintenanceDist,
                    maintenanceTime: store.data.settings.maintenanceTime,
                    tireReplaceDist: store.data.settings.tireReplaceDist,
                    tireReplaceYears: store.data.settings.tireReplaceYears
                };

                await store.addVehicle(demoVehicle);
                store.data.settings.activeVehicleId = vehicleId;

                if (!Number.isFinite(parseInt(store.data.settings.maintenanceDist))) store.data.settings.maintenanceDist = '5000';
                if (!Number.isFinite(parseInt(store.data.settings.maintenanceTime))) store.data.settings.maintenanceTime = '6';
                if (!store.data.settings.tireReplaceDist) store.data.settings.tireReplaceDist = 40000;
                if (!store.data.settings.tireReplaceYears) store.data.settings.tireReplaceYears = 4;
                store.data.settings.lastBackupDate = isoDaysAgo(45);
                demoVehicle.maintenanceDist = store.data.settings.maintenanceDist;
                demoVehicle.maintenanceTime = store.data.settings.maintenanceTime;
                demoVehicle.tireReplaceDist = store.data.settings.tireReplaceDist;
                demoVehicle.tireReplaceYears = store.data.settings.tireReplaceYears;
                await store.saveData();

                const add = async (log) => store.addLog({ id: utils.newId(), vehicleId, ...log });

                const demoFuelNotes = store.data.settings.language === 'zh' ? '示範：加油記錄' : 'Demo: fuel log';
                await add({ type: 'fuel', date: isoDaysAgo(150), odometer: 18000, liters: '42.0', cost: '560', location: 'Shell', notes: demoFuelNotes, isPartial: false });
                await add({ type: 'fuel', date: isoDaysAgo(132), odometer: 18620, liters: '10.0', cost: '135', location: 'Shell', notes: store.data.settings.language === 'zh' ? '示範：Partial' : 'Demo: partial', isPartial: true });
                await add({ type: 'fuel', date: isoDaysAgo(120), odometer: 19010, liters: '39.5', cost: '520', location: 'Esso', notes: demoFuelNotes, isPartial: false });
                await add({ type: 'fuel', date: isoDaysAgo(90), odometer: 20180, liters: '41.2', cost: '545', location: 'Caltex', notes: demoFuelNotes, isPartial: false });
                await add({ type: 'fuel', date: isoDaysAgo(60), odometer: 21480, liters: '40.1', cost: '532', location: 'Caltex', notes: demoFuelNotes, isPartial: false });
                await add({ type: 'fuel', date: isoDaysAgo(20), odometer: 23390, liters: '38.6', cost: '512', location: 'Shell', notes: demoFuelNotes, isPartial: false });

                await add({ type: 'parking', date: isoDaysAgo(18), cost: '48', location: 'Central', notes: store.data.settings.language === 'zh' ? '示範：停車場' : 'Demo: parking' });
                await add({ type: 'parking', date: isoDaysAgo(7), cost: '36', location: 'Mall', notes: store.data.settings.language === 'zh' ? '示範：短泊' : 'Demo: short stay' });
                await add({ type: 'parking', date: isoDaysAgo(45), cost: '62', location: 'Airport', notes: store.data.settings.language === 'zh' ? '示範：機場停車' : 'Demo: airport parking' });
                await add({ type: 'parking', date: isoDaysAgo(80), cost: '30', location: 'Street', notes: store.data.settings.language === 'zh' ? '示範：路邊停車' : 'Demo: street parking' });

                await add({ type: 'service', date: isoDaysAgo(75), odometer: 20600, cost: '880', location: 'Garage', notes: store.data.settings.language === 'zh' ? '示範：更換機油' : 'Demo: oil change' });
                await add({ type: 'service', date: isoDaysAgo(110), odometer: 19880, cost: '650', location: 'Service Center', notes: store.data.settings.language === 'zh' ? '示範：更換煞車皮' : 'Demo: brake pads' });
                await add({ type: 'repair', date: isoDaysAgo(35), odometer: 22400, cost: '320', location: 'Garage', notes: store.data.settings.language === 'zh' ? '示範：更換雨刷' : 'Demo: wiper blades' });
                await add({ type: 'repair', date: isoDaysAgo(15), odometer: 24100, cost: '420', location: 'Garage', notes: store.data.settings.language === 'zh' ? '示範：更換電池' : 'Demo: battery' });
                await add({ type: 'car_wash', date: isoDaysAgo(12), odometer: 23500, cost: '80', location: 'Car Wash', notes: store.data.settings.language === 'zh' ? '示範：洗車' : 'Demo: car wash' });
                await add({ type: 'car_wash', date: isoDaysAgo(42), odometer: 21980, cost: '60', location: 'Car Wash', notes: store.data.settings.language === 'zh' ? '示範：快速洗車' : 'Demo: quick wash' });
                await add({ type: 'car_accessories', date: isoDaysAgo(5), odometer: 24050, cost: '199', location: '', notes: store.data.settings.language === 'zh' ? '示範：配件' : 'Demo: accessories' });
                await add({ type: 'car_accessories', date: isoDaysAgo(32), odometer: 22980, cost: '120', location: 'Auto Shop', notes: store.data.settings.language === 'zh' ? '示範：車內配件' : 'Demo: interior accessories' });
                await add({ type: 'periodic_maintenance', date: isoDaysAgo(160), odometer: 17500, cost: '0', location: '', notes: store.data.settings.language === 'zh' ? '示範：定期保養提醒' : 'Demo: periodic maintenance' });

                await add({ type: 'fine', date: isoDaysAgo(28), odometer: 23000, cost: '450', location: '', notes: 'speeding, demo' });
                await add({ type: 'fine', date: isoDaysAgo(95), odometer: 21050, cost: '320', location: '', notes: 'no_parking, demo' });

                await add({ type: 'license', date: isoDaysAgo(10), odometer: 23800, cost: '600', expiryDate: isoDaysFromNow(14), location: '', notes: '' });
                await add({ type: 'insurance', date: isoDaysAgo(9), odometer: 23810, cost: '1200', expiryDate: isoDaysFromNow(25), location: '', notes: '' });
                await add({ type: 'registration', date: isoDaysAgo(8), odometer: 23820, cost: '300', expiryDate: isoDaysFromNow(7), location: '', notes: '' });

                const mkTireReplace = async (pos, daysAgo, odo, brand, treadMm, pressureKpa, remainingDist, remainingMonths) => {
                    const remDist = Number.isFinite(parseFloat(remainingDist)) ? parseFloat(remainingDist) : null;
                    const remMonths = Number.isFinite(parseFloat(remainingMonths)) ? parseFloat(remainingMonths) : null;
                    await add({
                        type: 'tire_replace',
                        date: isoDaysAgo(daysAgo),
                        odometer: odo,
                        cost: pos === 'front_left' ? '900' : '',
                        location: '',
                        notes: store.data.settings.language === 'zh' ? '示範：更換輪胎' : 'Demo: tire replace',
                        tirePosition: pos,
                        tireBrand: brand,
                        tireTread: String(treadMm),
                        tirePressureKpa: String(pressureKpa),
                        tireRemainingDist: remDist === null ? null : Math.max(0, remDist),
                        tireRemainingDays: remMonths === null ? null : Math.max(0, Math.round(remMonths * 30)),
                        tireAlignment: pos === 'front_left',
                        tireBalancing: true,
                        tireId: utils.newId()
                    });
                };

                await mkTireReplace('front_left', 180, 21000, 'Michelin', 7.0, 240, 18000, 24);
                await mkTireReplace('front_right', 140, 20800, 'Michelin', 6.5, 240, 12000, 18);
                await mkTireReplace('rear_left', 120, 20500, 'Michelin', 6.8, 240, 14000, 20);
                await mkTireReplace('rear_right', 120, 20500, 'Michelin', 6.8, 240, 14000, 20);

                await add({
                    type: 'tire_rotation',
                    date: isoDaysAgo(55),
                    odometer: 21600,
                    cost: '',
                    location: '',
                    notes: store.data.settings.language === 'zh' ? '示範：輪胎換位（前後互換）' : 'Demo: tire rotation (front ↔ rear)',
                    tireSwaps: [{ a: 'front_left', b: 'rear_left' }, { a: 'front_right', b: 'rear_right' }],
                    tireSwapA: 'front_left',
                    tireSwapB: 'rear_left'
                });

                await store.updateVehicle(demoVehicle);
                this.render();
            },

async selectVehicle(id) {
                store.data.settings.activeVehicleId = id;
                await store.saveData();
                this.closeModal();
                this.render();
            },

openVehicleSelector() {
                 this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading">${utils.t('select_vehicle')}</h2>
                    <div class="space-y-2">
                        ${store.data.vehicles.map(v => `
                            <button data-action="ui" data-ui-method="selectVehicle" data-ui-args="${encodeURIComponent(JSON.stringify([v.id]))}" class="w-full p-4 rounded-xl flex items-center gap-3 ${store.data.settings.activeVehicleId === v.id ? 'bg-teal-50 border-teal-500 border' : 'bg-slate-50 border theme-border'}">
                                <div class="w-10 h-10 rounded-full flex items-center justify-center text-white ${utils.getCarColorClass(v.color)}">
                                    <span class="material-icons">${utils.getCarIcon(v.type)}</span>
                                </div>
                                <div class="text-left">
                                    <div class="font-bold theme-text-heading">${utils.escapeHtml(v.make)} ${utils.escapeHtml(v.model)}</div>
                                    <div class="text-xs theme-text-sub">${utils.escapeHtml(v.year)} • ${utils.t('type_' + (v.type || 'sedan'))}</div>
                                </div>
                                ${store.data.settings.activeVehicleId === v.id ? '<span class="material-icons ml-auto text-teal-600">check_circle</span>' : ''}
                            </button>
                        `).join('')}
                    </div>
                 `);
            }
});
