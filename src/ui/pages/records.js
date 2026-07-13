// FuelMate UI module: pages/records
Object.assign(ui, {
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
                        <button data-testid="add-fuel" onclick="ui.openAddFuel()" class="fixed bottom-[calc(130px+var(--safe-bottom))] right-6 w-14 h-14 rounded-full grad-teal text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform z-50">
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
            }
});
