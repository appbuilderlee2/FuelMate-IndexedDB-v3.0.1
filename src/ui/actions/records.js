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
                const vehicle = store.getActiveVehicle();
                const item = vehicle
                    ? this.getReminderData(vehicle, { includeAll: true }).items.find(candidate => candidate.id === id)
                    : null;
                return [id, ...(item?.legacyIds || [])];
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
