// FuelMate UI module: actions/maintenance
Object.assign(ui, {
openQuickTireSetup(pos = null, applyAll = false) {
                const distUnit = utils.getDistUnit();
                const defaultPos = pos || 'front_left';
                this.openModal(`
                    <h2 class="text-xl font-bold mb-2 theme-text-heading">${utils.t('quick_tire_setup')}</h2>
                    <div class="text-xs theme-text-sub mb-4">${utils.t('quick_tire_setup_desc')}</div>
                    <div class="space-y-4">
                        <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border theme-border">
                            <label class="flex items-center gap-2 text-xs theme-text-heading bg-white/70 dark:bg-slate-800/60 p-2 rounded-xl border theme-border">
                                <input id="qs_apply_all" type="checkbox" class="w-4 h-4" ${applyAll ? 'checked' : ''} onchange="ui.toggleQuickTireSetupAll(this.checked)">
                                <span>${utils.t('apply_to_all_tires')}</span>
                            </label>
                            <div id="qs_apply_mode" class="flex gap-2 mt-2 ${applyAll ? '' : 'hidden'}">
                                <button onclick="ui.setQuickTireSetupMode('unset')" id="qs_apply_unset_btn" class="flex-1 py-2 rounded-xl text-[10px] font-bold border ${applyAll ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20' : 'bg-slate-50 dark:bg-slate-800 theme-border theme-text-sub'}">${utils.t('apply_unset_only')}</button>
                                <button onclick="ui.setQuickTireSetupMode('all')" id="qs_apply_all_btn" class="flex-1 py-2 rounded-xl text-[10px] font-bold border bg-slate-50 dark:bg-slate-800 theme-border theme-text-sub">${utils.t('apply_overwrite_all')}</button>
                                <input type="hidden" id="qs_apply_mode_value" value="unset">
                            </div>
                        </div>
                        <div id="qs_pos_wrap" class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border theme-border ${applyAll ? 'hidden' : ''}">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">1/3</div>
                            <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_pos')}</label>
                            <select id="qs_tire_pos" class="w-full p-3 rounded-xl text-sm">
                                ${['front_left','front_right','rear_left','rear_right'].map(p => `<option value="${p}" ${defaultPos===p?'selected':''}>${utils.t('tire_'+p)}</option>`).join('')}
                            </select>
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border theme-border">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">2/3</div>
                            <label class="text-xs theme-text-sub block mb-1">${utils.t('remaining_distance')}</label>
                            <input id="qs_remaining_dist" type="number" min="0" step="1" class="w-full p-3 rounded-xl text-sm" placeholder="${distUnit}">
                            <div class="text-[10px] theme-text-sub mt-1">${distUnit}</div>
                            <label class="text-xs theme-text-sub block mb-1 mt-3">${utils.t('remaining_months')}</label>
                            <input id="qs_remaining_months" type="number" min="0" step="1" class="w-full p-3 rounded-xl text-sm" placeholder="e.g. 12">
                        </div>
                        <div class="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border theme-border">
                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">3/3</div>
                            <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_tread')}</label>
                            <input id="qs_tire_tread" type="number" min="0" step="0.1" class="w-full p-3 rounded-xl text-sm" placeholder="e.g. 6.5">
                        </div>
                        <div class="flex gap-3 mt-2">
                            <button onclick="ui.closeModal()" class="flex-1 bg-slate-100 dark:bg-slate-800 theme-text-heading py-3 rounded-xl font-bold border theme-border">${utils.t('cancel')}</button>
                            <button onclick="ui.submitQuickTireSetup()" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
                        </div>
                    </div>
                `);
            },

async submitQuickTireSetup() {
                const applyAll = !!document.getElementById('qs_apply_all')?.checked;
                const applyMode = document.getElementById('qs_apply_mode_value')?.value || 'unset';
                const pos = document.getElementById('qs_tire_pos').value;
                const remainingDistanceResult = this.validateNumberField('qs_remaining_dist', { required: false });
                const remainingMonthsResult = this.validateNumberField('qs_remaining_months', { required: false });
                const treadResult = this.validateNumberField('qs_tire_tread', { required: false });
                if (!remainingDistanceResult.ok || !remainingMonthsResult.ok || !treadResult.ok) return;
                const remainingDist = remainingDistanceResult.number;
                const remainingMonths = remainingMonthsResult.number;
                const tread = treadResult.number;

                if (remainingDist === null && remainingMonths === null) {
                    return alert(utils.t('quick_tire_setup_error'));
                }

                const vehicle = store.getActiveVehicle();
                if (!vehicle) return;
                const currentOdo = parseFloat(vehicle.currentOdometer) || 0;
                const now = new Date();

                const positions = (() => {
                    if (!applyAll) return [pos];
                    if (applyMode === 'all') return utils.getTirePositions();
                    const statuses = utils.getTireReplacementStatus(vehicle);
                    const unset = statuses.filter(s => s.isNotSet).map(s => s.pos);
                    return unset.length ? unset : utils.getTirePositions();
                })();

                for (const p of positions) {
                    const log = {
                        id: utils.newId(),
                        vehicleId: vehicle.id,
                        type: 'tire_replace',
                        date: now.toISOString().slice(0, 10),
                        odometer: currentOdo,
                        cost: '',
                        location: '',
                        notes: '',
                        tirePosition: p,
                        tireBrand: '',
                        tireTread: tread === null ? '' : tread,
                        tireRemainingDist: remainingDist,
                        tireRemainingDays: remainingMonths === null ? null : Math.round(remainingMonths * 30)
                    };
                    await store.addLog(log);
                }
                this.closeModal();
                this.render();
            },

toggleQuickTireSetupAll(isAll) {
                const wrap = document.getElementById('qs_pos_wrap');
                if (wrap) wrap.classList.toggle('hidden', isAll);
                const mode = document.getElementById('qs_apply_mode');
                if (mode) mode.classList.toggle('hidden', !isAll);
                if (isAll) this.setQuickTireSetupMode('unset');
            },

setQuickTireSetupMode(mode) {
                const unsetBtn = document.getElementById('qs_apply_unset_btn');
                const allBtn = document.getElementById('qs_apply_all_btn');
                const value = document.getElementById('qs_apply_mode_value');
                if (value) value.value = mode;
                if (unsetBtn && allBtn) {
                    const base = 'flex-1 py-2 rounded-xl text-[10px] font-bold border ';
                    const active = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20';
                    const inactive = 'bg-slate-50 dark:bg-slate-800 theme-border theme-text-sub';
                    unsetBtn.className = base + (mode === 'unset' ? active : inactive);
                    allBtn.className = base + (mode === 'all' ? active : inactive);
                }
            },

openAddService(id = null, defaultType = 'service') {
                const existing = id ? store.data.logs.find(l => String(l.id) === String(id)) : null;
                const log = existing ? { ...existing } : { date: new Date().toISOString().slice(0, 10), odometer: store.getActiveVehicle()?.currentOdometer || '', type: defaultType, cost: '', location: '', notes: '', expiryDate: '', tirePosition: 'front_left', tireBrand: '', tireTread: '', tirePressureKpa: '', tireAlignment: false, tireBalancing: false, tireSwaps: [{ a: 'front_left', b: 'rear_left' }, { a: 'front_right', b: 'rear_right' }] };
                if (log.type === 'tire_replace') {
                    const unit = utils.getPressureUnit();
                    const kpa = (log.tirePressureKpa !== undefined && log.tirePressureKpa !== null && log.tirePressureKpa !== '')
                        ? utils.pressureToKpa(log.tirePressureKpa, 'kPa')
                        : (log.tirePressure ? utils.pressureToKpa(log.tirePressure, 'psi') : null);
                    const shown = kpa === null ? null : utils.pressureFromKpa(kpa, unit);
                    const shownNumber = Number.isFinite(shown) ? shown : null;
                    log._tirePressureDisplay = shownNumber === null ? '' : (unit === 'psi' ? shownNumber.toFixed(0) : shownNumber.toFixed(1));
                }

                if (log.type === 'tire_rotation') {
                    const swaps = Array.isArray(log.tireSwaps) && log.tireSwaps.length
                        ? log.tireSwaps
                        : (log.tireSwapA && log.tireSwapB ? [{ a: log.tireSwapA, b: log.tireSwapB }] : [{ a: 'front_left', b: 'rear_left' }, { a: 'front_right', b: 'rear_right' }]);
                    log.tireSwaps = swaps;
                    log.tireSwapA1 = swaps[0]?.a || 'front_left';
                    log.tireSwapB1 = swaps[0]?.b || 'rear_left';
                    log.tireSwapA2 = swaps[1]?.a || 'front_right';
                    log.tireSwapB2 = swaps[1]?.b || 'rear_right';
                    log.tireRotPattern = swaps.length >= 2 ? 'front_rear' : 'single';
                }
                const quickTags = ['oil_change','tire_change','alignment','air_filter','cabin_filter','spark_plugs','brake_fluid','transmission_fluid','coolant','wiper_blades','battery','brake','inspection'];

                this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading">${utils.t('add_service')}</h2>
                    <div class="space-y-4">
                        <select id="l_type" class="w-full p-3 rounded-xl font-bold bg-slate-100" onchange="ui.handleTypeChange(this.value)">
                            <option value="service" ${log.type==='service'?'selected':''}>${utils.t('service')}</option>
                            <option value="repair" ${log.type==='repair'?'selected':''}>${utils.t('repair')}</option>
                            <option value="tire_replace" ${log.type==='tire_replace'?'selected':''}>${utils.t('tire_replace')}</option>
                            <option value="tire_rotation" ${log.type==='tire_rotation'?'selected':''}>${utils.t('tire_rotation')}</option>
                            <option value="periodic_maintenance" ${log.type==='periodic_maintenance'?'selected':''}>${utils.t('periodic_maintenance')}</option>
                            <option value="car_wash" ${log.type==='car_wash'?'selected':''}>${utils.t('car_wash')}</option>
                            <option value="car_accessories" ${log.type==='car_accessories'?'selected':''}>${utils.t('car_accessories')}</option>
                            <option value="fine" ${log.type==='fine'?'selected':''}>${utils.t('traffic_fine')}</option>
                            <hr>
                            <option value="license" ${log.type==='license'?'selected':''}>${utils.t('license')}</option>
                            <option value="insurance" ${log.type==='insurance'?'selected':''}>${utils.t('insurance')}</option>
                            <option value="registration" ${log.type==='registration'?'selected':''}>${utils.t('registration')}</option>
                        </select>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 service-odo-grid">
                            <div><label class="text-xs theme-text-sub block mb-1">${utils.t('date')}</label><input id="l_date" type="date" value="${utils.escapeAttr(log.date)}" class="w-full p-3 rounded-xl"></div>
                            <div><label class="text-xs theme-text-sub block mb-1">${utils.t('odometer')}</label><input id="l_odo" type="number" min="0" value="${utils.escapeAttr(log.odometer)}" class="w-full p-3 rounded-xl"></div>
                        </div>
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('cost')}</label><input id="l_cost" type="number" min="0" step="0.01" value="${utils.escapeAttr(log.cost)}" class="w-full p-3 rounded-xl"></div>

                        <!-- Dynamic Fields -->
                        <div id="expiry_field" class="${['license','insurance','registration'].includes(log.type) ? '' : 'hidden'}">
                             <label class="text-xs theme-text-sub block mb-1">New Expiry Date</label>
                             <input id="l_expiry" type="date" value="${log.expiryDate || ''}" class="w-full p-3 rounded-xl border-purple-300">
                        </div>

                        <div id="loc_note_fields" class="${['license','insurance','registration'].includes(log.type) ? 'hidden' : ''}">
                            <div id="tire_replace_fields" class="${log.type === 'tire_replace' ? '' : 'hidden'} bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border theme-border mb-3">
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">${utils.t('tire_positions')}</div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_pos')}</label>
                                        <select id="l_tire_pos" class="w-full p-3 rounded-xl text-sm">
                                            ${['front_left','front_right','rear_left','rear_right'].map(p => `<option value="${p}" ${log.tirePosition===p?'selected':''}>${utils.t('tire_'+p)}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_brand')}</label>
                                        <input id="l_tire_brand" type="text" value="${log.tireBrand || ''}" class="w-full p-3 rounded-xl text-sm" placeholder="e.g. Michelin Primacy 4">
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3 mt-3">
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_tread')}</label>
                                        <input id="l_tire_tread" type="number" step="0.1" value="${log.tireTread || ''}" class="w-full p-3 rounded-xl text-sm" placeholder="e.g. 6.5">
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_pressure')}</label>
                                        <input id="l_tire_pressure" type="number" step="0.5" value="${log._tirePressureDisplay || ''}" class="w-full p-3 rounded-xl text-sm" placeholder="${utils.getPressureUnit()==='psi'?'e.g. 32':(utils.getPressureUnit()==='bar'?'e.g. 2.3':'e.g. 220')}">
                                        <div class="text-[10px] theme-text-sub mt-1">${utils.getPressureUnit()}</div>
                                    </div>
                                </div>
                                <div class="flex gap-3 mt-3">
                                    <label class="flex items-center gap-2 text-xs theme-text-heading bg-white/70 dark:bg-slate-800/60 p-2 rounded-xl border theme-border flex-1">
                                        <input id="l_tire_alignment" type="checkbox" class="w-4 h-4" ${log.tireAlignment ? 'checked' : ''}>
                                        <span>${utils.t('tire_alignment')}</span>
                                    </label>
                                    <label class="flex items-center gap-2 text-xs theme-text-heading bg-white/70 dark:bg-slate-800/60 p-2 rounded-xl border theme-border flex-1">
                                        <input id="l_tire_balancing" type="checkbox" class="w-4 h-4" ${log.tireBalancing ? 'checked' : ''}>
                                        <span>${utils.t('tire_balancing')}</span>
                                    </label>
                                </div>
                                <div class="grid grid-cols-2 gap-3 mt-3">
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('remaining_distance')}</label>
                                        <input id="l_tire_remaining_dist" type="number" min="0" step="1" value="${Number.isFinite(parseFloat(log.tireRemainingDist)) ? log.tireRemainingDist : ''}" class="w-full p-3 rounded-xl text-sm" placeholder="${utils.getDistUnit()}">
                                        <div class="text-[10px] theme-text-sub mt-1">${utils.getDistUnit()}</div>
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('remaining_months')}</label>
                                        <input id="l_tire_remaining_months" type="number" min="0" step="1" value="${Number.isFinite(parseFloat(log.tireRemainingDays)) ? Math.round(parseFloat(log.tireRemainingDays) / 30) : ''}" class="w-full p-3 rounded-xl text-sm" placeholder="e.g. 24">
                                    </div>
                                </div>
                            </div>
                            <div id="tire_rotation_fields" class="${log.type === 'tire_rotation' ? '' : 'hidden'} bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border theme-border mb-3">
                                <div class="flex items-center justify-between mb-2">
                                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">${utils.t('tire_swap')}</div>
                                    <select id="l_tire_rot_pattern" onchange="ui.applyTireRotationPattern(this.value)" class="text-xs p-1 rounded bg-white/70 dark:bg-slate-700 border theme-border">
                                        <option value="front_rear" ${log.tireRotPattern==='front_rear'?'selected':''}>Front ↔ Rear</option>
                                        <option value="cross" ${log.tireRotPattern==='cross'?'selected':''}>Cross</option>
                                        <option value="front_swap" ${log.tireRotPattern==='front_swap'?'selected':''}>Front L ↔ Front R</option>
                                        <option value="rear_swap" ${log.tireRotPattern==='rear_swap'?'selected':''}>Rear L ↔ Rear R</option>
                                        <option value="single" ${log.tireRotPattern==='single'?'selected':''}>Single Swap</option>
                                    </select>
                                </div>
                                <div class="text-[10px] text-slate-400 mb-2">${utils.t('tire_recommended')}: ${utils.t('drive_' + (store.getActiveVehicle()?.driveType || 'fwd'))}</div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_swap_a')}</label>
                                        <select id="l_tire_swap_a1" class="w-full p-3 rounded-xl text-sm">
                                            ${['front_left','front_right','rear_left','rear_right'].map(p => `<option value="${p}" ${(log.tireSwapA1||'front_left')===p?'selected':''}>${utils.t('tire_'+p)}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_swap_b')}</label>
                                        <select id="l_tire_swap_b1" class="w-full p-3 rounded-xl text-sm">
                                            ${['front_left','front_right','rear_left','rear_right'].map(p => `<option value="${p}" ${(log.tireSwapB1||'rear_left')===p?'selected':''}>${utils.t('tire_'+p)}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>

                                <div id="tire_rotation_pair2" class="${log.tireRotPattern==='single' ? 'hidden' : ''} grid grid-cols-2 gap-3 mt-2">
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_swap_a')}</label>
                                        <select id="l_tire_swap_a2" class="w-full p-3 rounded-xl text-sm">
                                            ${['front_left','front_right','rear_left','rear_right'].map(p => `<option value="${p}" ${(log.tireSwapA2||'front_right')===p?'selected':''}>${utils.t('tire_'+p)}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_swap_b')}</label>
                                        <select id="l_tire_swap_b2" class="w-full p-3 rounded-xl text-sm">
                                            ${['front_left','front_right','rear_left','rear_right'].map(p => `<option value="${p}" ${(log.tireSwapB2||'rear_right')===p?'selected':''}>${utils.t('tire_'+p)}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>

                                <div class="grid grid-cols-3 gap-2 mt-3">
                                    <button onclick="ui.applyRecommendedTireRotation('fwd')" class="py-2 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">FWD</button>
                                    <button onclick="ui.applyRecommendedTireRotation('rwd')" class="py-2 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">RWD</button>
                                    <button onclick="ui.applyRecommendedTireRotation('awd')" class="py-2 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">AWD</button>
                                </div>
                            </div>
                             <div class="relative mb-3">
                                 <label class="text-xs theme-text-sub block mb-1">${utils.t('location')}</label>
                                 <input id="l_loc" type="text" value="${utils.escapeAttr(log.location || '')}" class="w-full p-3 rounded-xl pr-10">
                                 <button onclick="utils.detectLocation(l => document.getElementById('l_loc').value=l)" class="absolute right-3 top-8 text-teal-500"><span class="material-icons">my_location</span></button>
                            </div>

                            <div id="quick_tags" class="flex flex-wrap gap-2 mb-2">
                                ${quickTags.map(t => `<button onclick="document.getElementById('l_notes').value += (document.getElementById('l_notes').value ? ', ' : '') + '${utils.t(t)}'" class="text-[10px] bg-slate-100 px-2 py-1 rounded-full border hover:bg-teal-50 hover:text-teal-600 transition">+ ${utils.t(t)}</button>`).join('')}
                            </div>
                            <div id="fine_tags" class="hidden flex flex-wrap gap-2 mb-2">
                                ${['parking_ticket','no_parking','speeding','red_light','illegal_turn','bus_lane','seatbelt','phone_use','toll'].map(t => `<button onclick="document.getElementById('l_notes').value = '${utils.t(t)}'" class="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-full border border-red-100 hover:bg-red-100 transition">${utils.t(t)}</button>`).join('')}
                            </div>

                            <div>
                                <label class="text-xs theme-text-sub block mb-1">${utils.t('notes')}</label>
                                <textarea id="l_notes" class="w-full p-3 rounded-xl h-20">${utils.escapeHtml(log.notes || '')}</textarea>
                            </div>
                        </div>

                        <div class="flex gap-3 mt-4">
                            ${id ? `<button onclick="ui.deleteLog('${id}')" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold">${utils.t('delete')}</button>` : ''}
                            <button onclick="ui.submitService('${id || ''}')" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
                        </div>
                    </div>
                `);
                // Init state
                this.handleTypeChange(log.type);
            },

handleTypeChange(type) {
                const isDoc = ['license','insurance','registration'].includes(type);
                const isFine = type === 'fine';
                const isTireReplace = type === 'tire_replace';
                const isTireRotation = type === 'tire_rotation';
                document.getElementById('expiry_field').classList.toggle('hidden', !isDoc);
                document.getElementById('loc_note_fields').classList.toggle('hidden', isDoc);
                if (!isDoc) {
                    document.getElementById('quick_tags').classList.toggle('hidden', isFine);
                    document.getElementById('fine_tags').classList.toggle('hidden', !isFine);
                    const tireReplaceFields = document.getElementById('tire_replace_fields');
                    if (tireReplaceFields) tireReplaceFields.classList.toggle('hidden', !isTireReplace);
                    const tireRotationFields = document.getElementById('tire_rotation_fields');
                    if (tireRotationFields) tireRotationFields.classList.toggle('hidden', !isTireRotation);
                }
            },

applyTireRotationPattern(pattern) {
                const pair2 = document.getElementById('tire_rotation_pair2');
                const set = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) el.value = value;
                };
                if (pattern === 'front_rear') {
                    if (pair2) pair2.classList.remove('hidden');
                    set('l_tire_swap_a1', 'front_left'); set('l_tire_swap_b1', 'rear_left');
                    set('l_tire_swap_a2', 'front_right'); set('l_tire_swap_b2', 'rear_right');
                } else if (pattern === 'cross') {
                    if (pair2) pair2.classList.remove('hidden');
                    set('l_tire_swap_a1', 'front_left'); set('l_tire_swap_b1', 'rear_right');
                    set('l_tire_swap_a2', 'front_right'); set('l_tire_swap_b2', 'rear_left');
                } else if (pattern === 'front_swap') {
                    if (pair2) pair2.classList.add('hidden');
                    set('l_tire_swap_a1', 'front_left'); set('l_tire_swap_b1', 'front_right');
                } else if (pattern === 'rear_swap') {
                    if (pair2) pair2.classList.add('hidden');
                    set('l_tire_swap_a1', 'rear_left'); set('l_tire_swap_b1', 'rear_right');
                } else { // 'single'
                    if (pair2) pair2.classList.add('hidden');
                }
            },

applyRecommendedTireRotation(driveType) {
                const drive = (driveType || (store.getActiveVehicle()?.driveType) || 'fwd').toLowerCase();
                // Common default recommendations:
                // - FWD: cross rear -> front, front -> rear same-side
                // - RWD: cross front -> rear, rear -> front same-side
                // - AWD: front <-> rear same-side (safe/simple for mixed tires)
                if (drive === 'rwd') {
                    document.getElementById('l_tire_rot_pattern').value = 'cross';
                    this.applyTireRotationPattern('cross');
                    // swap direction for RWD (front -> rear cross)
                    const pair2 = document.getElementById('tire_rotation_pair2');
                    if (pair2) pair2.classList.remove('hidden');
                    document.getElementById('l_tire_swap_a1').value = 'front_left';
                    document.getElementById('l_tire_swap_b1').value = 'rear_right';
                    document.getElementById('l_tire_swap_a2').value = 'front_right';
                    document.getElementById('l_tire_swap_b2').value = 'rear_left';
                    return;
                }
                if (drive === 'awd') {
                    document.getElementById('l_tire_rot_pattern').value = 'front_rear';
                    this.applyTireRotationPattern('front_rear');
                    return;
                }
                // fwd default
                document.getElementById('l_tire_rot_pattern').value = 'cross';
                this.applyTireRotationPattern('cross');
                // swap direction for FWD (rear -> front cross)
                const pair2 = document.getElementById('tire_rotation_pair2');
                if (pair2) pair2.classList.remove('hidden');
                document.getElementById('l_tire_swap_a1').value = 'rear_left';
                document.getElementById('l_tire_swap_b1').value = 'front_right';
                document.getElementById('l_tire_swap_a2').value = 'rear_right';
                document.getElementById('l_tire_swap_b2').value = 'front_left';
            },

openLogEditorById(id) {
                const log = store.data.logs.find(l => String(l.id) === String(id));
                if (!log) return;
                if (log.type === 'fuel') return this.openAddFuel(log.id);
                if (log.type === 'parking') return this.openAddParking(log.id);
                return this.openAddService(log.id);
            },

async submitService(id) {
                const type = document.getElementById('l_type').value;
                const isDoc = ['license','insurance','registration'].includes(type);
                const isTireReplace = type === 'tire_replace';
                const isTireRotation = type === 'tire_rotation';
                const existing = id ? store.data.logs.find(l => String(l.id) === String(id)) : null;
                const date = this.validateDateField('l_date');
                if (!date) return;
                const odometer = this.validateNumberField('l_odo', { messageKey: 'validation_odometer' });
                if (!odometer.ok) return;
                const cost = this.validateNumberField('l_cost', { required: false, messageKey: 'validation_cost' });
                if (!cost.ok) return;
                const expiryDate = isDoc ? this.validateDateField('l_expiry', 'validation_expiry') : '';
                if (isDoc && !expiryDate) return;

                const tireTread = isTireReplace
                    ? this.validateNumberField('l_tire_tread', { required: false, messageKey: 'validation_nonnegative' })
                    : { ok: true, value: '' };
                const tirePressure = isTireReplace
                    ? this.validateNumberField('l_tire_pressure', { required: false, positive: true, messageKey: 'validation_pressure' })
                    : { ok: true, value: '' };
                const tireRemainingDistance = isTireReplace
                    ? this.validateNumberField('l_tire_remaining_dist', { required: false, messageKey: 'validation_nonnegative' })
                    : { ok: true, number: null };
                const tireRemainingMonths = isTireReplace
                    ? this.validateNumberField('l_tire_remaining_months', { required: false, messageKey: 'validation_nonnegative' })
                    : { ok: true, number: null };
                if (!tireTread.ok || !tirePressure.ok || !tireRemainingDistance.ok || !tireRemainingMonths.ok) return;

                let tireSwaps;
                let tireSwapA;
                let tireSwapB;
                if (isTireRotation) {
                    const get = (elId) => document.getElementById(elId)?.value;
                    const swaps = [];
                    const addSwap = (a, b) => {
                        if (!a || !b || a === b) return;
                        swaps.push({ a, b });
                    };
                    addSwap(get('l_tire_swap_a1'), get('l_tire_swap_b1'));
                    const pair2 = document.getElementById('tire_rotation_pair2');
                    if (pair2 && !pair2.classList.contains('hidden')) {
                        addSwap(get('l_tire_swap_a2'), get('l_tire_swap_b2'));
                    }
                    if (!swaps.length) return alert('Please select tire swap positions.');
                    const used = new Set();
                    for (const s of swaps) {
                        if (used.has(s.a) || used.has(s.b)) return alert('Each tire position can only appear once per rotation.');
                        used.add(s.a); used.add(s.b);
                    }
                    tireSwaps = swaps;
                    tireSwapA = swaps[0].a;
                    tireSwapB = swaps[0].b;
                }

                const log = {
                    id: id || utils.newId(),
                    vehicleId: store.data.settings.activeVehicleId,
                    type,
                    date,
                    odometer: odometer.number,
                    cost: cost.value,
                    location: isDoc ? '' : document.getElementById('l_loc').value.trim(),
                    notes: isDoc ? '' : document.getElementById('l_notes').value.trim(),
                    expiryDate,
                    tirePosition: isTireReplace ? document.getElementById('l_tire_pos')?.value : undefined,
                    tireBrand: isTireReplace ? document.getElementById('l_tire_brand')?.value.trim() : undefined,
                    tireTread: isTireReplace ? tireTread.value : undefined,
                    tirePressureKpa: isTireReplace ? (utils.pressureToKpa(tirePressure.value, utils.getPressureUnit())?.toFixed(1) || '') : undefined,
                    tireAlignment: isTireReplace ? !!document.getElementById('l_tire_alignment')?.checked : undefined,
                    tireBalancing: isTireReplace ? !!document.getElementById('l_tire_balancing')?.checked : undefined,
                    tireId: isTireReplace ? (existing?.tireId || utils.newId()) : undefined,
                    tireRemainingDist: isTireReplace ? tireRemainingDistance.number : undefined,
                    tireRemainingDays: isTireReplace ? (tireRemainingMonths.number === null ? null : Math.round(tireRemainingMonths.number * 30)) : undefined,
                    tireSwaps: isTireRotation ? tireSwaps : undefined,
                    tireSwapA: isTireRotation ? tireSwapA : undefined,
                    tireSwapB: isTireRotation ? tireSwapB : undefined
                };

                if (id) await store.updateLog(log);
                else await store.addLog(log);
                this.closeModal();
                this.render();
            }
});
