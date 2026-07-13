// --- UI RENDERER ---
        const ui = {
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
                        <button onclick="ui.loadMore('${pageKey}')" class="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading border theme-border active:scale-95 transition-transform">
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
                        <button onclick="ui.openAddVehicle()" class="grad-teal text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-500/30 active:scale-95 transition-transform flex items-center gap-2">
                            <span class="material-icons">add</span> ${utils.t('add_vehicle')}
                        </button>
                        <button onclick="ui.addDemoCar()" class="mt-3 bg-white dark:bg-slate-800 theme-text-heading px-8 py-3 rounded-xl font-bold shadow active:scale-95 transition-transform flex items-center gap-2 border theme-border">
                            <span class="material-icons text-teal-500">auto_awesome</span> ${utils.t('add_demo_car')}
                        </button>
                    </div>
                `;
            },

            renderSearchPanel(opts) {
                const {
                    searchValue = '',
                    onSearchInput = '',
                    onClearSearch = '',
                    placeholder = 'Search...',
                    fromValue = '',
                    toValue = '',
                    onFromChange = '',
                    onToChange = '',
                    onClearRange = '',
                    chips = []
                } = opts || {};

                const hasRange = onFromChange || onToChange;
                const hasSearch = onSearchInput;
                return `
                    <div class="space-y-3 mb-4">
                        ${hasSearch ? `
                            <div class="relative">
                                <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
                                <input type="text" placeholder="${placeholder}" value="${searchValue || ''}" oninput="${onSearchInput}" class="w-full pl-10 pr-10 py-2 rounded-xl theme-bg-card theme-text-heading shadow-sm border-none focus:ring-2 focus:ring-teal-500 text-sm">
                                ${searchValue ? `<button onclick="${onClearSearch}" class="absolute right-2 top-2 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><span class="material-icons text-slate-500 text-base">close</span></button>` : ''}
                            </div>
                        ` : ''}

                        ${hasRange ? `
                            <div class="grid grid-cols-2 gap-3">
                                <div class="relative">
                                    <input type="date" value="${fromValue || ''}" onchange="${onFromChange}" class="w-full p-2.5 rounded-xl theme-bg-card theme-text-heading shadow-sm border-none focus:ring-2 focus:ring-teal-500 text-sm">
                                </div>
                                <div class="relative">
                                    <input type="date" value="${toValue || ''}" onchange="${onToChange}" class="w-full p-2.5 rounded-xl theme-bg-card theme-text-heading shadow-sm border-none focus:ring-2 focus:ring-teal-500 text-sm">
                                </div>
                            </div>
                            ${(fromValue || toValue) ? `<button onclick="${onClearRange}" class="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">${utils.t('cancel')}</button>` : ''}
                        ` : ''}

                        ${chips && chips.length ? `
                            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                ${chips.map(c => `
                                    <button onclick="${c.onClick}" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${c.active ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20' : 'bg-slate-50 dark:bg-slate-800 theme-border theme-text-sub'}">${c.label}</button>
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
                             ${isMonth ? `<input type="month" value="${filter.value}" onchange="ui.setFilter('${page}', 'month', this.value)" class="text-sm p-1 rounded font-medium outline-none ${inputClass}">` : ''}
                             ${isYear ? `
                                <select onchange="ui.setFilter('${page}', 'year', this.value)" class="text-sm p-1 rounded font-medium outline-none appearance-none pl-2 pr-6 relative ${inputClass}">
                                    ${availableYears.map(y => `<option value="${y}" ${y == filter.value ? 'selected' : ''} class="text-black">${y}</option>`).join('')}
                                </select>
                            ` : ''}
                        </div>
                        
                        <div class="flex rounded-lg p-1 shrink-0 ${containerClass}">
                            <button onclick="ui.setFilter('${page}', 'month')" class="px-3 py-1 rounded-md text-xs font-medium transition-all ${filter.mode === 'month' ? activeBtnClass : inactiveBtnClass}">${utils.t('range_month')}</button>
                            <button onclick="ui.setFilter('${page}', 'year')" class="px-3 py-1 rounded-md text-xs font-medium transition-all ${filter.mode === 'year' ? activeBtnClass : inactiveBtnClass}">${utils.t('range_year')}</button>
                            <button onclick="ui.setFilter('${page}', 'all')" class="px-3 py-1 rounded-md text-xs font-medium transition-all ${filter.mode === 'all' ? activeBtnClass : inactiveBtnClass}">${utils.t('range_all')}</button>
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

            renderDashboard(vehicle) {
                const logs = store.getVehicleLogs();
                const filter = store.pageFilters.dashboard;
                const filteredLogs = utils.filterLogs(logs, filter);
                const stats = utils.calculateStats(filteredLogs, 'all');
                const tireStatuses = utils.getTireReplacementStatus(vehicle);
                const hasUnsetTires = tireStatuses.some(s => s.isNotSet);
                const reminderData = this.getReminderData(vehicle);
                const activeReminders = reminderData.activeItems.slice().sort((a, b) => {
                    const aTime = a.dueDateIso ? new Date(a.dueDateIso).getTime() : Number.POSITIVE_INFINITY;
                    const bTime = b.dueDateIso ? new Date(b.dueDateIso).getTime() : Number.POSITIVE_INFINITY;
                    if (aTime !== bTime) return aTime - bTime;
                    return (a.title || '').localeCompare(b.title || '');
                });
                const doneReminders = reminderData.doneItems;
                // Summary: count ALL pending items (includeAll), not just near-due ones
                const allReminderData = this.getReminderData(vehicle, { includeAll: true });
                const reminderSummary = { tire: 0, service: 0, docs: 0, backup: 0 };
                allReminderData.activeItems.forEach(it => {
                    if (it.id.startsWith('tire:')) reminderSummary.tire += 1;
                    else if (it.id.startsWith('svc:')) reminderSummary.service += 1;
                    else if (it.id.startsWith('doc:')) reminderSummary.docs += 1;
                    else if (it.id.startsWith('backup:')) reminderSummary.backup += 1;
                });

                const getReminderTone = (it) => {
                    if (it.id.startsWith('backup:')) return 'blue';
                    const meta = (it.meta || '').toLowerCase();
                    const overdue = utils.t('overdue').toLowerCase();
                    const expired = utils.t('expired').toLowerCase();
                    if (meta.includes(overdue) || meta.includes(expired)) return 'red';
                    return 'amber';
                };

                const topReminders = activeReminders.slice(0, 3);
                const remindersHtml = `
                    <div class="px-6 mb-6">
                        <div class="theme-bg-card p-5 rounded-3xl card-shadow border theme-border">
                            <div class="flex items-start justify-between gap-3 mb-4">
                                <div>
                                    <div class="text-[11px] theme-text-sub uppercase tracking-wider flex items-center gap-1">
                                        <span class="material-icons text-sm">notifications</span> ${utils.t('reminder_center')}
                                    </div>
                                    <div class="text-xl font-black theme-text-heading">${utils.t('reminders')}</div>
                                    <div class="text-xs theme-text-sub mt-1">${utils.t('reminder_due_count').replace('{n}', activeReminders.length)}</div>
                                </div>
                                <button onclick="router.navigate('reminders')" class="inline-flex items-center gap-2 text-[10px] font-bold text-teal-700 bg-teal-100 dark:bg-teal-900/30 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800">${utils.t('view_all')} <span class="material-icons text-[14px]">arrow_forward</span></button>
                            </div>

                            <div class="text-[10px] theme-text-sub uppercase tracking-wider mb-2">${utils.t('reminder_summary')}</div>
                            <div class="grid grid-cols-4 gap-2 mb-4">
                                ${[
                                    { key: 'tire', label: utils.t('reminder_tires'), icon: 'tire_repair', count: reminderSummary.tire },
                                    { key: 'service', label: utils.t('reminder_service'), icon: 'build', count: reminderSummary.service },
                                    { key: 'docs', label: utils.t('reminder_docs'), icon: 'assignment', count: reminderSummary.docs },
                                    { key: 'backup', label: utils.t('reminder_backup'), icon: 'cloud_upload', count: reminderSummary.backup }
                                ].map(s => `
                                    <div class="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 border theme-border flex flex-col items-start">
                                        <div class="flex items-center gap-1 text-[10px] theme-text-sub">
                                            <span class="material-icons text-[14px]">${s.icon}</span>${s.label}
                                        </div>
                                        <div class="text-sm font-black theme-text-heading">${s.count}</div>
                                    </div>
                                `).join('')}
                            </div>

                            <div class="space-y-2 mb-4">
                                ${topReminders.length ? topReminders.map(it => {
                                    const tone = getReminderTone(it);
                                    return `
                                        <div class="p-3 rounded-2xl border theme-border bg-${tone}-50 dark:bg-${tone}-900/20">
                                            <div class="flex items-start justify-between gap-3">
                                                <div class="flex items-start gap-3">
                                                    <div class="w-9 h-9 rounded-xl bg-${tone}-100 text-${tone}-600 flex items-center justify-center">
                                                        <span class="material-icons text-base">${it.icon}</span>
                                                    </div>
                                                    <div>
                                                        <div class="font-bold theme-text-heading text-sm">${utils.escapeHtml(it.title)}</div>
                                                        <div class="text-[10px] theme-text-sub mt-0.5">${it.meta ? utils.escapeHtml(it.meta) : '&nbsp;'}</div>
                                                    </div>
                                                </div>
                                                ${it.editAction ? `<button onclick="${it.editAction}" class="text-[10px] font-bold text-${tone}-600">${utils.t('reminder_open')}</button>` : ''}
                                            </div>
                                            <div class="flex gap-2 mt-3">
                                                <button onclick="ui.snoozeReminder('${it.id}', 7)" class="flex-1 py-2 rounded-xl text-[10px] font-bold bg-white/70 dark:bg-slate-800 theme-text-heading border theme-border">${utils.t('snooze_7d')}</button>
                                                <button onclick="ui.markReminderDone('${it.id}')" class="flex-1 py-2 rounded-xl text-[10px] font-bold bg-teal-600 text-white">${utils.t('mark_done')}</button>
                                            </div>
                                        </div>
                                    `;
                                }).join('') : `
                                    <div class="text-center text-xs theme-text-sub py-6">${utils.t('reminder_none')}</div>
                                `}
                            </div>

                            <div class="flex items-center justify-between gap-3">
                                <div class="text-[10px] theme-text-sub uppercase tracking-wider">${utils.t('reminder_quick_actions')}</div>
                                <div class="flex gap-2">
                                    <button onclick="ui.snoozeAllReminders(7)" class="text-[10px] font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 theme-text-heading border theme-border ${activeReminders.length ? '' : 'opacity-40 pointer-events-none'}">${utils.t('snooze_all_7d')}</button>
                                    <button onclick="ui.clearDoneReminders()" class="text-[10px] font-bold px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 theme-text-heading border theme-border ${doneReminders.length ? '' : 'opacity-40 pointer-events-none'}">${utils.t('clear_done')}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                const bgClass = utils.getCarColorClass(vehicle.color || 'teal');
                return `
                    <div class="relative pb-20">
                        <div class="${bgClass} pt-safe pb-20 rounded-b-[2.5rem] shadow-xl px-6 relative overflow-hidden transition-all duration-500 z-10">
                             <div class="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                             
                             <div class="relative z-10">
                                <div class="flex justify-between items-start mb-6">
                                    <div>
                                        <div class="opacity-80 text-xs font-bold tracking-wider mb-1 uppercase">${utils.escapeHtml(vehicle.year)} ${utils.escapeHtml(vehicle.make)}</div>
                                        <div onclick="ui.openVehicleSelector()" class="text-3xl font-black flex items-center gap-2 cursor-pointer active:opacity-70">
                                            ${utils.escapeHtml(vehicle.model)} 
                                            <span class="material-icons text-2xl opacity-70">expand_more</span>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="router.navigate('reminders')" class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition text-white">
                                            <span class="material-icons text-lg">notifications</span>
                                        </button>
                                        <button onclick="ui.openCalendarSelector()" class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition text-white">
                                            <span class="material-icons text-lg">event</span>
                                        </button>
                                        <button onclick="ui.openAddVehicle('${vehicle.id}')" class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition text-white">
                                            <span class="material-icons text-lg">edit</span>
                                        </button>
                                    </div>
                                </div>
                                ${this.renderFilterHeader('dashboard', filter, true)}
                             </div>
                        </div>

                        <div class="px-6 mt-2 relative z-20">
                            <div class="grid grid-cols-2 gap-3 mb-6">
                                <div class="theme-bg-card p-4 rounded-2xl card-shadow">
                                    <div class="theme-text-sub text-[10px] font-bold uppercase tracking-wider mb-1">${utils.t('efficiency')}</div>
                                    <div class="text-2xl font-black text-teal-600">${stats.efficiency}</div>
                                    <div class="text-[10px] theme-text-sub">${utils.getEfficiencyLabel()}</div>
                                </div>
                                <div class="theme-bg-card p-4 rounded-2xl card-shadow">
                                    <div class="theme-text-sub text-[10px] font-bold uppercase tracking-wider mb-1">${utils.getCostPerDistLabel()}</div>
                                    <div class="text-2xl font-black text-blue-600">${stats.costKm}</div>
                                    <div class="text-[10px] theme-text-sub">&nbsp;</div>
                                </div>
                                <div class="theme-bg-card p-4 rounded-2xl card-shadow">
                                    <div class="theme-text-sub text-[10px] font-bold uppercase tracking-wider mb-1">${utils.t('total_cost')}</div>
                                    <div class="text-xl font-black theme-text-heading">${utils.formatCurrency(stats.totalCost)}</div>
                                </div>
                                <div class="theme-bg-card p-4 rounded-2xl card-shadow">
                                    <div class="theme-text-sub text-[10px] font-bold uppercase tracking-wider mb-1">${utils.t('total_dist')}</div>
                                    <div class="text-xl font-black theme-text-heading">${stats.totalDistCount < 2 ? '--' : (Number.isFinite(stats.totalDist) ? stats.totalDist.toLocaleString() : '--')}</div>
                                    <div class="text-[10px] theme-text-sub">${utils.getDistUnit()}</div>
                                </div>
                            </div>

                            <div class="flex gap-3 mb-6">
                                <button onclick="ui.openAddFuel()" class="flex-1 grad-teal text-white py-4 rounded-2xl shadow-lg shadow-teal-500/20 active:scale-95 transition-transform flex flex-col items-center justify-center gap-1">
                                    <span class="material-icons text-2xl">local_gas_station</span>
                                    <span class="font-bold text-sm">${utils.t('add_fuel')}</span>
                                </button>
                                <button onclick="ui.openAddService()" class="flex-1 bg-white dark:bg-slate-800 theme-text-heading py-4 rounded-2xl shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center gap-1 border theme-border">
                                    <span class="material-icons text-2xl text-slate-400">build</span>
                                    <span class="font-bold text-sm">${utils.t('add_service')}</span>
                                </button>
                            </div>

                            <div class="theme-bg-card p-4 rounded-2xl card-shadow mb-6">
                                <div class="flex items-center justify-between">
                                    <div class="font-bold theme-text-heading flex items-center gap-2">
                                        <span class="material-icons text-slate-400 text-base">tire_repair</span>
                                        ${utils.t('next_tire_change')}
                                    </div>
                                    ${hasUnsetTires
                                        ? `<button onclick="ui.openQuickTireSetup()" class="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-lg">${utils.t('quick_tire_setup')}</button>`
                                        : `<button onclick="ui.openAddService(null,'tire_replace')" class="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-lg">+ ${utils.t('tire_replace')}</button>`
                                    }
                                </div>
                                <div class="grid grid-cols-2 gap-3 mt-3">
                                    ${tireStatuses.map(s => `
                                        <button onclick="${s.isNotSet ? `ui.openQuickTireSetup('${s.pos}')` : (s.editLogId ? `ui.openAddService('${s.editLogId}')` : `ui.openAddService(null,'tire_replace'); setTimeout(() => { const el=document.getElementById('l_tire_pos'); if (el) el.value='${s.pos}'; }, 60);`)}" class="text-left p-3 rounded-xl border theme-border bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                                            <div class="text-xs theme-text-sub font-bold">${utils.t('tire_' + s.pos)}</div>
                                            <div class="text-sm font-black ${s.isOverdue ? 'text-red-600' : 'theme-text-heading'}">${s.primary}</div>
                                            <div class="text-[10px] theme-text-sub">${s.secondary || '&nbsp;'}</div>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <div class="mt-2 relative z-20">
                            ${remindersHtml}
                            
                            <div class="px-6">
                                <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 ml-1">Recent Activity</div>
                                <div class="space-y-3 pb-24">
                                    ${logs.length ? logs.slice(0, 5).map(l => this.renderLogCard(l)).join('') : `<div class="text-center theme-text-sub py-8 italic text-sm">${utils.t('no_records_yet')}</div>`}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            },

            getReminderData(vehicle, options = {}) {
                const includeAll = !!options.includeAll;
                if (!vehicle) {
                    return { items: [], activeItems: [], snoozedItems: [], doneItems: [], snoozedUntil: {}, done: {} };
                }
                const now = new Date();
                const center = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                const snoozedUntil = center.snoozedUntil || {};
                const done = center.done || {};

                const items = [];
                const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

                // Tires
                const tireThresholdKm = (() => {
                    const dist = parseInt(vehicle?.tireReplaceDist ?? store.data.settings.tireReplaceDist) || 0;
                    if (dist <= 0) return 2000;
                    return Math.max(500, Math.min(5000, Math.round(dist * 0.1)));
                })();
                const tireThresholdDays = 60;
                let hasTireReminder = false;
                const tireStatuses = utils.getTireReplacementStatus(vehicle);
                for (const s of tireStatuses) {
                    const near =
                        s.isOverdue ||
                        (s.remainingKm !== null && s.remainingKm <= tireThresholdKm) ||
                        (s.remainingDays !== null && s.remainingDays <= tireThresholdDays);
                    if (!includeAll && !near) continue;
                    hasTireReminder = true;
                    const id = `tire:${vehicle.id}:${s.pos}:${s.editLogId || 'none'}`;
                    items.push({
                        id,
                        icon: 'tire_repair',
                        title: `${utils.t('next_tire_change')} • ${utils.t('tire_' + s.pos)}`,
                        meta: [s.primary, s.secondary].filter(Boolean).join(' • '),
                        dueDateIso: s.dueDateIso,
                        calendarTitle: `${utils.t('next_tire_change')} • ${utils.t('tire_' + s.pos)}: ${vehicleLabel}`,
                        editAction: s.editLogId
                            ? `ui.openAddService('${s.editLogId}')`
                            : `ui.openAddService(null,'tire_replace'); setTimeout(() => { const el=document.getElementById('l_tire_pos'); if (el) el.value='${s.pos}'; }, 60);`
                    });
                }
                if (!hasTireReminder) {
                    const byDays = tireStatuses.filter(s => !s.isNotSet && s.remainingDays !== null);
                    const byKm = tireStatuses.filter(s => !s.isNotSet && s.remainingKm !== null);
                    const candidate = byDays.length
                        ? byDays.sort((a, b) => (a.remainingDays || 0) - (b.remainingDays || 0))[0]
                        : (byKm.length ? byKm.sort((a, b) => (a.remainingKm || 0) - (b.remainingKm || 0))[0] : null);
                    const fallbackUnset = tireStatuses.find(s => s.isNotSet);
                    const picked = candidate || fallbackUnset;
                    // Only show fallback if tire is within a reasonable upcoming range, or includeAll
                    const candidateIsNear = candidate && (
                        (includeAll) ||
                        (candidate.remainingDays !== null && candidate.remainingDays <= 180) ||
                        (candidate.remainingKm !== null && candidate.remainingKm <= tireThresholdKm * 3)
                    );
                    if (picked && (picked.isNotSet || candidateIsNear)) {
                        const id = `tire:${vehicle.id}:next:${picked.pos || 'unset'}`;
                        items.push({
                            id,
                            icon: 'tire_repair',
                            title: picked.pos ? `${utils.t('next_tire_change')} • ${utils.t('tire_' + picked.pos)}` : utils.t('next_tire_change'),
                            meta: [picked.primary, picked.secondary].filter(Boolean).join(' • '),
                            dueDateIso: picked.dueDateIso,
                            editAction: picked.isNotSet
                                ? `ui.openQuickTireSetup('${picked.pos || 'front_left'}')`
                                : (picked.editLogId
                                    ? `ui.openAddService('${picked.editLogId}')`
                                    : `ui.openAddService(null,'tire_replace'); setTimeout(() => { const el=document.getElementById('l_tire_pos'); if (el) el.value='${picked.pos || 'front_left'}'; }, 60);`)
                        });
                    }
                }

                // Document expiry
                ['license', 'insurance', 'registration'].forEach(type => {
                    const setting = store.data.settings.reminders?.[type];
                    if (setting && !setting.enabled) return;
                    const latest = store.getVehicleLogs(type)[0];
                    if (!latest || !latest.expiryDate) return;
                    const days = Math.ceil((new Date(latest.expiryDate) - now) / 86400000);
                    if (!includeAll && days > (setting?.days || 30)) return;
                    const id = `doc:${vehicle.id}:${type}:${latest.expiryDate}`;
                    items.push({
                        id,
                        icon: 'assignment',
                        title: utils.t(type),
                        meta: days <= 0 ? utils.t('overdue') : `${utils.t('due_in')} ${utils.formatDaysShort(days)}`,
                        dueDateIso: new Date(latest.expiryDate).toISOString(),
                        calendarType: type,
                        calendarTitle: `${utils.t(type)}: ${vehicleLabel}`,
                        editAction: `ui.openAddService('${latest.id}')`,
                        calendarAction: `utils.exportCalendar('${type}', 0)`
                    });
                });

                // Periodic maintenance
                const distInt = parseInt(vehicle?.maintenanceDist ?? store.data.settings.maintenanceDist) || 0;
                const timeInt = parseInt(vehicle?.maintenanceTime ?? store.data.settings.maintenanceTime) || 0;
                const lastService = store.getVehicleLogs('periodic_maintenance')[0];
                const lastOdo = lastService ? parseFloat(lastService.odometer) || 0 : 0;
                const lastDate = lastService ? new Date(lastService.date) : null;
                if (distInt > 0) {
                    const nextOdo = lastOdo + distInt;
                    const remaining = nextOdo - (parseFloat(vehicle.currentOdometer) || 0);
                    if (includeAll || remaining <= 500) {
                        const id = `svc:${vehicle.id}:dist:${nextOdo}`;
                        items.push({
                            id,
                            icon: 'build',
                            title: utils.t('due_service'),
                            meta: remaining <= 0 ? utils.t('overdue') : `${utils.t('due_in')} ${Math.max(0, Math.round(remaining)).toLocaleString()} ${utils.getDistUnit()}`,
                            dueDateIso: null,
                            remainingKm: remaining,
                            editAction: `ui.openAddService(null,'periodic_maintenance')`
                        });
                    }
                }
                if (timeInt > 0 && lastDate) {
                    const nextDate = new Date(lastDate);
                    nextDate.setMonth(nextDate.getMonth() + timeInt);
                    const remainingDays = Math.ceil((nextDate - now) / 86400000);
                    if (includeAll || remainingDays <= 30) {
                        const id = `svc:${vehicle.id}:time:${nextDate.toISOString().slice(0,10)}`;
                        items.push({
                            id,
                            icon: 'build',
                            title: utils.t('due_service'),
                            meta: remainingDays <= 0 ? utils.t('overdue') : `${utils.t('due_in')} ${utils.formatDaysShort(remainingDays)}`,
                            dueDateIso: nextDate.toISOString(),
                            remainingDays,
                            calendarTitle: `${utils.t('due_service')}: ${vehicleLabel}`,
                            editAction: `ui.openAddService(null,'periodic_maintenance')`,
                            calendarAction: `utils.exportDateCalendar('${utils.t('due_service')}: ${vehicleLabel}', '${nextDate.toISOString()}', 0)`
                        });
                    }
                }

                if (distInt > 0 && timeInt > 0 && items.length) {
                    const distIndex = items.findIndex(i => i.id.startsWith(`svc:${vehicle.id}:dist:`));
                    const timeIndex = items.findIndex(i => i.id.startsWith(`svc:${vehicle.id}:time:`));
                    if (distIndex !== -1 && timeIndex !== -1) {
                        const distItem = items[distIndex];
                        const timeItem = items[timeIndex];
                        const mergedMeta = [distItem.meta, timeItem.meta].filter(Boolean).join(' • ');
                        const pickTime = (() => {
                            if (Number.isFinite(timeItem.remainingDays) && Number.isFinite(distItem.remainingKm)) {
                                const timeCloser = timeItem.remainingDays <= 30;
                                const distCloser = distItem.remainingKm <= 500;
                                if (timeCloser !== distCloser) return timeCloser;
                                return timeItem.remainingDays <= distItem.remainingKm;
                            }
                            if (Number.isFinite(timeItem.remainingDays)) return true;
                            if (Number.isFinite(distItem.remainingKm)) return false;
                            return true;
                        })();
                        const mergedDue = pickTime ? timeItem.dueDateIso : distItem.dueDateIso;
                        items[distIndex] = {
                            ...distItem,
                            meta: mergedMeta,
                            dueDateIso: mergedDue,
                            calendarTitle: timeItem.calendarTitle || distItem.calendarTitle,
                            calendarAction: timeItem.calendarAction || distItem.calendarAction
                        };
                        items.splice(timeIndex, 1);
                    }
                }

                // Backup reminder (existing logic)
                const logs = store.getVehicleLogs();
                let showBackup = false;
                if (!store.data.settings.lastBackupDate) {
                    if (logs.length > 5) showBackup = true;
                } else {
                    const daysSince = (now - new Date(store.data.settings.lastBackupDate)) / 86400000;
                    if (daysSince > 30) showBackup = true;
                }
                if (showBackup) {
                    const id = `backup:${vehicle.id}`;
                    items.push({
                        id,
                        icon: 'cloud_upload',
                        title: utils.t('backup_needed'),
                        meta: utils.t('backup_desc'),
                        dueDateIso: null,
                        editAction: `ui.exportData(); ui.render();`
                    });
                }

                const activeItems = items.filter(it => {
                    if (done[it.id]) return false;
                    const until = snoozedUntil[it.id];
                    if (!until) return true;
                    return new Date(until) <= now;
                });
                const snoozedItems = items.filter(it => {
                    if (done[it.id]) return false;
                    const until = snoozedUntil[it.id];
                    return until && new Date(until) > now;
                });
                const doneItems = items.filter(it => !!done[it.id]);

                return { items, activeItems, snoozedItems, doneItems, snoozedUntil, done };
            },

            renderReminders(vehicle) {
                const { activeItems, snoozedItems, doneItems, snoozedUntil, done } = this.getReminderData(vehicle, { includeAll: true });
                const tab = store.pageFilters.remindersTab || 'active';
                const sortByDue = (list) => list.slice().sort((a, b) => {
                    const aTime = a.dueDateIso ? new Date(a.dueDateIso).getTime() : Number.POSITIVE_INFINITY;
                    const bTime = b.dueDateIso ? new Date(b.dueDateIso).getTime() : Number.POSITIVE_INFINITY;
                    if (aTime !== bTime) return aTime - bTime;
                    return (a.title || '').localeCompare(b.title || '');
                });
                const visible =
                    tab === 'snoozed' ? sortByDue(snoozedItems) :
                    tab === 'done' ? sortByDue(doneItems) :
                    sortByDue(activeItems);

                return `
                    <div class="px-6 pt-safe min-h-screen pb-24">
                        <div class="flex items-center justify-between mb-4">
                            <h1 class="text-3xl font-black theme-text-heading">${utils.t('reminder_center')}</h1>
                            <button onclick="router.navigate('dashboard')" class="text-sm font-bold text-teal-600">${utils.t('dashboard')}</button>
                        </div>

                        <div class="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
                            <button onclick="store.pageFilters.remindersTab='active'; ui.render()" class="flex-1 py-2 text-xs font-bold rounded-lg ${tab==='active'?'bg-white dark:bg-slate-700 shadow':''}">${utils.t('tab_active')} (${activeItems.length})</button>
                            <button onclick="store.pageFilters.remindersTab='snoozed'; ui.render()" class="flex-1 py-2 text-xs font-bold rounded-lg ${tab==='snoozed'?'bg-white dark:bg-slate-700 shadow':''}">${utils.t('tab_snoozed')} (${snoozedItems.length})</button>
                            <button onclick="store.pageFilters.remindersTab='done'; ui.render()" class="flex-1 py-2 text-xs font-bold rounded-lg ${tab==='done'?'bg-white dark:bg-slate-700 shadow':''}">${utils.t('tab_done')} (${doneItems.length})</button>
                        </div>

                        <div class="space-y-3">
                            ${visible.length ? visible.map(it => `
                                <div class="theme-bg-card p-4 rounded-2xl card-shadow border theme-border">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="flex items-start gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <span class="material-icons text-slate-500">${it.icon}</span>
                                            </div>
                                            <div>
                                                <div class="font-bold theme-text-heading">${utils.escapeHtml(it.title)}</div>
                                                <div class="text-xs theme-text-sub mt-0.5">${it.meta ? utils.escapeHtml(it.meta) : '&nbsp;'}</div>
                                                ${snoozedUntil[it.id] && !done[it.id] ? `<div class="text-[10px] text-slate-400 mt-1">Snoozed until ${utils.formatDate(snoozedUntil[it.id])}</div>` : ''}
                                            </div>
                                        </div>
                                        <button onclick="${it.editAction}" class="text-slate-300 hover:text-sky-500"><span class="material-icons">edit</span></button>
                                    </div>
                                    <div class="flex gap-2 mt-3">
                                        ${tab === 'done'
                                            ? `<button onclick="ui.restoreReminder('${it.id}')" class="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">${utils.t('restore')}</button>`
                                            : `
                                                <button onclick="ui.snoozeReminder('${it.id}', 1)" class="py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">${utils.t('snooze_1d')}</button>
                                                <button onclick="ui.snoozeReminder('${it.id}', 7)" class="py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">${utils.t('snooze_7d')}</button>
                                                <button onclick="ui.snoozeReminder('${it.id}', 30)" class="py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">${utils.t('snooze_30d')}</button>
                                                ${tab === 'snoozed' ? `<button onclick="ui.unsnoozeReminder('${it.id}')" class="flex-1 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 theme-text-heading">${utils.t('unsnooze')}</button>` : `<button onclick="ui.markReminderDone('${it.id}')" class="flex-1 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white">${utils.t('mark_done')}</button>`}
                                            `}
                                        ${(it.calendarType || it.dueDateIso)
                                            ? `<button data-action="reminder-calendar" data-title="${utils.escapeAttr(encodeURIComponent(it.calendarTitle || it.title || ''))}" data-date="${utils.escapeAttr(it.dueDateIso || '')}" data-type="${utils.escapeAttr(it.calendarType || '')}" class="py-2 px-3 rounded-xl text-xs font-bold bg-blue-50 text-blue-700">${utils.t('export_calendar')}</button>`
                                            : ''
                                        }
                                    </div>
                                </div>
                            `).join('') : `<div class="text-center theme-text-sub py-12">No reminders</div>`}
                        </div>
                    </div>
                `;
            },

            renderFuel(vehicle) {
                const logs = store.getVehicleLogs('fuel');
                const filter = store.pageFilters.fuel;
                const q = (store.pageFilters.fuelSearch || '').toLowerCase();
                const fuelFlags = store.pageFilters.fuelFlags || { full: false, partial: false };
                const from = store.pageFilters.fuelFrom || '';
                const to = store.pageFilters.fuelTo || '';
                const filteredLogs = store._getCachedFiltered(
                    `fuel|${store.data.settings.language || 'en'}|${filter.mode}:${filter.value}|${from}|${to}|${q}|${fuelFlags.full ? 1 : 0}${fuelFlags.partial ? 1 : 0}`,
                    () => {
                        let out = utils.filterLogs(logs, filter);
                        out = utils.filterByDateRange(out, from, to);
                        if (q) out = out.filter(l => store.getLogSearchText(l).includes(q));
                        if (fuelFlags.full && !fuelFlags.partial) out = out.filter(l => !l.isPartial);
                        if (fuelFlags.partial && !fuelFlags.full) out = out.filter(l => !!l.isPartial);
                        return out;
                    }
                );
                const stats = utils.calculateStats(filteredLogs, 'fuel');
                const limit = ui.getPageLimit('fuel');
                const visibleLogs = filteredLogs.slice(0, limit);
                
                return `
                    <div class="px-6 pt-safe min-h-screen">
                        <div class="flex justify-between items-center mb-6">
                             <h1 class="text-3xl font-black theme-text-heading">${utils.t('fuel')}</h1>
                        </div>
                        <div class="mb-4">${this.renderFilterHeader('fuel', filter)}</div>

                        ${ui.renderSearchPanel({
                            searchValue: store.pageFilters.fuelSearch,
                            onSearchInput: "ui.onSearchInput('fuel','fuelSearch',this.value)",
                            onClearSearch: "ui.clearSearch('fuel','fuelSearch')",
                            placeholder: "Search notes/location...",
                            fromValue: store.pageFilters.fuelFrom,
                            toValue: store.pageFilters.fuelTo,
                            onFromChange: "store.pageFilters.fuelFrom=this.value;ui.resetPageLimit('fuel');ui.render()",
                            onToChange: "store.pageFilters.fuelTo=this.value;ui.resetPageLimit('fuel');ui.render()",
                            onClearRange: "store.pageFilters.fuelFrom='';store.pageFilters.fuelTo='';ui.resetPageLimit('fuel');ui.render()",
                            chips: [
                                { label: "Full", active: !!fuelFlags.full, onClick: "store.pageFilters.fuelFlags={...store.pageFilters.fuelFlags, full: !store.pageFilters.fuelFlags.full};ui.resetPageLimit('fuel');ui.render()" },
                                { label: "Partial", active: !!fuelFlags.partial, onClick: "store.pageFilters.fuelFlags={...store.pageFilters.fuelFlags, partial: !store.pageFilters.fuelFlags.partial};ui.resetPageLimit('fuel');ui.render()" }
                            ]
                        })}

                        <div class="grid grid-cols-2 gap-3 mb-6">
                            <div class="theme-bg-card p-3 rounded-xl card-shadow border-l-4 border-teal-500">
                                <div class="text-[10px] theme-text-sub uppercase tracking-wider">${utils.t('efficiency')}</div>
                                <div class="text-lg font-bold text-teal-600">${stats.efficiency} <span class="text-[10px] font-normal">${utils.getEfficiencyLabel()}</span></div>
                            </div>
                            <div class="theme-bg-card p-3 rounded-xl card-shadow border-l-4 border-blue-500">
                                <div class="text-[10px] theme-text-sub uppercase tracking-wider">${utils.getCostPerDistLabel()}</div>
                                <div class="text-lg font-bold text-blue-600">${stats.costKm}</div>
                            </div>
                             <div class="theme-bg-card p-3 rounded-xl card-shadow">
                                <div class="text-[10px] theme-text-sub uppercase tracking-wider">${utils.t('total_cost')}</div>
                                <div class="text-lg font-bold theme-text-heading">${utils.formatCurrency(stats.totalCost)}</div>
                            </div>
                             <div class="theme-bg-card p-3 rounded-xl card-shadow">
                                <div class="text-[10px] theme-text-sub uppercase tracking-wider">${utils.t('total_dist')}</div>
                                <div class="text-lg font-bold theme-text-heading">${stats.totalDistCount < 2 ? '--' : (Number.isFinite(stats.totalDist) ? stats.totalDist : '--')} <span class="text-[10px] font-normal">${utils.getDistUnit()}</span></div>
                            </div>
                        </div>

                        <div class="space-y-3 pb-24">
                            ${visibleLogs.length ? visibleLogs.map(l => this.renderLogCard(l)).join('') : `<div class="text-center theme-text-sub py-12">No records found</div>`}
                            ${filteredLogs.length > visibleLogs.length ? ui.renderLoadMore('fuel', visibleLogs.length, filteredLogs.length) : ''}
                        </div>
                        <button onclick="ui.openAddFuel()" class="fixed bottom-[calc(130px+var(--safe-bottom))] right-6 w-14 h-14 rounded-full grad-teal text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform z-50">
                            <span class="material-icons">add</span>
                        </button>
                    </div>
                `;
            },
            
            renderMaintenance(vehicle) {
                const filter = store.pageFilters.maintenance;
                const view = store.pageFilters.maintenanceView || 'all';
                const selectedTypes = store.pageFilters.maintenanceTypes || [];
                
                const query = (store.pageFilters.maintenanceSearch || '').toLowerCase();
                const from = store.pageFilters.maintenanceFrom || '';
                const to = store.pageFilters.maintenanceTo || '';
                const typeKey = (selectedTypes || []).slice().sort().join(',');
                const filteredLogs = store._getCachedFiltered(
                    `maintenance|${store.data.settings.language || 'en'}|${filter.mode}:${filter.value}|${from}|${to}|${typeKey}|${query}`,
                    () => {
                        const logs = store.getVehicleLogs();
                        let out = logs.filter(l => l.type !== 'fuel' && l.type !== 'parking');
                        out = utils.filterLogs(out, filter);
                        out = utils.filterByDateRange(out, from, to);
                        if (selectedTypes.length) out = out.filter(l => selectedTypes.includes(l.type));
                        if (query) {
                            out = out.filter(l => {
                                if (store.getLogSearchText(l).includes(query)) return true;
                                if ((l.tireBrand || '').toLowerCase().includes(query)) return true;
                                return utils.t(l.type).toLowerCase().includes(query);
                            });
                        }
                        return out;
                    }
                );
                const limit = ui.getPageLimit('maintenance');
                const visibleLogs = view === 'all' ? filteredLogs.slice(0, limit) : filteredLogs;
                const stats = utils.calculateStats(filteredLogs, 'maintenance');
                const tireTimeline = utils.getTireTimeline(vehicle);
                const tireTimelineFiltered = query
                    ? tireTimeline.filter(t => (t.lastReplace?.brand || '').toLowerCase().includes(query) || (t.currentPos && utils.t('tire_' + t.currentPos).toLowerCase().includes(query)))
                    : tireTimeline;
                const tireStatuses = utils.getTireReplacementStatus(vehicle);
                const hasUnsetTires = tireStatuses.some(s => s.isNotSet);

                return `
                    <div class="px-6 pt-safe min-h-screen">
                        <div class="flex justify-between items-center mb-2">
                             <h1 class="text-3xl font-black theme-text-heading">${utils.t('maintenance')}</h1>
                        </div>
                        <div class="mb-4">${this.renderFilterHeader('maintenance', filter)}</div>
                        
                        ${ui.renderSearchPanel({
                            searchValue: store.pageFilters.maintenanceSearch,
                            onSearchInput: "ui.onSearchInput('maintenance','maintenanceSearch',this.value)",
                            onClearSearch: "ui.clearSearch('maintenance','maintenanceSearch')",
                            placeholder: "Search notes/location/brand...",
                            fromValue: store.pageFilters.maintenanceFrom,
                            toValue: store.pageFilters.maintenanceTo,
                            onFromChange: "store.pageFilters.maintenanceFrom=this.value;ui.resetPageLimit('maintenance');ui.render()",
                            onToChange: "store.pageFilters.maintenanceTo=this.value;ui.resetPageLimit('maintenance');ui.render()",
                            onClearRange: "store.pageFilters.maintenanceFrom='';store.pageFilters.maintenanceTo='';ui.resetPageLimit('maintenance');ui.render()"
                        })}

                        <div class="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-3">
                            <button onclick="store.pageFilters.maintenanceView='all'; store.pageFilters.maintenanceTypes=[]; ui.resetPageLimit('maintenance'); ui.render()" class="flex-1 py-2 text-xs font-bold rounded-lg ${view==='all'?'bg-white dark:bg-slate-700 shadow':''}">${utils.t('all')}</button>
                            <button onclick="store.pageFilters.maintenanceView='tires'; ui.resetPageLimit('maintenance'); ui.render()" class="flex-1 py-2 text-xs font-bold rounded-lg ${view==='tires'?'bg-white dark:bg-slate-700 shadow':''}">${utils.t('tire_replace')}</button>
                        </div>

                        ${view === 'all' ? `
                            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
                                <button onclick="store.pageFilters.maintenanceTypes=[]; ui.resetPageLimit('maintenance'); ui.render()" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${selectedTypes.length ? 'bg-slate-50 dark:bg-slate-800 theme-border theme-text-sub' : 'bg-teal-600 text-white border-teal-600'}">${utils.t('all')}</button>
                                ${['service','repair','tire_replace','tire_rotation','periodic_maintenance','car_wash','car_accessories','fine','license','insurance','registration'].map(t => {
                                    const active = selectedTypes.includes(t);
                                    return `<button onclick="const s=store.pageFilters.maintenanceTypes||[]; store.pageFilters.maintenanceTypes = s.includes('${t}') ? s.filter(x=>x!=='${t}') : [...s,'${t}']; ui.resetPageLimit('maintenance'); ui.render()" class="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border ${active ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20' : 'bg-slate-50 dark:bg-slate-800 theme-border theme-text-sub'}">${utils.t(t)}</button>`;
                                }).join('')}
                            </div>
                        ` : ''}

                        <div class="theme-bg-card p-4 rounded-2xl card-shadow mb-6 flex justify-between items-center">
                            <div>
                                <div class="text-xs theme-text-sub uppercase tracking-wider">${utils.t('maintenance_cost')}</div>
                                <div class="text-2xl font-black theme-text-heading">${utils.formatCurrency(stats.totalCost)}</div>
                            </div>
                            <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span class="material-icons text-slate-500">build</span>
                            </div>
                        </div>

                        ${view === 'tires' ? `
                            <div class="theme-bg-card p-4 rounded-2xl card-shadow mb-6">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="text-xs theme-text-sub">${utils.t('quick_tire_setup_desc')}</div>
                                    <div class="flex gap-2">
                                        <button onclick="ui.openQuickTireSetup()" class="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-lg">${utils.t('quick_tire_setup')}</button>
                                        <button onclick="ui.openQuickTireSetup(null,true)" class="text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800/60 px-2 py-1 rounded-lg">${utils.t('quick_tire_setup_all')}</button>
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <div class="space-y-3 pb-24">
                            ${view === 'tires'
                                ? (tireTimelineFiltered.length
                                    ? tireTimelineFiltered.map(t => `
                                        <div class="theme-bg-card p-4 rounded-2xl card-shadow">
                                            <div class="flex items-start justify-between gap-3">
                                                <div>
                                                    <div class="text-xs theme-text-sub font-bold">${t.currentPos ? utils.t('tire_' + t.currentPos) : utils.t('tire_positions')}</div>
                                                    <div class="text-lg font-black theme-text-heading">${utils.escapeHtml(t.lastReplace?.brand || utils.t('tire_not_set'))}</div>
                                                    <div class="text-xs theme-text-sub mt-0.5">${t.lastReplace ? `${utils.formatDate(t.lastReplace.date)} • ${t.lastReplace.odometer} ${utils.getDistUnit()}` : '&nbsp;'}</div>
                                                </div>
                                                <div class="flex gap-2">
                                                    ${t.lastReplace?.logId
                                                        ? `<button type="button" data-action="edit-log" data-log-id="${t.lastReplace.logId}" onclick="event.stopPropagation(); ui.openLogEditorById('${t.lastReplace.logId}')" class="text-slate-300 hover:text-sky-500"><span class="material-icons text-xl">edit</span></button>`
                                                        : `<button onclick="ui.openQuickTireSetup('${t.currentPos || 'front_left'}')" class="text-xs font-bold text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-lg">${utils.t('quick_tire_setup')}</button>`
                                                    }
                                                </div>
                                            </div>
                                            <div class="mt-3 space-y-2">
                                                ${(t.events || []).slice().sort((a,b) => (parseFloat(b.odometer)||0) - (parseFloat(a.odometer)||0)).slice(0, 8).map(ev => {
                                                    if (ev.kind === 'replace') {
                                                        return `<div class="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                                            <div class="flex items-center gap-2">
                                                                <span class="material-icons text-slate-400 text-sm">tire_repair</span>
                                                                <span class="font-bold theme-text-heading">${utils.t('tire_replace')}</span>
                                                                <span class="theme-text-sub">${utils.t('tire_' + ev.pos)}</span>
                                                            </div>
                                                            <div class="theme-text-sub">${ev.odometer} ${utils.getDistUnit()}</div>
                                                        </div>`;
                                                    }
                                                    return `<div class="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                                                        <div class="flex items-center gap-2">
                                                            <span class="material-icons text-slate-400 text-sm">sync_alt</span>
                                                            <span class="font-bold theme-text-heading">${utils.t('tire_rotation')}</span>
                                                            <span class="theme-text-sub">${utils.t('tire_' + ev.from)} → ${utils.t('tire_' + ev.to)}</span>
                                                        </div>
                                                        <div class="theme-text-sub">${ev.odometer} ${utils.getDistUnit()}</div>
                                                    </div>`;
                                                }).join('') || `<div class="text-center theme-text-sub text-sm py-3">${utils.t('no_tire_events')}</div>`}
                                            </div>
                                        </div>
                                    `).join('')
                                    : `<div class="text-center theme-text-sub py-12">${utils.t('no_tire_records_found')}</div>`)
                                : (visibleLogs.length ? visibleLogs.map(l => this.renderLogCard(l)).join('') : `<div class="text-center theme-text-sub py-12">${utils.t('no_records_found')}</div>`)}
                            ${view === 'all' && filteredLogs.length > visibleLogs.length ? ui.renderLoadMore('maintenance', visibleLogs.length, filteredLogs.length) : ''}
                        </div>
                        <button onclick="ui.openAddService()" class="fixed bottom-[calc(130px+var(--safe-bottom))] right-6 w-14 h-14 rounded-full bg-white dark:bg-slate-700 theme-text-heading shadow-xl flex items-center justify-center active:scale-90 transition-transform z-50 border theme-border">
                            <span class="material-icons">add</span>
                        </button>
                    </div>
                `;
            },
            
            renderParking(vehicle) {
                const logs = store.getVehicleLogs('parking');
                const filter = store.pageFilters.parking;
                const q = (store.pageFilters.parkingSearch || '').toLowerCase();
                const parkingFlags = store.pageFilters.parkingFlags || { withLocation: false, withNotes: false };
                const from = store.pageFilters.parkingFrom || '';
                const to = store.pageFilters.parkingTo || '';
                const filteredLogs = store._getCachedFiltered(
                    `parking|${store.data.settings.language || 'en'}|${filter.mode}:${filter.value}|${from}|${to}|${q}|${parkingFlags.withLocation ? 1 : 0}${parkingFlags.withNotes ? 1 : 0}`,
                    () => {
                        let out = utils.filterLogs(logs, filter);
                        out = utils.filterByDateRange(out, from, to);
                        if (q) out = out.filter(l => store.getLogSearchText(l).includes(q));
                        if (parkingFlags.withLocation) out = out.filter(l => !!l.location);
                        if (parkingFlags.withNotes) out = out.filter(l => !!l.notes);
                        return out;
                    }
                );
                const stats = utils.calculateStats(filteredLogs, 'parking');
                const limit = ui.getPageLimit('parking');
                const visibleLogs = filteredLogs.slice(0, limit);
                
                return `
                     <div class="px-6 pt-safe min-h-screen">
                        <div class="flex justify-between items-center mb-6">
                             <h1 class="text-3xl font-black theme-text-heading">${utils.t('parking')}</h1>
                        </div>
                        <div class="mb-4">${this.renderFilterHeader('parking', filter)}</div>

                        ${ui.renderSearchPanel({
                            searchValue: store.pageFilters.parkingSearch,
                            onSearchInput: "ui.onSearchInput('parking','parkingSearch',this.value)",
                            onClearSearch: "ui.clearSearch('parking','parkingSearch')",
                            placeholder: "Search notes/location...",
                            fromValue: store.pageFilters.parkingFrom,
                            toValue: store.pageFilters.parkingTo,
                            onFromChange: "store.pageFilters.parkingFrom=this.value;ui.resetPageLimit('parking');ui.render()",
                            onToChange: "store.pageFilters.parkingTo=this.value;ui.resetPageLimit('parking');ui.render()",
                            onClearRange: "store.pageFilters.parkingFrom='';store.pageFilters.parkingTo='';ui.resetPageLimit('parking');ui.render()",
                            chips: [
                                { label: "Has Location", active: !!parkingFlags.withLocation, onClick: "store.pageFilters.parkingFlags={...store.pageFilters.parkingFlags, withLocation: !store.pageFilters.parkingFlags.withLocation};ui.resetPageLimit('parking');ui.render()" },
                                { label: "Has Notes", active: !!parkingFlags.withNotes, onClick: "store.pageFilters.parkingFlags={...store.pageFilters.parkingFlags, withNotes: !store.pageFilters.parkingFlags.withNotes};ui.resetPageLimit('parking');ui.render()" }
                            ]
                        })}
                        
                        <div class="theme-bg-card p-4 rounded-2xl card-shadow mb-6">
                             <div class="text-xs theme-text-sub uppercase tracking-wider">${utils.t('parking_fee')}</div>
                             <div class="text-3xl font-black theme-text-heading">${utils.formatCurrency(stats.totalCost)}</div>
                        </div>
                        
                        <div class="space-y-3 pb-24">
                            ${visibleLogs.length ? visibleLogs.map(l => this.renderLogCard(l)).join('') : `<div class="text-center theme-text-sub py-12">${utils.t('no_records_yet')}</div>`}
                            ${filteredLogs.length > visibleLogs.length ? ui.renderLoadMore('parking', visibleLogs.length, filteredLogs.length) : ''}
                        </div>
                        <button onclick="ui.openAddParking()" class="fixed bottom-[calc(130px+var(--safe-bottom))] right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform z-50">
                            <span class="material-icons">add</span>
                        </button>
                     </div>
                `;
            },
            
            renderAnalytics(vehicle) {
                const logs = store.getVehicleLogs();
                const filter = store.pageFilters.analytics;
                const q = (store.pageFilters.analyticsSearch || '').toLowerCase();
                const from = store.pageFilters.analyticsFrom || '';
                const to = store.pageFilters.analyticsTo || '';
                const filteredLogs = store._getCachedFiltered(
                    `analytics|${store.data.settings.language || 'en'}|${filter.mode}:${filter.value}|${from}|${to}|${q}`,
                    () => {
                        let out = utils.filterLogs(logs, filter);
                        out = utils.filterByDateRange(out, from, to);
                        if (q) out = out.filter(l => store.getLogSearchText(l).includes(q));
                        return out;
                    }
                );
                
                const fuelCost = filteredLogs.filter(l => l.type === 'fuel').reduce((s,l) => s + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                const maintenanceCost = filteredLogs.filter(l => !['fuel','parking','fine','license','insurance','registration'].includes(l.type)).reduce((s,l) => s + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                const parkingCost = filteredLogs.filter(l => l.type === 'parking').reduce((s,l) => s + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                const fineCost = filteredLogs.filter(l => l.type === 'fine').reduce((s,l) => s + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                const docsCost = filteredLogs.filter(l => ['license', 'insurance', 'registration'].includes(l.type)).reduce((sum, l) => sum + (Number.isFinite(parseFloat(l.cost)) ? parseFloat(l.cost) : 0), 0);
                const total = fuelCost + maintenanceCost + parkingCost + fineCost + docsCost;
                
                let pieHtml = '';
                if (total > 0) {
                     const r = 50, cx = 60, cy = 60;
                     let startA = 0;
                     const slices = [
                         { val: fuelCost, col: '#0d9488', label: utils.t('fuel'), value: utils.formatCurrency(fuelCost) },
                         { val: maintenanceCost, col: '#a855f7', label: utils.t('maintenance'), value: utils.formatCurrency(maintenanceCost) },
                         { val: parkingCost, col: '#3b82f6', label: utils.t('parking'), value: utils.formatCurrency(parkingCost) },
                         { val: fineCost, col: '#ef4444', label: utils.t('traffic_fine'), value: utils.formatCurrency(fineCost) },
                         { val: docsCost, col: '#f59e0b', label: utils.t('fixed_costs'), value: utils.formatCurrency(docsCost) }
                     ];
                     pieHtml = slices.map((s, idx) => {
                         if (s.val <= 0) return '';
                         const angle = (s.val / total) * 360;
                         const large = angle > 180 ? 1 : 0;
                         const endA = startA + angle;
                         const x1 = cx + r * Math.cos(Math.PI*startA/180);
                         const y1 = cy + r * Math.sin(Math.PI*startA/180);
                         const x2 = cx + r * Math.cos(Math.PI*endA/180);
                         const y2 = cy + r * Math.sin(Math.PI*endA/180);
                         const path = total === s.val ? `M${cx-r},${cy} a${r},${r} 0 1,0 ${r*2},0 a${r},${r} 0 1,0 -${r*2},0` : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
                         startA += angle;
                         return `<path d="${path}" fill="${s.col}" data-pie-label="${s.label}" data-pie-value="${s.value}" />`;
                     }).join('');
                     pieHtml = `<svg viewBox="0 0 120 120" class="w-32 h-32 mx-auto drop-shadow-lg">${pieHtml}</svg>`;
                }
                
                return `
                    <div class="px-6 pt-safe min-h-screen">
                        <div class="flex justify-between items-center mb-6">
                             <h1 class="text-3xl font-black theme-text-heading">${utils.t('analytics')}</h1>
                        </div>
                        <div class="mb-4">${this.renderFilterHeader('analytics', filter)}</div>

                        ${ui.renderSearchPanel({
                            searchValue: store.pageFilters.analyticsSearch,
                            onSearchInput: "ui.onSearchInput('analytics','analyticsSearch',this.value)",
                            onClearSearch: "ui.clearSearch('analytics','analyticsSearch')",
                            placeholder: utils.t('search_placeholder'),
                            fromValue: store.pageFilters.analyticsFrom,
                            toValue: store.pageFilters.analyticsTo,
                            onFromChange: "store.pageFilters.analyticsFrom=this.value;ui.render()",
                            onToChange: "store.pageFilters.analyticsTo=this.value;ui.render()",
                            onClearRange: "store.pageFilters.analyticsFrom='';store.pageFilters.analyticsTo='';ui.render()"
                        })}

                        <div class="grid grid-cols-2 gap-4 mb-6">
                            <div class="theme-bg-card p-4 rounded-2xl card-shadow">
                                <div class="text-xs theme-text-sub uppercase mb-2">Total Spend</div>
                                <div class="text-2xl font-black theme-text-heading">${utils.formatCurrency(total)}</div>
                            </div>
                            <div class="theme-bg-card p-4 rounded-2xl card-shadow">
                                <div class="text-xs theme-text-sub uppercase mb-2">${utils.t('fixed_costs')}</div>
                                <div class="text-2xl font-black text-purple-600">${utils.formatCurrency(docsCost)}</div>
                            </div>
                        </div>
                        
                        <div class="theme-bg-card p-4 rounded-2xl card-shadow mb-6">
                            <div class="text-sm font-black theme-text-heading uppercase tracking-wider mb-4">${utils.t('monthly_spend')} (6 Months)</div>
                            <div class="h-56">
                                ${utils.generateMonthlyBarChart(logs)}
                            </div>
                            <div class="flex flex-wrap justify-center gap-3 mt-3 text-[11px] font-semibold theme-text-heading">
                                <div class="flex items-center gap-1" data-series="fuel"><div class="w-2.5 h-2.5 rounded-full bg-teal-500"></div>${utils.t('fuel')}</div>
                                <div class="flex items-center gap-1" data-series="maintenance"><div class="w-2.5 h-2.5 rounded-full bg-purple-400"></div>${utils.t('maintenance')}</div>
                                <div class="flex items-center gap-1" data-series="parking"><div class="w-2.5 h-2.5 rounded-full bg-blue-400"></div>${utils.t('parking')}</div>
                                <div class="flex items-center gap-1" data-series="fine"><div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>${utils.t('traffic_fine')}</div>
                                <div class="flex items-center gap-1" data-series="fixed"><div class="w-2.5 h-2.5 rounded-full bg-amber-400"></div>${utils.t('fixed_costs')}</div>
                            </div>
                        </div>

                            <div class="flex items-center gap-6 mb-8 theme-bg-card p-6 rounded-2xl card-shadow">
                            <div class="flex-1">
                                <div id="pie-breakdown" class="space-y-3">
                                    <div class="flex justify-between text-xs" data-pie-item="${utils.t('fuel')}" data-pie-value="${utils.formatCurrency(fuelCost)}"><span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-teal-600"></div>${utils.t('fuel')}</span> <span class="font-bold">${utils.formatCurrency(fuelCost)}</span></div>
                                    <div class="flex justify-between text-xs" data-pie-item="${utils.t('maintenance')}" data-pie-value="${utils.formatCurrency(maintenanceCost)}"><span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-purple-500"></div>${utils.t('maintenance')}</span> <span class="font-bold">${utils.formatCurrency(maintenanceCost)}</span></div>
                                    <div class="flex justify-between text-xs" data-pie-item="${utils.t('parking')}" data-pie-value="${utils.formatCurrency(parkingCost)}"><span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-blue-500"></div>${utils.t('parking')}</span> <span class="font-bold">${utils.formatCurrency(parkingCost)}</span></div>
                                    <div class="flex justify-between text-xs" data-pie-item="${utils.t('traffic_fine')}" data-pie-value="${utils.formatCurrency(fineCost)}"><span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-red-500"></div>${utils.t('traffic_fine')}</span> <span class="font-bold">${utils.formatCurrency(fineCost)}</span></div>
                                    <div class="flex justify-between text-xs" data-pie-item="${utils.t('fixed_costs')}" data-pie-value="${utils.formatCurrency(docsCost)}"><span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full bg-amber-500"></div>${utils.t('fixed_costs')}</span> <span class="font-bold">${utils.formatCurrency(docsCost)}</span></div>
                                </div>
                            </div>
                            <div>${pieHtml}</div>
                        </div>
                        
                        <div class="theme-bg-card p-6 rounded-2xl card-shadow mb-24">
                            <div class="text-xs font-bold theme-text-sub uppercase mb-4">Fuel Efficiency Trend</div>
                            <div class="h-32">
                                ${utils.generateTrendChart(logs)}
                            </div>
                        </div>
                    </div>
                `;
            },
            
            renderSettings(vehicle) {
                const settings = store.data.settings;
                return `
                    <div class="px-6 pt-safe min-h-screen pb-24">
                        <h1 class="text-3xl font-black theme-text-heading mb-6">${utils.t('settings')}</h1>

                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-6">
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">${utils.t('select_vehicle')}</div>
                            <button onclick="ui.openVehicleSelector()" class="w-full p-4 rounded-2xl ${vehicle ? utils.getCarColorClass(vehicle.color || 'teal') : 'bg-slate-50 dark:bg-slate-700'} text-left ${vehicle ? 'text-white' : 'theme-text-heading'}">
                                ${vehicle ? `
                                    <div class="text-[10px] font-bold tracking-wider uppercase text-white/80 mb-1">${utils.escapeHtml(vehicle.year)} ${utils.escapeHtml(vehicle.make)}</div>
                                    <div class="text-2xl font-black flex items-center gap-2">
                                        ${utils.escapeHtml(vehicle.model)}
                                        <span class="material-icons text-xl text-white/80">expand_more</span>
                                    </div>
                                ` : `
                                    <div class="text-sm font-bold theme-text-heading flex items-center gap-2">
                                        ${utils.t('select_vehicle')}
                                        <span class="material-icons text-base text-slate-400">expand_more</span>
                                    </div>
                                `}
                            </button>
                        </div>
                        
                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-6">
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Vehicle Management</div>
                            ${store.data.vehicles.map(v => `
                                <div class="flex items-center justify-between py-3 border-b theme-border last:border-0">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-white ${utils.getCarColorClass(v.color)}">
                                            <span class="material-icons text-lg">${utils.getCarIcon(v.type)}</span>
                                        </div>
                                        <div>
                                            <div class="font-bold theme-text-heading">${utils.escapeHtml(v.make)} ${utils.escapeHtml(v.model)}</div>
                                            <div class="text-xs theme-text-sub">${utils.escapeHtml(v.year)} • ${utils.escapeHtml(v.currentOdometer)} ${utils.getDistUnit()}</div>
                                        </div>
                                    </div>
                                    <button onclick="ui.openAddVehicle('${v.id}')" class="text-teal-500"><span class="material-icons">edit</span></button>
                                </div>
                            `).join('')}
                            <button onclick="ui.openAddVehicle()" class="w-full mt-4 py-2 border border-dashed border-teal-500 text-teal-600 rounded-xl text-sm font-bold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition">+ ${utils.t('add_vehicle')}</button>
                            <button onclick="ui.addDemoCar()" class="w-full mt-2 py-2 border border-dashed theme-border theme-text-heading rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition">${utils.t('add_demo_car')}</button>
                        </div>
                        
                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-4 border-2 border-teal-200 dark:border-teal-900/50">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="material-icons text-teal-600">notifications_active</span>
                                    <div class="text-sm font-black theme-text-heading uppercase tracking-wider">${utils.t('reminder_center')}</div>
                                </div>
                                <button onclick="router.navigate('reminders')" class="inline-flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-100 dark:bg-teal-900/30 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800">${utils.t('view_all')} <span class="material-icons text-[16px]">arrow_forward</span></button>
                            </div>
                        </div>

                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-5 card-shadow mb-6 border-2 border-teal-200 dark:border-teal-900/50 relative overflow-hidden">
                             <div class="absolute -top-10 -right-10 w-32 h-32 bg-teal-200/40 dark:bg-teal-900/30 rounded-full blur-2xl"></div>
                             <div class="relative">
                                 <div class="flex items-center justify-between mb-2">
                                     <div class="flex items-center gap-2">
                                         <span class="material-icons text-teal-600">notifications_active</span>
                                         <div class="text-sm font-black theme-text-heading uppercase tracking-wider">${utils.t('reminder_settings')}</div>
                                     </div>
                                 </div>
                                 <div class="text-xs theme-text-sub mb-3">${utils.t('reminder_settings_desc')}</div>
                             </div>
                             ${['license','insurance','registration'].map(type => {
                                 const conf = settings.reminders?.[type] || { enabled: true, days: 30 };
                                 return `
                                    <div class="flex items-center justify-between py-3 border-b theme-border last:border-0">
                                        <div class="text-sm font-bold theme-text-heading">${utils.t(type)}</div>
                                        <div class="flex items-center gap-2">
                                            <select onchange="store.data.settings.reminders['${type}'] = { ...store.data.settings.reminders['${type}'], days: this.value }; store.saveData();" class="text-xs p-1 rounded bg-slate-100 dark:bg-slate-700">
                                                <option value="30" ${conf.days==30?'selected':''}>${utils.t('rem_1m')}</option>
                                                <option value="7" ${conf.days==7?'selected':''}>${utils.t('rem_1w')}</option>
                                            </select>
                                            <div onclick="const s=store.data.settings.reminders['${type}']||{days:30}; s.enabled=!s.enabled; store.data.settings.reminders['${type}']=s; store.saveData(); ui.render()" class="w-10 h-6 rounded-full relative cursor-pointer transition-colors ${conf.enabled ? 'bg-teal-500' : 'bg-slate-300'}">
                                                <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${conf.enabled ? 'left-5' : 'left-1'}"></div>
                                            </div>
                                        </div>
                                    </div>
                                 `;
                             }).join('')}
                        </div>
                        
                        <!-- Maintenance + Tire Interval -->
                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-6">
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">${utils.t('interval_settings')}</div>
                            <div class="grid gap-4 sm:grid-cols-2">
                                <div class="space-y-3">
                                    <div class="text-xs font-bold theme-text-heading uppercase tracking-wider">${utils.t('service_interval')}</div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('service_interval_dist')}</label>
                                        <select onchange="const v=store.getActiveVehicle(); if(!v) return; v.maintenanceDist=this.value; store.updateVehicle(v).then(()=>ui.render());" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                            <option value="none" ${(vehicle?.maintenanceDist ?? settings.maintenanceDist)==='none'?'selected':''}>${utils.t('int_none')}</option>
                                            <option value="5000" ${(vehicle?.maintenanceDist ?? settings.maintenanceDist)==='5000'?'selected':''}>${utils.t('int_5k')}</option>
                                            <option value="10000" ${(vehicle?.maintenanceDist ?? settings.maintenanceDist)==='10000'?'selected':''}>${utils.t('int_10k')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('service_interval_time')}</label>
                                        <select onchange="const v=store.getActiveVehicle(); if(!v) return; v.maintenanceTime=this.value; store.updateVehicle(v).then(()=>ui.render());" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                            <option value="none" ${(vehicle?.maintenanceTime ?? settings.maintenanceTime)==='none'?'selected':''}>${utils.t('int_none')}</option>
                                            <option value="6" ${(vehicle?.maintenanceTime ?? settings.maintenanceTime)==='6'?'selected':''}>${utils.t('int_6m')}</option>
                                            <option value="12" ${(vehicle?.maintenanceTime ?? settings.maintenanceTime)==='12'?'selected':''}>${utils.t('int_1yr')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <div class="text-xs font-bold theme-text-heading uppercase tracking-wider">${utils.t('tire_replace')}</div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_interval_dist')} (${utils.getDistUnit()})</label>
                                        <input type="number" min="0" step="100" value="${vehicle?.tireReplaceDist ?? settings.tireReplaceDist ?? 40000}" onchange="const v=store.getActiveVehicle(); if(!v) return; v.tireReplaceDist = parseInt(this.value)||0; store.updateVehicle(v).then(()=>ui.render());" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_interval_time')}</label>
                                        <select onchange="const v=store.getActiveVehicle(); if(!v) return; v.tireReplaceYears = parseInt(this.value)||0; store.updateVehicle(v).then(()=>ui.render());" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                            ${[0,2,3,4,5,6].map(y => `<option value="${y}" ${parseInt(vehicle?.tireReplaceYears ?? settings.tireReplaceYears)==y?'selected':''}>${y===0 ? utils.t('int_none') : y}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-6">
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">App Settings</div>
                            <div class="space-y-4">
                                <div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('units')}</label>
                                    <div class="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                                        <button onclick="store.data.settings.units='metric';store.saveData();ui.render()" class="flex-1 py-1 text-xs rounded-md ${settings.units==='metric'?'bg-white dark:bg-slate-600 shadow':''}">${utils.t('metric')}</button>
                                        <button onclick="store.data.settings.units='imperial';store.saveData();ui.render()" class="flex-1 py-1 text-xs rounded-md ${settings.units==='imperial'?'bg-white dark:bg-slate-600 shadow':''}">${utils.t('imperial')}</button>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('pressure_unit')}</label>
                                    <select onchange="store.data.settings.pressureUnit=this.value;store.saveData();ui.render()" class="w-full p-2 rounded-lg text-sm">
                                        ${['psi','kPa','bar'].map(u => `<option value="${u}" ${(settings.pressureUnit||utils.getPressureUnit())===u?'selected':''}>${utils.t('unit_'+u.toLowerCase())}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('currency')}</label>
                                    <select onchange="store.data.settings.currency=this.value;store.saveData();ui.render()" class="w-full p-2 rounded-lg text-sm">
                                        ${['$','€','£','¥','HK$','A$','NT$'].map(c => `<option value="${c}" ${settings.currency===c?'selected':''}>${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('language')}</label>
                                    <select onchange="store.data.settings.language=this.value;store.saveData();ui.render()" class="w-full p-2 rounded-lg text-sm">
                                        <option value="en" ${settings.language==='en'?'selected':''}>English</option>
                                        <option value="zh" ${settings.language==='zh'?'selected':''}>繁體中文</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 mb-8">
                            <button onclick="ui.exportData()" class="bg-blue-50 text-blue-600 p-4 rounded-xl text-sm font-bold flex flex-col items-center gap-2"><span class="material-icons">download</span> ${utils.t('export_json')}</button>
                            <button onclick="document.getElementById('importFile').click()" class="bg-purple-50 text-purple-600 p-4 rounded-xl text-sm font-bold flex flex-col items-center gap-2"><span class="material-icons">upload</span> ${utils.t('import_json')}</button>
                            <input type="file" id="importFile" class="hidden" accept=".json" onchange="ui.importData(this)">
                            <button onclick="ui.exportCSV()" class="col-span-2 bg-green-50 text-green-600 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><span class="material-icons">table_view</span> ${utils.t('export_csv')}</button>
                        </div>

                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-6 border theme-border">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">${utils.t('install_guide')}</div>
                                    <div class="text-sm theme-text-sub">${utils.t('install_guide_hint')}</div>
                                </div>
                                <button onclick="ui.openInstallGuide()" class="inline-flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-100 dark:bg-teal-900/30 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800">
                                    ${utils.t('view_details')}
                                    <span class="material-icons text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="text-center flex justify-center">
                            <button onclick="ui.openAboutModal()" class="text-teal-600 text-sm font-bold inline-flex items-center justify-center gap-2 opacity-80 hover:opacity-100">
                                <span class="material-icons">info</span> ${utils.t('about')}
                            </button>
                        </div>

                        <div class="mt-4 flex flex-col items-center">
                            <div class="inline-flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200">
                                <span class="material-icons text-base mt-0.5">warning</span>
                                <span class="font-bold">${utils.t('backup_warning')}</span>
                            </div>
                            <div data-app-version class="text-[10px] theme-text-sub mt-2 text-center">${utils.t('version')} v${utils.escapeHtml(FuelMateVersion.current)} • IndexedDB • PWA</div>
                        </div>
                    </div>
                `;
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
                    locHtml = `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(log.location)}" target="_blank" rel="noopener noreferrer" class="text-xs text-sky-500 hover:underline flex items-center gap-1 mt-1" onclick="event.stopPropagation()"><span class="material-icons text-[10px]">place</span>${utils.escapeHtml(log.location)}</a>`;
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
                    <div class="theme-bg-card p-4 rounded-2xl card-shadow relative group">
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
                                <button type="button" data-action="edit-log" data-log-id="${log.id}" onclick="event.stopPropagation(); ui.openLogEditorById('${log.id}')" class="text-slate-300 hover:text-sky-500 mt-2"><span class="material-icons text-lg">edit</span></button>
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
                                <button onclick="router.navigate('${n.id}')" class="liquid-nav-item flex flex-col items-center p-2 w-full transition-colors ${active === n.id ? 'text-teal-700 is-active' : 'text-slate-500'}">
                                    <span class="material-icons ${active === n.id ? 'text-2xl' : 'text-xl'}">${n.icon}</span>
                                    <span class="text-[10px] font-semibold mt-1">${n.label}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            },

            // --- MODALS ---
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
            },

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
                            ${id ? `<button onclick="ui.deleteVehicle('${id}')" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold">${utils.t('delete')}</button>` : ''}
                            <button onclick="ui.saveVehicle('${id || ''}')" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
                        </div>
                        ${id ? `<button onclick="ui.clearVehicleData('${id}')" class="w-full mt-2 text-xs text-red-400 py-2 border border-red-100 rounded-xl hover:bg-red-50">${utils.t('clear_history')}</button>` : ''}
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
                            <button onclick="ui.submitFuel('${id || ''}')" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
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
            },

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
            },
            
            openAddParking(id = null) {
                const log = id ? store.data.logs.find(l => String(l.id) === String(id)) : { date: new Date().toISOString().slice(0, 10), cost: '', location: '', notes: '' };
                this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading flex items-center gap-2"><span class="material-icons text-blue-600">local_parking</span> ${utils.t('add_parking')}</h2>
                    <div class="space-y-4">
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('date')}</label><input id="p_date" type="date" value="${utils.escapeAttr(log.date)}" class="w-full p-3 rounded-xl"></div>
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('cost')}</label><input id="p_cost" type="number" min="0" step="0.01" value="${utils.escapeAttr(log.cost)}" class="w-full p-3 rounded-xl"></div>
                        <div class="relative">
                             <label class="text-xs theme-text-sub block mb-1">${utils.t('location')}</label>
                             <input id="p_loc" type="text" value="${utils.escapeAttr(log.location || '')}" class="w-full p-3 rounded-xl pr-10">
                             <button onclick="utils.detectLocation(l => document.getElementById('p_loc').value=l)" class="absolute right-3 top-8 text-teal-500"><span class="material-icons">my_location</span></button>
                        </div>
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('notes')}</label><textarea id="p_notes" class="w-full p-3 rounded-xl h-20">${utils.escapeHtml(log.notes || '')}</textarea></div>
                        <div class="flex gap-3 mt-4">
                            ${id ? `<button onclick="ui.deleteLog('${id}')" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold">${utils.t('delete')}</button>` : ''}
                            <button onclick="ui.submitParking('${id || ''}')" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
                        </div>
                    </div>
                `);
            },
            
            async submitParking(id) {
                const date = this.validateDateField('p_date');
                const cost = this.validateNumberField('p_cost', { messageKey: 'validation_cost' });
                if (!date || !cost.ok) return;
                const log = {
                    id: id || utils.newId(),
                    vehicleId: store.data.settings.activeVehicleId,
                    type: 'parking',
                    date,
                    cost: cost.value,
                    location: document.getElementById('p_loc').value.trim(),
                    notes: document.getElementById('p_notes').value.trim()
                };
                if (id) await store.updateLog(log);
                else await store.addLog(log);
                this.closeModal();
                this.render();
            },

            deleteLog(id) {
                setTimeout(() => {
                    if (confirm(utils.t('confirm_delete'))) {
                        store.deleteLog(id).then(() => {
                            this.closeModal();
                            this.render();
                        });
                    }
                }, 50);
            },
            
            // --- EXPORT / IMPORT / SELECTORS ---
            snoozeReminder(id, days) {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                rc.done = rc.done || {};
                rc.snoozedUntil[id] = new Date(Date.now() + (days * 86400000)).toISOString();
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

            snoozeAllReminders(days) {
                const vehicle = store.getActiveVehicle();
                if (!vehicle) return;
                const { activeItems } = this.getReminderData(vehicle);
                if (!activeItems.length) return;
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                rc.done = rc.done || {};
                const until = new Date(Date.now() + (days * 86400000)).toISOString();
                activeItems.forEach(it => {
                    rc.snoozedUntil[it.id] = until;
                });
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

            markReminderDone(id) {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                rc.done = rc.done || {};
                rc.done[id] = true;
                delete rc.snoozedUntil[id];
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

            clearDoneReminders() {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                rc.done = {};
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

            restoreReminder(id) {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                rc.done = rc.done || {};
                delete rc.done[id];
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

            unsnoozeReminder(id) {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                delete rc.snoozedUntil[id];
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

            downloadBackup(filenamePrefix = 'fuelmate_backup') {
                const json = JSON.stringify(store.data);
                const blob = new Blob([json], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const ts = new Date().toISOString().replace(/[:]/g, '').slice(0, 15);
                a.download = `${filenamePrefix}_${ts}.json`;
                a.click();
                return a.download;
            },

            exportData() {
                const json = JSON.stringify(store.data);
                const blob = new Blob([json], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fuelmate_backup_${new Date().toISOString().slice(0,10)}.json`;
                a.click();
                
                // Update backup date
                store.data.settings.lastBackupDate = new Date().toISOString();
                store.saveData();
                this.render();
            },
            
            exportCSV() { utils.exportCSV(); },

            importData(input) {
                const file = input.files[0];
                if (!file) return;
                
                const fileName = file.name || 'backup.json';
                const fileSize = file.size || 0;

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        const validation = utils.validateImportData(data);
                        if (!validation.ok) {
                            alert(utils.t('import_invalid'));
                            input.value = '';
                            return;
                        }

                        const currentSummary = utils.summarizeImportData(store.data);
                        const incomingSummary = validation.summary;
                        const topTypes = (counts) => Object.entries(counts)
                            .sort((a,b) => b[1]-a[1])
                            .slice(0, 6)
                            .map(([k,v]) => `${k}: ${v}`)
                            .join(', ');

                        const warningText = validation.warnings?.some(w => w.code === 'orphan_logs')
                            ? `<div class="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">${utils.t('import_warn')} (${validation.warnings.find(w=>w.code==='orphan_logs').count} orphan logs)</div>`
                            : `<div class="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">${utils.t('import_warn')}</div>`;

                        ui.openModal(`
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <h2 class="text-xl font-bold theme-text-heading">${utils.t('import_summary')}</h2>
                                    <button onclick="ui.closeModal()" class="text-slate-400"><span class="material-icons">close</span></button>
                                </div>

                                ${warningText}

                                <div class="theme-bg-card p-4 rounded-2xl border theme-border">
                                    <div class="text-xs theme-text-sub uppercase tracking-wider mb-2">${utils.t('import_file')}</div>
                                    <div class="font-bold theme-text-heading">${fileName}</div>
                                    <div class="text-xs theme-text-sub">${utils.formatFileSize(fileSize)}</div>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="theme-bg-card p-4 rounded-2xl border theme-border">
                                        <div class="text-xs theme-text-sub uppercase tracking-wider mb-2">${utils.t('import_current')}</div>
                                        <div class="text-sm font-bold theme-text-heading">${utils.t('import_counts')}: ${currentSummary.vehiclesCount} / ${currentSummary.logsCount}</div>
                                        <div class="text-xs theme-text-sub mt-1">${utils.t('import_types')}: ${topTypes(currentSummary.typeCounts) || '--'}</div>
                                    </div>
                                    <div class="theme-bg-card p-4 rounded-2xl border theme-border">
                                        <div class="text-xs theme-text-sub uppercase tracking-wider mb-2">${utils.t('import_incoming')}</div>
                                        <div class="text-sm font-bold theme-text-heading">${utils.t('import_counts')}: ${incomingSummary.vehiclesCount} / ${incomingSummary.logsCount}</div>
                                        <div class="text-xs theme-text-sub mt-1">${utils.t('import_types')}: ${topTypes(incomingSummary.typeCounts) || '--'}</div>
                                    </div>
                                </div>

                                <div class="theme-bg-card p-4 rounded-2xl border theme-border">
                                    <div class="text-xs theme-text-sub uppercase tracking-wider mb-2">${utils.t('import_settings')}</div>
                                    <div class="text-xs theme-text-sub">
                                        units: ${incomingSummary.settings.units || '--'} • currency: ${incomingSummary.settings.currency || '--'} • language: ${incomingSummary.settings.language || '--'}
                                    </div>
                                </div>

                                <div class="flex gap-3">
                                    <button onclick="ui.closeModal()" class="flex-1 bg-slate-100 dark:bg-slate-800 theme-text-heading py-3 rounded-xl font-bold">${utils.t('cancel')}</button>
                                    <button id="confirm_import_btn" class="flex-1 grad-teal text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('import_overwrite')}</button>
                                </div>
                            </div>
                        `);

                        document.getElementById('confirm_import_btn').onclick = async () => {
                            try {
                                const backupName = ui.downloadBackup('fuelmate_autobackup');
                                store.data.settings.lastBackupDate = new Date().toISOString();
                                await store.saveData();

                                await store.importData(data, { overwrite: true });
                                alert(`${utils.t('import_autobackup')} ${backupName}\n${utils.t('success_import')}`);
                                location.reload();
                            } catch (err) {
                                console.error(err);
                                alert(utils.t('err_file'));
                            }
                        };
                    } catch (err) {
                        console.error(err);
                        alert(utils.t('err_file'));
                    } finally {
                        input.value = '';
                    }
                };
                reader.readAsText(file);
            },
            
            openVehicleSelector() {
                 this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading">${utils.t('select_vehicle')}</h2>
                    <div class="space-y-2">
                        ${store.data.vehicles.map(v => `
                            <button onclick="store.data.settings.activeVehicleId='${v.id}'; store.saveData(); ui.closeModal(); ui.render();" class="w-full p-4 rounded-xl flex items-center gap-3 ${store.data.settings.activeVehicleId === v.id ? 'bg-teal-50 border-teal-500 border' : 'bg-slate-50 border theme-border'}">
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
            },
            
            openCalendarSelector() {
                this.openModal(`
                    <h2 class="text-xl font-bold mb-4 theme-text-heading">${utils.t('select_export')}</h2>
                    <div class="space-y-3">
                        <button onclick="ui.openCalendarConfig('license')" class="w-full p-4 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-between">
                            <span class="flex items-center gap-2"><span class="material-icons">badge</span> ${utils.t('license')}</span>
                            <span class="material-icons">chevron_right</span>
                        </button>
                        <button onclick="ui.openCalendarConfig('insurance')" class="w-full p-4 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-between">
                            <span class="flex items-center gap-2"><span class="material-icons">security</span> ${utils.t('insurance')}</span>
                            <span class="material-icons">chevron_right</span>
                        </button>
                        <button onclick="ui.openCalendarConfig('registration')" class="w-full p-4 rounded-xl bg-purple-50 text-purple-700 font-bold flex items-center justify-between">
                            <span class="flex items-center gap-2"><span class="material-icons">directions_car</span> ${utils.t('registration')}</span>
                            <span class="material-icons">chevron_right</span>
                        </button>
                    </div>
                `);
            },
            
            openCalendarConfig(type) {
                this.openModal(`
                    <h2 class="text-xl font-bold mb-2 theme-text-heading">${utils.t('export_calendar')}</h2>
                    <p class="text-sm theme-text-sub mb-4">${utils.t(type)}</p>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block theme-text-sub">${utils.t('reminder_time')}</label>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="utils.exportCalendar('${type}', null); ui.closeModal()" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_none')}</button>
                        <button onclick="utils.exportCalendar('${type}', 0); ui.closeModal()" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_day')}</button>
                        <button onclick="utils.exportCalendar('${type}', 7); ui.closeModal()" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_1w')}</button>
                        <button onclick="utils.exportCalendar('${type}', 30); ui.closeModal()" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_1m')}</button>
                    </div>
                `);
            },

            openReminderCalendarSelector({ title, dateIso, type } = {}) {
                const titleEnc = encodeURIComponent(title || '');
                const dateEnc = encodeURIComponent(dateIso || '');
                const typeEnc = encodeURIComponent(type || '');
                this.openModal(`
                    <h2 class="text-xl font-bold mb-2 theme-text-heading">${utils.t('export_calendar')}</h2>
                    <p class="text-sm theme-text-sub mb-4">${utils.escapeHtml(type ? utils.t(type) : (title || ''))}</p>
                    <label class="text-xs font-bold uppercase tracking-wider mb-2 block theme-text-sub">${utils.t('reminder_time')}</label>
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="ui.applyReminderCalendar('${typeEnc}','${dateEnc}','${titleEnc}', null)" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_none')}</button>
                        <button onclick="ui.applyReminderCalendar('${typeEnc}','${dateEnc}','${titleEnc}', 0)" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_day')}</button>
                        <button onclick="ui.applyReminderCalendar('${typeEnc}','${dateEnc}','${titleEnc}', 7)" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_1w')}</button>
                        <button onclick="ui.applyReminderCalendar('${typeEnc}','${dateEnc}','${titleEnc}', 30)" class="p-3 rounded-xl border theme-border font-medium text-sm hover:bg-slate-50">${utils.t('rem_1m')}</button>
                    </div>
                `);
            },

            applyReminderCalendar(typeEnc, dateEnc, titleEnc, alarmDays) {
                const type = decodeURIComponent(typeEnc || '');
                const dateIso = decodeURIComponent(dateEnc || '');
                const title = decodeURIComponent(titleEnc || '');
                if (type) utils.exportCalendar(type, alarmDays);
                else utils.exportDateCalendar(title, dateIso, alarmDays);
                this.closeModal();
            },
            
            openAboutModal() {
                const lang = store.data.settings.language || 'en';
                const isZh = lang === 'zh';
                const title = isZh ? 'FuelMate（本地優先 PWA）' : 'FuelMate (Local-first PWA)';
                const subtitle = isZh
                    ? `v${FuelMateVersion.current}（IndexedDB 版本）`
                    : `v${FuelMateVersion.current} (IndexedDB Edition)`;
                const intro = isZh
                    ? 'FuelMate 將所有用車開支與提醒集中管理：加油、維修、停車、罰單、證件到期與輪胎保養。資料本地優先、可離線使用，並支援備份與匯入。'
                    : 'FuelMate brings all car costs and reminders into one place—fuel, maintenance, parking, fines, document expiry, and tire care. Local-first by default, works offline, with backup and import support.';
                const featuresTitle = isZh ? '主要功能' : 'Key Features';
                const specsTitle = isZh ? '重點設計' : 'Design Notes';
                const footer = isZh ? '提示：請定期備份；清除瀏覽器快取會刪除本機資料。' : 'Tip: back up regularly; clearing browser cache can remove local data.';
                const features = isZh
                    ? [
                        '多車管理：里程、車型與保養間隔分車儲存',
                        '加油記錄：單價/金額/升數互算；Full/Partial 油耗',
                        '維修/保養/停車/罰單：統一搜尋與日期篩選',
                        '輪胎管理：四輪獨立追蹤、更換/換位、胎壓/胎紋',
                        '提醒中心：輪胎/證件/定期保養整合，支援延後/完成/加入日曆',
                        'JSON/CSV 匯出；匯入前自動備份 + 匯入摘要'
                    ]
                    : [
                        'Multi-vehicle profiles with per-car intervals',
                        'Fuel logs with smart Price/Cost/Volume and Full/Partial efficiency',
                        'Maintenance/Parking/Fines with unified search & date filters',
                        'Tire management: per-tire tracking, replace/rotate, pressure & tread',
                        'Reminder Center with snooze/done and calendar export',
                        'JSON/CSV export plus safer import with auto-backup and summary'
                    ];
                const specs = isZh
                    ? [
                        '本地優先：IndexedDB 儲存（無需登入/伺服器）',
                        'PWA 可安裝到主畫面；離線仍可查看/新增'
                    ]
                    : [
                        'Local-first storage via IndexedDB (no login, no server required)',
                        'Installable PWA; works offline for viewing and adding logs'
                    ];
                

                 this.openModal(`
                    <div class="text-center p-4">
                        <div class="w-20 h-20 mx-auto rounded-3xl grad-teal flex items-center justify-center text-white shadow-xl mb-4">
                            <span class="material-icons text-5xl">local_gas_station</span>
                        </div>
                        <h2 class="text-2xl font-black theme-text-heading mb-1">${title}</h2>
                        <div class="text-sm theme-text-sub mb-3">${subtitle}</div>
                        <div class="text-sm theme-text-sub mb-6">${intro}</div>
                        
                        <div class="text-left space-y-4 text-sm theme-text-heading bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                            <h3 class="font-bold border-b pb-2 mb-2">${featuresTitle}</h3>
                            <ul class="list-disc pl-5 space-y-1 opacity-80">
                                ${features.map(f => `<li>${f}</li>`).join('')}
                            </ul>
                            
                            <h3 class="font-bold border-b pb-2 mb-2 mt-4">${specsTitle}</h3>
                            <ul class="list-disc pl-5 space-y-1 opacity-80">
                                ${specs.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="mt-6 text-xs text-slate-400">${footer}</div>
                    </div>
                 `);
            },

            openInstallGuide() {
                const lang = store.data.settings.language || 'en';
                const isZh = lang === 'zh';
                const title = utils.t('install_guide');
                const intro = isZh
                    ? '將 FuelMate 加到主畫面，可像 App 一樣開啟，離線也能用。'
                    : 'Add FuelMate to your home screen for an app-like experience with offline access.';
                const stepsTitle = isZh ? '安裝步驟' : 'Steps';
                const steps = isZh
                    ? [
                        'iOS 用「分享」→「加入主畫面」安裝',
                        'Android 用「瀏覽器選單」→「安裝應用程式」'
                    ]
                    : [
                        'iOS: Share → Add to Home Screen',
                        'Android: Browser menu → Install App'
                    ];
                const note = isZh
                    ? '提示：建議用主畫面圖示開啟，以保留離線能力。'
                    : 'Tip: Launch from the home screen icon to keep offline support.';
                this.openModal(`
                    <div class="p-2">
                        <h2 class="text-xl font-bold mb-2 theme-text-heading">${title}</h2>
                        <p class="text-sm theme-text-sub mb-4">${intro}</p>
                        <div class="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                            <div class="text-xs font-bold uppercase tracking-wider theme-text-sub mb-2">${stepsTitle}</div>
                            <ul class="list-disc pl-5 space-y-2 text-sm theme-text-heading">
                                ${steps.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="mt-4 text-xs text-slate-400">${note}</div>
                    </div>
                `);
            }
        };
