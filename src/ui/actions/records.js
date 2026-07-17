// FuelMate UI module: actions/records
Object.assign(ui, {
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
                             <button data-action="ui" data-ui-method="detectLocationFor" data-ui-args="${encodeURIComponent(JSON.stringify(['p_loc']))}" class="absolute right-3 top-8 text-teal-500"><span class="material-icons">my_location</span></button>
                        </div>
                        <div><label class="text-xs theme-text-sub block mb-1">${utils.t('notes')}</label><textarea id="p_notes" class="w-full p-3 rounded-xl h-20">${utils.escapeHtml(log.notes || '')}</textarea></div>
                        <div class="flex gap-3 mt-4">
                            ${id ? `<button data-action="ui" data-ui-method="deleteLog" data-ui-args="${encodeURIComponent(JSON.stringify([id]))}" class="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold">${utils.t('delete')}</button>` : ''}
                            <button data-action="ui" data-ui-method="submitParking" data-ui-args="${encodeURIComponent(JSON.stringify([id || '']))}" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">${utils.t('save')}</button>
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

getReminderStateIds(id) {
                const item = this.getReminderById(id);
                return [id, ...(item?.legacyIds || [])];
            },

getReminderById(id) {
                return this.getReminderCenterData('all').items.find(item => item.id === id) || null;
            },

setReminderTab(tab) {
                if (!['active', 'snoozed', 'done'].includes(tab)) return;
                store.pageFilters.remindersTab = tab;
                store.pageFilters.reminderSelectionMode = false;
                store.pageFilters.reminderSelection = [];
                this.render();
            },

setReminderCategory(category) {
                if (!['all', 'tire', 'service', 'docs', 'backup'].includes(category)) return;
                store.pageFilters.remindersCategory = category;
                store.pageFilters.reminderSelection = [];
                this.render();
            },

setReminderUrgency(urgency) {
                if (!['overdue', 'due', 'upcoming'].includes(urgency)) return;
                store.pageFilters.remindersUrgency = store.pageFilters.remindersUrgency === urgency ? 'all' : urgency;
                store.pageFilters.reminderSelection = [];
                this.render();
            },

toggleReminderSelectionMode() {
                store.pageFilters.reminderSelectionMode = !store.pageFilters.reminderSelectionMode;
                store.pageFilters.reminderSelection = [];
                this.render();
            },

toggleReminderSelection(id) {
                const selected = new Set(store.pageFilters.reminderSelection || []);
                if (selected.has(id)) selected.delete(id); else selected.add(id);
                store.pageFilters.reminderSelection = Array.from(selected);
                this.render();
            },

async applyReminderStateBatch(ids, action, days = 0) {
                const uniqueIds = [...new Set(ids)].filter(id => this.getReminderById(id));
                if (!uniqueIds.length) return;
                const current = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                const rc = {
                    snoozedUntil: { ...(current.snoozedUntil || {}) },
                    done: { ...(current.done || {}) }
                };
                const until = action === 'snooze' ? new Date(Date.now() + days * 86400000).toISOString() : null;
                uniqueIds.forEach(id => {
                    this.getReminderStateIds(id).forEach(stateId => {
                        delete rc.snoozedUntil[stateId];
                        delete rc.done[stateId];
                    });
                    if (action === 'snooze') rc.snoozedUntil[id] = until;
                    if (action === 'done') rc.done[id] = true;
                });
                store.data.settings.reminderCenter = rc;
                await store.saveData();
                store.pageFilters.reminderSelection = [];
                store.pageFilters.reminderSelectionMode = false;
                this.render();
            },

bulkSnoozeSelectedReminders(days) {
                return this.applyReminderStateBatch(store.pageFilters.reminderSelection || [], 'snooze', days);
            },

bulkCompleteSelectedReminders() {
                return this.applyReminderStateBatch(store.pageFilters.reminderSelection || [], 'done');
            },

openReminderDetails(id) {
                const item = this.getReminderById(id);
                if (!item) return;
                const data = this.getReminderCenterData('all');
                const isDone = data.doneItems.some(candidate => candidate.id === id);
                const isSnoozed = data.snoozedItems.some(candidate => candidate.id === id);
                const tone = item.urgency === 'overdue' ? 'red' : (item.urgency === 'due' ? 'amber' : 'blue');
                const args = utils.escapeAttr(encodeURIComponent(JSON.stringify([id])));
                const distance = Number.isFinite(item.remainingKm)
                    ? `${Math.abs(Math.round(item.remainingKm)).toLocaleString()} ${utils.getDistUnit()}` : '';
                const days = Number.isFinite(item.remainingDays) ? utils.formatDaysShort(Math.abs(item.remainingDays)) : '';
                this.openModal(`
                    <div data-testid="reminder-detail" class="space-y-4">
                        <div class="w-12 h-1 rounded-full bg-slate-300 mx-auto -mt-2"></div>
                        <div class="flex items-center justify-between">
                            <h2 class="text-xl font-black theme-text-heading">${utils.t('reminder_details')}</h2>
                            <button data-action="ui" data-ui-method="closeModal" class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800"><span class="material-icons">close</span></button>
                        </div>
                        <div class="flex items-start gap-3">
                            <div class="w-14 h-14 rounded-full bg-${tone}-50 dark:bg-${tone}-900/30 text-${tone}-600 flex items-center justify-center"><span class="material-icons text-2xl">${item.icon}</span></div>
                            <div class="min-w-0 flex-1"><div class="text-lg font-black theme-text-heading">${utils.escapeHtml(item.title)}</div><div class="text-xs theme-text-sub mt-1">${utils.escapeHtml(item.vehicleLabel || '')} • ${utils.t('reminder_' + item.category)}</div></div>
                            <div class="text-sm font-black text-${tone}-600 text-right">${utils.escapeHtml(item.meta || '')}</div>
                        </div>
                        <section class="rounded-2xl border theme-border overflow-hidden">
                            <div class="px-4 py-3 text-xs font-black uppercase tracking-wider theme-text-sub">${utils.t('due_conditions')}</div>
                            ${distance ? `<div class="px-4 py-3 border-t theme-border flex items-center gap-3"><span class="material-icons text-teal-600">route</span><div class="flex-1 text-sm font-bold theme-text-heading">${utils.t('distance_condition')}</div><div class="text-sm font-black text-${tone}-600">${item.remainingKm <= 0 ? utils.t('over_by') : utils.t('remaining')} ${distance}</div></div>` : ''}
                            ${days ? `<div class="px-4 py-3 border-t theme-border flex items-center gap-3"><span class="material-icons text-teal-600">calendar_month</span><div class="flex-1 text-sm font-bold theme-text-heading">${utils.t('date_condition')}</div><div class="text-sm font-black text-${tone}-600">${item.remainingDays <= 0 ? utils.t('over_by') : utils.t('remaining')} ${days}</div></div>` : ''}
                            ${item.dueDateIso ? `<div class="px-4 py-3 border-t theme-border flex items-center gap-3"><span class="material-icons text-teal-600">event</span><div class="flex-1 text-sm font-bold theme-text-heading">${utils.t('due_date')}</div><div class="text-sm theme-text-sub">${utils.formatDate(item.dueDateIso)}</div></div>` : ''}
                        </section>
                        <section class="rounded-2xl border theme-border divide-y theme-border">
                            <button data-action="ui" data-ui-method="openReminderSource" data-ui-args="${args}" class="w-full min-h-14 px-4 flex items-center gap-3 text-left"><span class="material-icons text-teal-600">description</span><div class="flex-1"><div class="text-xs theme-text-sub">${utils.t('source_record')}</div><div class="text-sm font-bold theme-text-heading">${item.sourceLogId ? utils.t('view_source_record') : utils.t('reminder_action')}</div></div><span class="material-icons text-slate-400">chevron_right</span></button>
                            <div class="min-h-14 px-4 flex items-center gap-3"><span class="material-icons text-teal-600">autorenew</span><div class="flex-1"><div class="text-xs theme-text-sub">${utils.t('repeat_rule')}</div><div class="text-sm font-bold theme-text-heading">${utils.escapeHtml(item.repeatLabel || utils.t('not_applicable'))}</div></div></div>
                        </section>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <button data-action="ui" data-ui-method="openReminderSource" data-ui-args="${args}" class="min-h-12 rounded-xl border border-teal-700 text-teal-700 font-bold text-xs"><span class="material-icons text-base align-middle mr-1">edit</span>${utils.t('edit_record')}</button>
                            ${(item.calendarType || item.dueDateIso) ? `<button data-action="reminder-calendar" data-title="${utils.escapeAttr(encodeURIComponent(item.calendarTitle || item.title || ''))}" data-date="${utils.escapeAttr(item.dueDateIso || '')}" data-type="${utils.escapeAttr(item.calendarType || '')}" class="min-h-12 rounded-xl border border-teal-700 text-teal-700 font-bold text-xs"><span class="material-icons text-base align-middle mr-1">event</span>${utils.t('export_calendar')}</button>` : ''}
                            ${isDone
                                ? `<button data-action="ui" data-ui-method="restoreReminderFromDetails" data-ui-args="${args}" class="min-h-12 rounded-xl bg-teal-700 text-white font-bold text-xs">${utils.t('restore')}</button>`
                                : `<button data-action="ui" data-ui-method="snoozeReminderFromDetails" data-ui-args="${utils.escapeAttr(encodeURIComponent(JSON.stringify([id, 7])))}" class="min-h-12 rounded-xl border border-teal-700 text-teal-700 font-bold text-xs">${isSnoozed ? utils.t('snooze_again') : utils.t('snooze_7d')}</button><button data-action="ui" data-ui-method="completeReminderFromDetails" data-ui-args="${args}" class="min-h-12 rounded-xl bg-teal-700 text-white font-bold text-xs">${utils.t('mark_done')}</button>`}
                        </div>
                    </div>
                `);
            },

async openReminderSource(id) {
                const item = this.getReminderById(id);
                if (!item) return;
                this.closeModal();
                if (item.category === 'backup') return this.exportData();
                if (item.vehicleId && store.data.settings.activeVehicleId !== item.vehicleId) {
                    store.data.settings.activeVehicleId = item.vehicleId;
                    await store.saveData();
                }
                if (item.sourceLogId) return this.openLogEditorById(item.sourceLogId);
                if (item.category === 'tire') return this.openQuickTireSetup(item.tirePosition);
                return this.openAddService(null, item.category === 'service' ? 'periodic_maintenance' : 'service');
            },

async snoozeReminderFromDetails(id, days) {
                this.closeModal();
                await this.applyReminderStateBatch([id], 'snooze', days);
            },

async completeReminderFromDetails(id) {
                this.closeModal();
                await this.applyReminderStateBatch([id], 'done');
            },

async restoreReminderFromDetails(id) {
                this.closeModal();
                const current = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                current.snoozedUntil = current.snoozedUntil || {};
                current.done = current.done || {};
                this.getReminderStateIds(id).forEach(stateId => delete current.done[stateId]);
                store.data.settings.reminderCenter = current;
                await store.saveData();
                this.render();
            },

snoozeReminder(id, days) {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                rc.done = rc.done || {};
                this.getReminderStateIds(id).forEach(stateId => {
                    delete rc.snoozedUntil[stateId];
                    delete rc.done[stateId];
                });
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
                    [it.id, ...(it.legacyIds || [])].forEach(stateId => {
                        delete rc.snoozedUntil[stateId];
                        delete rc.done[stateId];
                    });
                    rc.snoozedUntil[it.id] = until;
                });
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

markReminderDone(id) {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                rc.done = rc.done || {};
                this.getReminderStateIds(id).forEach(stateId => {
                    delete rc.snoozedUntil[stateId];
                    delete rc.done[stateId];
                });
                rc.done[id] = true;
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
                this.getReminderStateIds(id).forEach(stateId => delete rc.done[stateId]);
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            },

unsnoozeReminder(id) {
                const rc = store.data.settings.reminderCenter || { snoozedUntil: {}, done: {} };
                rc.snoozedUntil = rc.snoozedUntil || {};
                this.getReminderStateIds(id).forEach(stateId => delete rc.snoozedUntil[stateId]);
                store.data.settings.reminderCenter = rc;
                store.saveData().then(() => this.render());
            }
});
