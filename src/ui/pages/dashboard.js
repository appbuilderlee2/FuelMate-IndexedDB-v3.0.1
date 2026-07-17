// FuelMate UI module: pages/dashboard
Object.assign(ui, {
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
                                        <div data-testid="dashboard-reminder" data-reminder-id="${utils.escapeAttr(it.id)}" class="p-3 rounded-2xl border theme-border bg-${tone}-50 dark:bg-${tone}-900/20">
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
                const now = options.now ? new Date(options.now) : new Date();
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
                const tireStatuses = utils.getTireReplacementStatus(vehicle);
                const addTireReminder = (s) => {
                    const id = s.isNotSet
                        ? `tire:${vehicle.id}:unset:${s.pos}`
                        : `tire:${vehicle.id}:asset:${s.editLogId}`;
                    const legacyIds = s.isNotSet
                        ? [`tire:${vehicle.id}:${s.pos}:none`, `tire:${vehicle.id}:next:${s.pos}`]
                        : [
                            ...utils.getTirePositions().map(pos => `tire:${vehicle.id}:${pos}:${s.editLogId}`),
                            ...utils.getTirePositions().map(pos => `tire:${vehicle.id}:next:${pos}`)
                        ];
                    items.push({
                        id,
                        legacyIds,
                        icon: 'tire_repair',
                        title: `${utils.t('next_tire_change')} • ${utils.t('tire_' + s.pos)}`,
                        meta: [s.primary, s.secondary].filter(Boolean).join(' • '),
                        dueDateIso: s.dueDateIso,
                        remainingKm: s.remainingKm,
                        remainingDays: s.remainingDays,
                        tirePosition: s.pos,
                        sourceLogId: s.editLogId,
                        repeatLabel: `${vehicle?.tireReplaceDist ?? store.data.settings.tireReplaceDist ?? 0} ${utils.getDistUnit()} / ${vehicle?.tireReplaceYears ?? store.data.settings.tireReplaceYears ?? 0} ${utils.t('years')}`,
                        calendarTitle: `${utils.t('next_tire_change')} • ${utils.t('tire_' + s.pos)}: ${vehicleLabel}`,
                        editAction: s.isNotSet
                            ? `ui.openQuickTireSetup('${s.pos}')`
                            : (s.editLogId
                                ? `ui.openAddService('${s.editLogId}')`
                                : `ui.openAddService(null,'tire_replace'); setTimeout(() => { const el=document.getElementById('l_tire_pos'); if (el) el.value='${s.pos}'; }, 60);`)
                    });
                };
                let configuredReminderCount = 0;
                for (const s of tireStatuses.filter(status => !status.isNotSet)) {
                    const near =
                        s.isOverdue ||
                        (s.remainingKm !== null && s.remainingKm <= tireThresholdKm) ||
                        (s.remainingDays !== null && s.remainingDays <= tireThresholdDays);
                    if (!includeAll && !near) continue;
                    addTireReminder(s);
                    configuredReminderCount += 1;
                }
                const unsetStatuses = tireStatuses.filter(s => s.isNotSet);
                if (includeAll) {
                    unsetStatuses.forEach(addTireReminder);
                } else if (unsetStatuses.length) {
                    // Always keep one setup action visible until all four positions are configured.
                    addTireReminder(unsetStatuses[0]);
                }
                if (!includeAll && configuredReminderCount === 0 && unsetStatuses.length === 0) {
                    const byDays = tireStatuses.filter(s => !s.isNotSet && s.remainingDays !== null);
                    const byKm = tireStatuses.filter(s => !s.isNotSet && s.remainingKm !== null);
                    const candidate = byDays.length
                        ? byDays.sort((a, b) => (a.remainingDays || 0) - (b.remainingDays || 0))[0]
                        : (byKm.length ? byKm.sort((a, b) => (a.remainingKm || 0) - (b.remainingKm || 0))[0] : null);
                    const candidateIsNear = candidate && (
                        (candidate.remainingDays !== null && candidate.remainingDays <= 180) ||
                        (candidate.remainingKm !== null && candidate.remainingKm <= tireThresholdKm * 3)
                    );
                    if (candidateIsNear) addTireReminder(candidate);
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
                        remainingDays: days,
                        sourceLogId: latest.id,
                        repeatLabel: `${setting?.days || 30} ${utils.t('days_before')}`,
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
                const baselineOdo = Number.isFinite(parseFloat(vehicle.maintenanceBaselineOdometer))
                    ? parseFloat(vehicle.maintenanceBaselineOdometer)
                    : null;
                const lastOdo = lastService ? parseFloat(lastService.odometer) || 0 : baselineOdo;
                const baselineDate = vehicle.maintenanceBaselineDate ? new Date(vehicle.maintenanceBaselineDate) : null;
                const lastDate = lastService ? new Date(lastService.date) : baselineDate;
                if (distInt > 0 && lastOdo !== null) {
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
                            sourceLogId: lastService?.id || null,
                            repeatLabel: `${distInt.toLocaleString()} ${utils.getDistUnit()}`,
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
                            sourceLogId: lastService?.id || null,
                            repeatLabel: `${timeInt} ${utils.t('months')}`,
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
                                return (timeItem.remainingDays / 30) <= (distItem.remainingKm / 500);
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
                            remainingDays: timeItem.remainingDays,
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
                    const monthMs = 30 * 86400000;
                    const backupCycle = store.data.settings.lastBackupDate
                        ? `${new Date(store.data.settings.lastBackupDate).toISOString().slice(0, 10)}:${Math.max(1, Math.floor((now - new Date(store.data.settings.lastBackupDate)) / monthMs))}`
                        : `initial:${now.toISOString().slice(0, 7)}`;
                    const id = `backup:${backupCycle}`;
                    items.push({
                        id,
                        icon: 'cloud_upload',
                        title: utils.t('backup_needed'),
                        meta: utils.t('backup_desc'),
                        dueDateIso: null,
                        remainingDays: store.data.settings.lastBackupDate
                            ? -Math.floor((now - new Date(store.data.settings.lastBackupDate)) / 86400000 - 30)
                            : 0,
                        repeatLabel: `30 ${utils.t('days')}`,
                        editAction: `ui.exportData(); ui.render();`
                    });
                }

                items.forEach(it => {
                    it.category = it.id.startsWith('tire:') ? 'tire'
                        : it.id.startsWith('svc:') ? 'service'
                            : it.id.startsWith('doc:') ? 'docs' : 'backup';
                    const overdue = (Number.isFinite(it.remainingDays) && it.remainingDays <= 0)
                        || (Number.isFinite(it.remainingKm) && it.remainingKm <= 0)
                        || (it.meta || '').toLowerCase().includes(utils.t('overdue').toLowerCase());
                    const dueSoon = (Number.isFinite(it.remainingDays) && it.remainingDays <= 30)
                        || (Number.isFinite(it.remainingKm) && it.remainingKm <= 500)
                        || it.category === 'backup';
                    it.urgency = overdue ? 'overdue' : (dueSoon ? 'due' : 'upcoming');
                    it.vehicleLabel = vehicleLabel;
                });

                const stateIds = (it) => [it.id, ...(it.legacyIds || [])];
                const isDone = (it) => stateIds(it).some(id => done[id] === true);
                const getSnooze = (it) => stateIds(it)
                    .map(id => snoozedUntil[id])
                    .filter(value => value && !Number.isNaN(new Date(value).getTime()))
                    .sort((a, b) => new Date(b) - new Date(a))[0] || null;
                const activeItems = items.filter(it => !isDone(it) && (!getSnooze(it) || new Date(getSnooze(it)) <= now));
                const snoozedItems = items.filter(it => !isDone(it) && getSnooze(it) && new Date(getSnooze(it)) > now);
                const doneItems = items.filter(isDone);
                const effectiveSnoozedUntil = { ...snoozedUntil };
                const effectiveDone = { ...done };
                items.forEach(it => {
                    const until = getSnooze(it);
                    if (until) effectiveSnoozedUntil[it.id] = until;
                    if (isDone(it)) effectiveDone[it.id] = true;
                });

                return { items, activeItems, snoozedItems, doneItems, snoozedUntil: effectiveSnoozedUntil, done: effectiveDone };
            }
});
