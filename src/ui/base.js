// FuelMate UI module: base
Object.assign(ui, {
init() {
                store.init().then(() => {
                    this.render();
                    if (!store.data.vehicles.length) this.openAddVehicle();
                }).catch(err => console.error("DB Init Failed", err));
            },

getPageLimit(pageKey) {
                const v = store.pageLimits?.[pageKey];
                return Number.isFinite(v) && v > 0 ? v : 100;
            },

_searchDebounceKey(pageKey, filterKey) {
                return `search:${pageKey}:${filterKey}`;
            },

onSearchInput(pageKey, filterKey, value) {
                const key = this._searchDebounceKey(pageKey, filterKey);
                utils.debounceByKey(key, () => {
                    store.pageFilters[filterKey] = value;
                    this.resetPageLimit(pageKey);
                    this.render();
                }, 200);
            },

clearSearch(pageKey, filterKey) {
                const key = this._searchDebounceKey(pageKey, filterKey);
                utils.cancelDebounce(key);
                store.pageFilters[filterKey] = '';
                this.resetPageLimit(pageKey);
                this.render();
            },

resetPageLimit(pageKey) {
                if (!store.pageLimits) store.pageLimits = {};
                if (pageKey && Object.prototype.hasOwnProperty.call(store.pageLimits, pageKey)) {
                    store.pageLimits[pageKey] = 100;
                }
            },

loadMore(pageKey, step = 100) {
                if (!store.pageLimits) store.pageLimits = {};
                const curr = this.getPageLimit(pageKey);
                store.pageLimits[pageKey] = curr + step;
                this.render();
            },

renderLoadMore(pageKey, shown, total) {
                const safeShown = Math.max(0, Math.min(total || 0, shown || 0));
                return `
                    <div class="pt-2 pb-6 flex flex-col items-center gap-2">
                        <div class="text-[10px] theme-text-sub">${utils.t('showing')} ${safeShown.toLocaleString()} / ${(total || 0).toLocaleString()}</div>
                        <button data-action="ui" data-ui-method="loadMore" data-ui-args="${encodeURIComponent(JSON.stringify([pageKey]))}" class="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading border theme-border active:scale-95 transition-transform">
                            ${utils.t('load_more')}
                        </button>
                    </div>
                `;
            },

render() {
                const app = document.getElementById('app');
                const page = router.currentPage;
                const vehicle = store.getActiveVehicle();
                const scrollY = window.scrollY;

                if (!vehicle && store.data.vehicles.length > 0) {
                     store.data.settings.activeVehicleId = store.data.vehicles[0].id;
                     store.saveData().then(() => this.render());
                     return;
                }

                let content = '';
                if (!vehicle) {
                    content = this.renderNoVehicleState();
                } else {
                    if (page === 'dashboard') content = this.renderDashboard(vehicle);
                    else if (page === 'fuel') content = this.renderFuel(vehicle);
                    else if (page === 'maintenance') content = this.renderMaintenance(vehicle);
                    else if (page === 'parking') content = this.renderParking(vehicle);
                    else if (page === 'analytics') content = this.renderAnalytics(vehicle);
                    else if (page === 'reminders') content = this.renderReminders(vehicle);
                    else if (page === 'settings') content = this.renderSettings(vehicle);
                }

                app.innerHTML = `
                    ${content}
                    ${this.renderBottomNav(page)}
                `;
                window.scrollTo(0, scrollY);
            },

renderNoVehicleState() {
                return `
                    <div class="flex flex-col items-center justify-center min-h-[80vh] p-8 text-center">
                        <div class="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6">
                            <span class="material-icons text-4xl text-teal-600">no_crash</span>
                        </div>
                        <h2 class="text-2xl font-bold mb-2 theme-text-heading">${utils.t('welcome')}</h2>
                        <p class="theme-text-sub mb-8">Add your first vehicle to start tracking fuel, costs, and maintenance.</p>
                        <button data-testid="add-vehicle" data-action="ui" data-ui-method="openAddVehicle" class="grad-teal text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-500/30 active:scale-95 transition-transform flex items-center gap-2">
                            <span class="material-icons">add</span> ${utils.t('add_vehicle')}
                        </button>
                        <button data-testid="add-demo-vehicle" data-action="ui" data-ui-method="addDemoCar" class="mt-3 bg-white dark:bg-slate-800 theme-text-heading px-8 py-3 rounded-xl font-bold shadow active:scale-95 transition-transform flex items-center gap-2 border theme-border">
                            <span class="material-icons text-teal-500">auto_awesome</span> ${utils.t('add_demo_car')}
                        </button>
                    </div>
                `;
            },

renderSearchPanel(opts) {
                const {
                    searchValue = '',
                    pageKey = '',
                    searchKey = '',
                    placeholder = 'Search...',
                    fromValue = '',
                    toValue = '',
                    fromKey = '',
                    toKey = '',
                    chips = []
                } = opts || {};

                const hasRange = pageKey && (fromKey || toKey);
                const hasSearch = pageKey && searchKey;
                return `
                    <div class="space-y-3 mb-4">
                        ${hasSearch ? `
                            <div class="relative">
                                <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
                                <input type="text" placeholder="${placeholder}" value="${searchValue || ''}" data-input-action="ui" data-ui-method="onSearchInput" data-ui-args="${encodeURIComponent(JSON.stringify([pageKey, searchKey]))}" data-ui-pass-value="true" class="w-full pl-10 pr-10 py-2 rounded-xl theme-bg-card theme-text-heading shadow-sm border-none focus:ring-2 focus:ring-teal-500 text-sm">
                                ${searchValue ? `<button data-action="ui" data-ui-method="clearSearch" data-ui-args="${encodeURIComponent(JSON.stringify([pageKey, searchKey]))}" class="absolute right-2 top-2 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><span class="material-icons text-slate-500 text-base">close</span></button>` : ''}
                            </div>
                        ` : ''}

                        ${hasRange ? `
                            <div class="grid grid-cols-2 gap-3">
                                <div class="relative">
                                    <input type="date" value="${fromValue || ''}" data-change-action="ui" data-ui-method="updatePageFilter" data-ui-args="${encodeURIComponent(JSON.stringify([pageKey, fromKey]))}" data-ui-pass-value="true" class="w-full p-2.5 rounded-xl theme-bg-card theme-text-heading shadow-sm border-none focus:ring-2 focus:ring-teal-500 text-sm">
                                </div>
                                <div class="relative">
                                    <input type="date" value="${toValue || ''}" data-change-action="ui" data-ui-method="updatePageFilter" data-ui-args="${encodeURIComponent(JSON.stringify([pageKey, toKey]))}" data-ui-pass-value="true" class="w-full p-2.5 rounded-xl theme-bg-card theme-text-heading shadow-sm border-none focus:ring-2 focus:ring-teal-500 text-sm">
                                </div>
                            </div>
                            ${(fromValue || toValue) ? `<button data-action="ui" data-ui-method="clearPageRange" data-ui-args="${encodeURIComponent(JSON.stringify([pageKey, fromKey, toKey]))}" class="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">${utils.t('cancel')}</button>` : ''}
                        ` : ''}

                        ${chips && chips.length ? `
                            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                ${chips.map(c => `
                                    <button data-action="ui" data-ui-method="${c.method}" data-ui-args="${encodeURIComponent(JSON.stringify(c.args || []))}" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${c.active ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20' : 'bg-slate-50 dark:bg-slate-800 theme-border theme-text-sub'}">${c.label}</button>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            },

renderFilterHeader(page, filter, isColorBg = false) {
                const isYear = filter.mode === 'year';
                const isMonth = filter.mode === 'month';
                const availableYears = utils.getAvailableYears();

                const inputClass = isColorBg
                    ? 'bg-white/20 backdrop-blur-md text-white placeholder-white/70'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border theme-border';

                const containerClass = isColorBg
                    ? 'bg-black/10 backdrop-blur-md'
                    : 'bg-slate-100 dark:bg-slate-800 border theme-border';

                const activeBtnClass = isColorBg
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'bg-white dark:bg-slate-600 text-teal-600 shadow-sm border theme-border';

                const inactiveBtnClass = isColorBg
                    ? 'text-white/80 hover:bg-white/10'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700';

                return `
                    <div class="flex items-center justify-end gap-2 mb-4 w-full">
                        <div class="flex-1 flex items-center gap-2">
                             ${isMonth ? `<input type="month" value="${filter.value}" data-change-action="ui" data-ui-method="setFilter" data-ui-args="${encodeURIComponent(JSON.stringify([page, 'month']))}" data-ui-pass-value="true" class="text-sm p-1 rounded font-medium outline-none ${inputClass}">` : ''}
                             ${isYear ? `
                                <select data-change-action="ui" data-ui-method="setFilter" data-ui-args="${encodeURIComponent(JSON.stringify([page, 'year']))}" data-ui-pass-value="true" class="text-sm p-1 rounded font-medium outline-none appearance-none pl-2 pr-6 relative ${inputClass}">
                                    ${availableYears.map(y => `<option value="${y}" ${y == filter.value ? 'selected' : ''} class="text-black">${y}</option>`).join('')}
                                </select>
                            ` : ''}
                        </div>

                        <div class="flex rounded-lg p-1 shrink-0 ${containerClass}">
                            <button data-action="ui" data-ui-method="setFilter" data-ui-args="${encodeURIComponent(JSON.stringify([page, 'month']))}" class="px-3 py-1 rounded-md text-xs font-medium transition-all ${filter.mode === 'month' ? activeBtnClass : inactiveBtnClass}">${utils.t('range_month')}</button>
                            <button data-action="ui" data-ui-method="setFilter" data-ui-args="${encodeURIComponent(JSON.stringify([page, 'year']))}" class="px-3 py-1 rounded-md text-xs font-medium transition-all ${filter.mode === 'year' ? activeBtnClass : inactiveBtnClass}">${utils.t('range_year')}</button>
                            <button data-action="ui" data-ui-method="setFilter" data-ui-args="${encodeURIComponent(JSON.stringify([page, 'all']))}" class="px-3 py-1 rounded-md text-xs font-medium transition-all ${filter.mode === 'all' ? activeBtnClass : inactiveBtnClass}">${utils.t('range_all')}</button>
                        </div>
                    </div>
                `;
            },

setFilter(page, mode, value) {
                if (mode === 'month' && !value) value = new Date().toISOString().slice(0, 7);
                if (mode === 'year' && !value) value = new Date().getFullYear().toString();
                store.pageFilters[page] = { mode, value };
                this.resetPageLimit(page);
                this.render();
            },

updatePageFilter(pageKey, filterKey, value) {
                store.pageFilters[filterKey] = value;
                this.resetPageLimit(pageKey);
                this.render();
            },

clearPageRange(pageKey, fromKey, toKey) {
                store.pageFilters[fromKey] = '';
                store.pageFilters[toKey] = '';
                this.resetPageLimit(pageKey);
                this.render();
            },

togglePageFlag(pageKey, objectKey, flagKey) {
                const current = store.pageFilters[objectKey] || {};
                store.pageFilters[objectKey] = { ...current, [flagKey]: !current[flagKey] };
                this.resetPageLimit(pageKey);
                this.render();
            },

renderLogCard(log) {
                const vehicle = store.data.vehicles.find(v => v.id === log.vehicleId);
                const date = utils.formatDate(log.date);
                let icon = 'edit_note';
                let colorClass = 'bg-slate-100 text-slate-600';
                let title = utils.t(log.type);

                if (log.type === 'fuel') {
                    icon = 'local_gas_station';
                    colorClass = 'bg-teal-50 text-teal-600';
                } else if (log.type === 'parking') {
                    icon = 'local_parking';
                    colorClass = 'bg-blue-50 text-blue-600';
                } else if (log.type === 'fine') {
                    icon = 'local_police';
                    colorClass = 'bg-red-50 text-red-600';
                    if (log.notes) title = utils.t(log.notes.split(',')[0]); // Use first tag as title
                } else if (log.type === 'tire_replace') {
                    icon = 'tire_repair';
                    colorClass = 'bg-slate-50 text-slate-700';
                    const posLabel = log.tirePosition ? utils.t('tire_' + log.tirePosition) : '';
                    const brand = log.tireBrand ? ` • ${log.tireBrand}` : '';
                    title = `${utils.t('tire_replace')}${posLabel ? ' • ' + posLabel : ''}${brand}`;
                } else if (log.type === 'tire_rotation') {
                    icon = 'sync_alt';
                    colorClass = 'bg-slate-50 text-slate-700';
                    const swaps = Array.isArray(log.tireSwaps) && log.tireSwaps.length
                        ? log.tireSwaps
                        : (log.tireSwapA && log.tireSwapB ? [{ a: log.tireSwapA, b: log.tireSwapB }] : []);
                    const swapText = swaps
                        .map(s => {
                            const a = s?.a ? utils.t('tire_' + s.a) : '';
                            const b = s?.b ? utils.t('tire_' + s.b) : '';
                            return a && b ? `${a} ↔ ${b}` : '';
                        })
                        .filter(Boolean)
                        .join(', ');
                    title = `${utils.t('tire_rotation')}${swapText ? ` • ${swapText}` : ''}`;
                } else if (['license', 'insurance', 'registration'].includes(log.type)) {
                    icon = 'assignment';
                    colorClass = 'bg-purple-50 text-purple-600';
                } else if (log.type === 'periodic_maintenance') {
                    icon = 'update';
                    colorClass = 'bg-amber-50 text-amber-600';
                } else if (log.type === 'car_wash') {
                     icon = 'local_car_wash';
                     colorClass = 'bg-cyan-50 text-cyan-600';
                } else if (log.type === 'car_accessories') {
                     icon = 'shopping_bag';
                     colorClass = 'bg-pink-50 text-pink-600';
                }

                // Fuel Stats Logic
                let fuelStatsHtml = '';
                if (log.type === 'fuel') {
                    const allFuel = store.getVehicleLogs('fuel');
                    const idx = allFuel.findIndex(l => l.id === log.id);
                    let effVal = '--', costKm = '--';
                    const v = store.getActiveVehicle();
                    const isImperial = store.data.settings.units === 'imperial';
                    const isEV = v && v.fuelUnit === 'kWh';
                    const distUnit = utils.getDistUnit();
                    const fuelUnit = v && v.fuelUnit ? v.fuelUnit : (isImperial ? 'Gal' : 'L');

                    // Logic to span over Partial logs
                    if (!log.isPartial) {
                         let foundPrevFull = false;
                         let prevLog = null;
                         let accumulatedLiters = 0;
                         let accumulatedCost = 0;

                         // Look backwards from the current log
                         for (let i = idx + 1; i < allFuel.length; i++) {
                             const p = allFuel[i];
                             if (p.isPartial) {
                                 const partialFuel = parseFloat(p.liters);
                                 const partialCost = parseFloat(p.cost);
                                 if (Number.isFinite(partialFuel) && partialFuel > 0) accumulatedLiters += partialFuel;
                                 if (Number.isFinite(partialCost) && partialCost >= 0) accumulatedCost += partialCost;
                             } else {
                                 foundPrevFull = true;
                                 prevLog = p;
                                 break;
                             }
                         }

                         if (foundPrevFull && prevLog) {
                             // Current log liters + accumulated partials
                             // Distance is from Prev Full to Current Full
                             const dist = log.odometer - prevLog.odometer;
                             const currentFuel = parseFloat(log.liters);
                             const currentCost = parseFloat(log.cost);
                             const totalFuel = (Number.isFinite(currentFuel) ? currentFuel : 0) + accumulatedLiters;
                             const totalCost = (Number.isFinite(currentCost) ? currentCost : 0) + accumulatedCost;

                             if (dist > 0) {
                                 if (totalFuel > 0) {
                                     const eff = utils.calcEfficiencyValue(totalFuel, dist, fuelUnit, distUnit);
                                     if (eff !== null) effVal = eff.toFixed(1);
                                 }
                                 costKm = (totalCost / dist).toFixed(2);
                             }
                         }
                    }

                    fuelStatsHtml = `
                        <div class="mt-3 pt-3 border-t theme-border flex justify-between text-xs">
                            <div>
                                <div class="theme-text-sub mb-0.5 uppercase tracking-wider text-[10px]">${utils.getEfficiencyLabel()}</div>
                                <div class="font-bold text-teal-600 text-sm">${effVal}</div>
                            </div>
                             <div class="text-right">
                                <div class="theme-text-sub mb-0.5 uppercase tracking-wider text-[10px]">${utils.getCostPerDistLabel()}</div>
                                <div class="font-bold text-teal-600 text-sm">${utils.formatCurrency(costKm)}</div>
                            </div>
                        </div>
                    `;
                }

                let locHtml = '';
                if (log.location) {
                    locHtml = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(log.location)}" target="_blank" rel="noopener noreferrer" class="text-xs text-sky-500 hover:underline flex items-center gap-1 mt-1"><span class="material-icons text-[10px]">place</span>${utils.escapeHtml(log.location)}</a>`;
                }

                let extraInfoHtml = '';
                if (log.type === 'fuel') {
                    const unit = vehicle ? (vehicle.fuelUnit || 'L') : 'L';
                    const ppu = (parseFloat(log.cost) / parseFloat(log.liters)).toFixed(2);
                    extraInfoHtml = `<div class="text-xs theme-text-sub mt-0.5"><span class="font-semibold theme-text-main">${utils.escapeHtml(log.liters)} ${utils.escapeHtml(unit)}</span> <span class="opacity-75">@ ${utils.escapeHtml(store.data.settings.currency)}${ppu}/${utils.escapeHtml(unit)}</span></div>`;
                } else if (log.type === 'tire_replace') {
                    const parts = [];
                    if (log.tireTread) parts.push(`${utils.t('tire_tread')}: ${utils.escapeHtml(log.tireTread)}`);
                    const p = utils.formatPressureFromLog(log);
                    if (p) parts.push(`${utils.t('tire_pressure')}: ${p}`);
                    if (log.tireAlignment) parts.push(utils.t('tire_alignment'));
                    if (log.tireBalancing) parts.push(utils.t('tire_balancing'));
                    if (parts.length) extraInfoHtml = `<div class="text-xs theme-text-sub mt-0.5">${parts.join(' • ')}</div>`;
                }

                return `
                    <div data-testid="log-card" data-log-type="${utils.escapeAttr(log.type)}" class="theme-bg-card p-4 rounded-2xl card-shadow relative group">
                        <div class="flex justify-between items-start">
                            <div class="flex gap-3">
                                <div class="w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}">
                                    <span class="material-icons">${icon}</span>
                                </div>
                                <div>
                                    <div class="font-bold text-sm theme-text-heading">${date}</div>
                                    <div class="text-xs theme-text-heading font-semibold mt-0.5">${utils.escapeHtml(title)} ${log.isPartial ? `<span class="text-amber-500 text-[10px] border border-amber-500 px-1 rounded ml-1">${utils.t('partial')}</span>` : ''}</div>
                                    <div class="text-xs theme-text-sub mt-0.5">${utils.escapeHtml(log.odometer)} ${utils.getDistUnit()}</div>
                                    ${extraInfoHtml}
                                    ${locHtml}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-bold theme-text-heading">${utils.formatCurrency(log.cost)}</div>
                                <button type="button" data-action="ui" data-ui-method="openLogEditorById" data-ui-args="${encodeURIComponent(JSON.stringify([log.id]))}" class="text-slate-300 hover:text-sky-500 mt-2"><span class="material-icons text-lg">edit</span></button>
                            </div>
                        </div>
                        ${fuelStatsHtml}
                        ${log.notes && log.type !== 'fine' ? `<div class="mt-2 text-xs theme-text-sub bg-slate-50 dark:bg-slate-800 p-2 rounded-lg italic">${utils.escapeHtml(log.notes)}</div>` : ''}
                    </div>
                `;
            },

renderBottomNav(active) {
                const nav = [
                    { id: 'dashboard', icon: 'dashboard', label: utils.t('dashboard') },
                    { id: 'fuel', icon: 'local_gas_station', label: utils.t('fuel') },
                    { id: 'parking', icon: 'local_parking', label: utils.t('parking') },
                    { id: 'maintenance', icon: 'build', label: utils.t('maintenance_plus') },
                    { id: 'analytics', icon: 'pie_chart', label: utils.t('analytics') },
                    { id: 'settings', icon: 'settings', label: utils.t('settings') }
                ];
                const activeIndex = Math.max(0, nav.findIndex(n => n.id === active));
                return `
                    <div class="liquid-nav nav-safe z-40" style="--active-index:${activeIndex}; --nav-count:${nav.length};">
                        <div class="liquid-nav-bg"></div>
                        <div class="liquid-nav-gloss"></div>
                        <div class="liquid-nav-inner flex justify-around items-center pt-2">
                            <div class="liquid-nav-highlight"></div>
                            ${nav.map(n => `
                                <button data-testid="nav-${n.id}" data-action="navigate" data-page="${n.id}" class="liquid-nav-item flex flex-col items-center p-2 w-full transition-colors ${active === n.id ? 'text-teal-700 is-active' : 'text-slate-500'}">
                                    <span class="material-icons ${active === n.id ? 'text-2xl' : 'text-xl'}">${n.icon}</span>
                                    <span class="text-[10px] font-semibold mt-1">${n.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            },

openModal(html) {
                const overlay = document.getElementById('modal-overlay');
                const content = document.getElementById('modal-content');
                content.innerHTML = html;
                overlay.classList.remove('hidden');
                setTimeout(() => {
                    overlay.classList.remove('opacity-0');
                    content.classList.remove('translate-y-full');
                }, 10);
            },

closeModal() {
                const overlay = document.getElementById('modal-overlay');
                const content = document.getElementById('modal-content');
                overlay.classList.add('opacity-0');
                content.classList.add('translate-y-full');
                setTimeout(() => overlay.classList.add('hidden'), 300);
            },

validateDateField(id, messageKey = 'validation_date') {
                const value = document.getElementById(id)?.value || '';
                if (!FuelMateCore.isValidIsoDate(value)) {
                    alert(utils.t(messageKey));
                    return null;
                }
                return value;
            },

validateNumberField(id, { required = true, positive = false, integer = false, messageKey = 'validation_nonnegative' } = {}) {
                const element = document.getElementById(id);
                const raw = element?.value?.trim?.() ?? String(element?.value ?? '').trim();
                if (!required && raw === '') return { ok: true, value: '', number: null };
                if (!FuelMateCore.isNonNegativeNumber(raw, { positive })) {
                    alert(utils.t(messageKey));
                    return { ok: false, value: '', number: null };
                }
                const number = Number(raw);
                if (integer && !Number.isInteger(number)) {
                    alert(utils.t(messageKey));
                    return { ok: false, value: '', number: null };
                }
                return { ok: true, value: raw, number };
            }
});
