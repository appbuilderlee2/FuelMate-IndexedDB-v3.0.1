// FuelMate UI module: pages/reminders
Object.assign(ui, {
renderReminders(vehicle) {
                const data = this.getReminderData(vehicle, { includeAll: true });
                const tab = store.pageFilters.remindersTab || 'active';
                const category = store.pageFilters.remindersCategory || 'all';
                const urgency = store.pageFilters.remindersUrgency || 'all';
                const selectionMode = tab === 'active' && !!store.pageFilters.reminderSelectionMode;
                const selected = new Set(store.pageFilters.reminderSelection || []);
                const tabItems = tab === 'snoozed' ? data.snoozedItems : (tab === 'done' ? data.doneItems : data.activeItems);
                const categoryItems = category === 'all' ? tabItems : tabItems.filter(item => item.category === category);
                const visible = (urgency === 'all' ? categoryItems : categoryItems.filter(item => item.urgency === urgency))
                    .slice()
                    .sort((a, b) => {
                        const rank = { overdue: 0, due: 1, upcoming: 2 };
                        if (rank[a.urgency] !== rank[b.urgency]) return rank[a.urgency] - rank[b.urgency];
                        const aTime = a.dueDateIso ? new Date(a.dueDateIso).getTime() : Number.POSITIVE_INFINITY;
                        const bTime = b.dueDateIso ? new Date(b.dueDateIso).getTime() : Number.POSITIVE_INFINITY;
                        return (aTime - bTime) || (a.title || '').localeCompare(b.title || '');
                    });
                const activeCounts = { overdue: 0, due: 0, upcoming: 0 };
                data.activeItems.forEach(item => { activeCounts[item.urgency] += 1; });
                const categoryDefs = [
                    ['all', 'check_circle', 'reminder_all'], ['tire', 'tire_repair', 'reminder_tires'],
                    ['service', 'build', 'reminder_service'], ['docs', 'description', 'reminder_docs'],
                    ['backup', 'cloud_done', 'reminder_backup']
                ];
                const groups = ['overdue', 'due', 'upcoming'];
                const args = value => utils.escapeAttr(encodeURIComponent(JSON.stringify([value])));
                const selectedCount = selected.size;

                return `
                    <div class="px-4 sm:px-6 pt-safe min-h-screen pb-36 bg-slate-50/60 dark:bg-slate-950">
                        <div class="hidden bg-red-50 bg-amber-50 bg-blue-50 border-red-100 border-amber-100 border-blue-100 border-l-red-500 border-l-amber-500 border-l-blue-500 ring-red-400 ring-amber-400 ring-blue-400 text-red-600 text-red-700 text-amber-600 text-amber-700 text-blue-600 text-blue-700 bg-red-600 bg-amber-600 bg-blue-600 dark:bg-red-900/20 dark:bg-amber-900/20 dark:bg-blue-900/20 dark:bg-red-900/30 dark:bg-amber-900/30 dark:bg-blue-900/30 dark:border-red-900/40 dark:border-amber-900/40 dark:border-blue-900/40 dark:text-red-300 dark:text-amber-300 dark:text-blue-300"></div>
                        <header class="flex items-center justify-between py-4">
                            <button data-action="navigate" data-page="dashboard" class="min-h-11 inline-flex items-center gap-1 text-sm font-bold text-teal-700 dark:text-teal-300">
                                <span class="material-icons text-lg">arrow_back_ios</span>${utils.t('dashboard')}
                            </button>
                            <h1 class="text-xl font-black theme-text-heading">${utils.t('reminder_center')}</h1>
                            <button data-testid="reminder-select-mode" data-action="ui" data-ui-method="toggleReminderSelectionMode" class="min-h-11 inline-flex items-center gap-1 text-sm font-bold text-teal-700 dark:text-teal-300 ${tab !== 'active' ? 'invisible' : ''}">
                                <span class="material-icons text-lg">check_box</span>${selectionMode ? utils.t('cancel') : utils.t('select')}
                            </button>
                        </header>

                        <section data-testid="reminder-summary" class="theme-bg-card rounded-2xl border theme-border p-4 mb-3">
                            <div class="text-sm font-black theme-text-heading mb-3">${utils.t('reminder_need_action').replace('{n}', activeCounts.overdue + activeCounts.due)}</div>
                            <div class="grid grid-cols-3 gap-2">
                                ${[
                                    ['overdue', 'error_outline', 'reminder_overdue', 'red'],
                                    ['due', 'schedule', 'reminder_due_soon', 'amber'],
                                    ['upcoming', 'access_time', 'reminder_later', 'blue']
                                ].map(([key, icon, label, tone]) => `
                                    <button data-action="ui" data-ui-method="setReminderUrgency" data-ui-args="${args(key)}" class="min-h-[74px] rounded-xl border p-2 text-left ${urgency === key ? `ring-2 ring-${tone}-400` : ''} bg-${tone}-50 border-${tone}-100 dark:bg-${tone}-900/20 dark:border-${tone}-900/40">
                                        <div class="flex items-center gap-1 text-[10px] font-bold text-${tone}-700 dark:text-${tone}-300"><span class="material-icons text-base">${icon}</span>${utils.t(label)}</div>
                                        <div class="text-xl font-black text-${tone}-700 dark:text-${tone}-300 mt-1">${activeCounts[key]}</div>
                                    </button>
                                `).join('')}
                            </div>
                        </section>

                        <div class="grid grid-cols-3 bg-slate-200/70 dark:bg-slate-800 rounded-xl p-1 mb-3">
                            ${[['active','tab_active',data.activeItems.length],['snoozed','tab_snoozed',data.snoozedItems.length],['done','tab_done',data.doneItems.length]].map(([key,label,count]) => `
                                <button data-action="ui" data-ui-method="setReminderTab" data-ui-args="${args(key)}" class="min-h-10 rounded-lg text-xs font-bold ${tab===key?'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm':'theme-text-sub'}">${utils.t(label)} <span class="ml-1">${count}</span></button>
                            `).join('')}
                        </div>

                        <div class="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
                            ${categoryDefs.map(([key,icon,label]) => {
                                const count = key === 'all' ? tabItems.length : tabItems.filter(item => item.category === key).length;
                                return `<button data-reminder-category="${key}" data-action="ui" data-ui-method="setReminderCategory" data-ui-args="${args(key)}" class="min-h-10 whitespace-nowrap px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1 ${category===key?'bg-teal-700 text-white border-teal-700':'theme-bg-card theme-text-heading theme-border'}"><span class="material-icons text-base">${icon}</span>${utils.t(label)} ${count}</button>`;
                            }).join('')}
                        </div>

                        <main class="space-y-5">
                            ${groups.map(group => {
                                const groupItems = visible.filter(item => item.urgency === group);
                                if (!groupItems.length) return '';
                                const groupTone = group === 'overdue' ? 'red' : (group === 'due' ? 'amber' : 'blue');
                                const groupLabel = group === 'overdue' ? 'reminder_overdue' : (group === 'due' ? 'reminder_due_soon' : 'reminder_later');
                                return `<section>
                                    <div class="flex items-center gap-2 px-1 mb-2"><h2 class="text-sm font-black theme-text-heading">${utils.t(groupLabel)}</h2><span class="min-w-5 h-5 px-1.5 rounded-full bg-${groupTone}-600 text-white text-[10px] font-bold inline-flex items-center justify-center">${groupItems.length}</span></div>
                                    <div class="space-y-2">${groupItems.map(item => this.renderReminderCenterCard(item, { tab, selectionMode, selected: selected.has(item.id), snoozedUntil: data.snoozedUntil[item.id] })).join('')}</div>
                                </section>`;
                            }).join('')}
                            ${visible.length ? '' : `<div class="theme-bg-card rounded-2xl border theme-border py-14 px-6 text-center"><span class="material-icons text-4xl text-teal-500 mb-2">notifications_none</span><div class="font-black theme-text-heading">${utils.t('reminder_empty_title')}</div><div class="text-xs theme-text-sub mt-1">${utils.t('reminder_empty_desc')}</div></div>`}
                        </main>

                        ${selectionMode ? `<div class="fixed left-3 right-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl bg-teal-800 text-white shadow-2xl p-3 flex items-center gap-2">
                            <div class="text-xs font-bold flex-1">${utils.t('selected_count').replace('{n}', selectedCount)}</div>
                            <button data-action="ui" data-ui-method="bulkSnoozeSelectedReminders" data-ui-args="${args(7)}" ${selectedCount ? '' : 'disabled'} class="min-h-10 px-3 rounded-xl border border-white/40 font-bold text-xs disabled:opacity-40"><span class="material-icons text-base align-middle mr-1">schedule</span>${utils.t('snooze_7d')}</button>
                            <button data-testid="reminder-bulk-done" data-action="ui" data-ui-method="bulkCompleteSelectedReminders" ${selectedCount ? '' : 'disabled'} class="min-h-10 px-3 rounded-xl bg-white text-teal-800 font-bold text-xs disabled:opacity-40"><span class="material-icons text-base align-middle mr-1">done</span>${utils.t('mark_done')}</button>
                        </div>` : ''}
                    </div>
                `;
            },

renderReminderCenterCard(item, options = {}) {
                const tone = item.urgency === 'overdue' ? 'red' : (item.urgency === 'due' ? 'amber' : 'blue');
                const args = utils.escapeAttr(encodeURIComponent(JSON.stringify([item.id])));
                const status = item.urgency === 'overdue' ? utils.t('reminder_overdue') : (item.urgency === 'due' ? utils.t('reminder_due_soon') : utils.t('reminder_later'));
                return `<article data-testid="reminder-card" data-reminder-id="${utils.escapeAttr(item.id)}" class="theme-bg-card rounded-2xl border theme-border border-l-4 border-l-${tone}-500 p-3.5">
                    <div class="flex items-center gap-3">
                        ${options.selectionMode ? `<button data-action="ui" data-ui-method="toggleReminderSelection" data-ui-args="${args}" class="w-8 h-8 shrink-0 rounded-full border-2 ${options.selected?'bg-teal-700 border-teal-700 text-white':'border-slate-300 text-transparent'}"><span class="material-icons text-lg">done</span></button>` : ''}
                        <div class="w-11 h-11 shrink-0 rounded-full bg-${tone}-50 dark:bg-${tone}-900/30 text-${tone}-600 flex items-center justify-center"><span class="material-icons">${item.icon}</span></div>
                        <button data-action="ui" data-ui-method="openReminderDetails" data-ui-args="${args}" class="min-w-0 flex-1 text-left">
                            <div class="flex items-start justify-between gap-2"><div class="font-black theme-text-heading truncate">${utils.escapeHtml(item.title)}</div><div class="text-xs font-black text-${tone}-600 whitespace-nowrap">${utils.escapeHtml(item.meta || status)}</div></div>
                            <div class="text-[11px] theme-text-sub mt-1 truncate">${utils.escapeHtml(item.vehicleLabel || '')}${item.category ? ` • ${utils.t('reminder_' + item.category)}` : ''}</div>
                            ${options.snoozedUntil ? `<div class="text-[10px] text-blue-600 mt-1">${utils.t('snoozed_until')} ${utils.formatDate(options.snoozedUntil)}</div>` : ''}
                        </button>
                        <button data-action="ui" data-ui-method="openReminderDetails" data-ui-args="${args}" class="w-9 h-9 text-slate-400"><span class="material-icons">more_vert</span></button>
                    </div>
                </article>`;
            }
});
