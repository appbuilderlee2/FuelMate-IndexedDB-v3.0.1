// FuelMate UI module: actions/data
Object.assign(ui, {
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
            }
});
