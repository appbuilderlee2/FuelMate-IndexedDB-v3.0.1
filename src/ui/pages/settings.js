// FuelMate UI module: pages/settings
Object.assign(ui, {
renderSettings(vehicle) {
                const settings = store.data.settings;
                return `
                    <div class="px-6 pt-safe min-h-screen pb-24">
                        <h1 class="text-3xl font-black theme-text-heading mb-6">${utils.t('settings')}</h1>

                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-6">
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">${utils.t('select_vehicle')}</div>
                            <button data-action="ui" data-ui-method="openVehicleSelector" class="w-full p-4 rounded-2xl ${vehicle ? utils.getCarColorClass(vehicle.color || 'teal') : 'bg-slate-50 dark:bg-slate-700'} text-left ${vehicle ? 'text-white' : 'theme-text-heading'}">
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
                                    <button data-action="ui" data-ui-method="openAddVehicle" data-ui-args="${encodeURIComponent(JSON.stringify([v.id]))}" class="text-teal-500"><span class="material-icons">edit</span></button>
                                </div>
                            `).join('')}
                            <button data-action="ui" data-ui-method="openAddVehicle" class="w-full mt-4 py-2 border border-dashed border-teal-500 text-teal-600 rounded-xl text-sm font-bold hover:bg-teal-50 dark:hover:bg-teal-900/20 transition">+ ${utils.t('add_vehicle')}</button>
                            <button data-action="ui" data-ui-method="addDemoCar" class="w-full mt-2 py-2 border border-dashed theme-border theme-text-heading rounded-xl text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition">${utils.t('add_demo_car')}</button>
                        </div>

                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-4 border-2 border-teal-200 dark:border-teal-900/50">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <span class="material-icons text-teal-600">notifications_active</span>
                                    <div class="text-sm font-black theme-text-heading uppercase tracking-wider">${utils.t('reminder_center')}</div>
                                </div>
                                <button data-action="navigate" data-page="reminders" class="inline-flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-100 dark:bg-teal-900/30 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800">${utils.t('view_all')} <span class="material-icons text-[16px]">arrow_forward</span></button>
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
                                            <select data-change-action="ui" data-ui-method="updateReminderDays" data-ui-args="${encodeURIComponent(JSON.stringify([type]))}" data-ui-pass-value="true" class="text-xs p-1 rounded bg-slate-100 dark:bg-slate-700">
                                                <option value="30" ${conf.days==30?'selected':''}>${utils.t('rem_1m')}</option>
                                                <option value="7" ${conf.days==7?'selected':''}>${utils.t('rem_1w')}</option>
                                            </select>
                                            <button type="button" data-action="ui" data-ui-method="toggleReminderSetting" data-ui-args="${encodeURIComponent(JSON.stringify([type]))}" aria-pressed="${conf.enabled ? 'true' : 'false'}" class="w-10 h-6 rounded-full relative cursor-pointer transition-colors ${conf.enabled ? 'bg-teal-500' : 'bg-slate-300'}">
                                                <div class="w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${conf.enabled ? 'left-5' : 'left-1'}"></div>
                                            </button>
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
                                        <select data-change-action="ui" data-ui-method="updateActiveVehicleSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['maintenanceDist', 'string']))}" data-ui-pass-value="true" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                            <option value="none" ${(vehicle?.maintenanceDist ?? settings.maintenanceDist)==='none'?'selected':''}>${utils.t('int_none')}</option>
                                            <option value="5000" ${(vehicle?.maintenanceDist ?? settings.maintenanceDist)==='5000'?'selected':''}>${utils.t('int_5k')}</option>
                                            <option value="10000" ${(vehicle?.maintenanceDist ?? settings.maintenanceDist)==='10000'?'selected':''}>${utils.t('int_10k')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('service_interval_time')}</label>
                                        <select data-change-action="ui" data-ui-method="updateActiveVehicleSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['maintenanceTime', 'string']))}" data-ui-pass-value="true" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
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
                                        <input type="number" min="0" step="100" value="${vehicle?.tireReplaceDist ?? settings.tireReplaceDist ?? 40000}" data-change-action="ui" data-ui-method="updateActiveVehicleSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['tireReplaceDist', 'integer']))}" data-ui-pass-value="true" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
                                    </div>
                                    <div>
                                        <label class="text-xs theme-text-sub block mb-1">${utils.t('tire_interval_time')}</label>
                                        <select data-change-action="ui" data-ui-method="updateActiveVehicleSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['tireReplaceYears', 'integer']))}" data-ui-pass-value="true" class="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 theme-text-heading text-sm">
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
                                        <button data-action="ui" data-ui-method="updateGlobalSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['units', 'metric']))}" class="flex-1 py-1 text-xs rounded-md ${settings.units==='metric'?'bg-white dark:bg-slate-600 shadow':''}">${utils.t('metric')}</button>
                                        <button data-action="ui" data-ui-method="updateGlobalSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['units', 'imperial']))}" class="flex-1 py-1 text-xs rounded-md ${settings.units==='imperial'?'bg-white dark:bg-slate-600 shadow':''}">${utils.t('imperial')}</button>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('pressure_unit')}</label>
                                    <select data-change-action="ui" data-ui-method="updateGlobalSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['pressureUnit']))}" data-ui-pass-value="true" class="w-full p-2 rounded-lg text-sm">
                                        ${['psi','kPa','bar'].map(u => `<option value="${u}" ${(settings.pressureUnit||utils.getPressureUnit())===u?'selected':''}>${utils.t('unit_'+u.toLowerCase())}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('currency')}</label>
                                    <select data-testid="currency-setting" data-change-action="ui" data-ui-method="updateGlobalSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['currency']))}" data-ui-pass-value="true" class="w-full p-2 rounded-lg text-sm">
                                        ${['$','€','£','¥','HK$','A$','NT$'].map(c => `<option value="${c}" ${settings.currency===c?'selected':''}>${c}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="text-xs theme-text-sub block mb-1">${utils.t('language')}</label>
                                    <select data-change-action="ui" data-ui-method="updateGlobalSetting" data-ui-args="${encodeURIComponent(JSON.stringify(['language']))}" data-ui-pass-value="true" class="w-full p-2 rounded-lg text-sm">
                                        <option value="en" ${settings.language==='en'?'selected':''}>English</option>
                                        <option value="zh" ${settings.language==='zh'?'selected':''}>繁體中文</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3 mb-8">
                            <button data-action="ui" data-ui-method="exportData" class="bg-blue-50 text-blue-600 p-4 rounded-xl text-sm font-bold flex flex-col items-center gap-2"><span class="material-icons">download</span> ${utils.t('export_json')}</button>
                            <button data-action="ui" data-ui-method="openImportPicker" class="bg-purple-50 text-purple-600 p-4 rounded-xl text-sm font-bold flex flex-col items-center gap-2"><span class="material-icons">upload</span> ${utils.t('import_json')}</button>
                            <input type="file" id="importFile" class="hidden" accept=".json" data-change-action="ui" data-ui-method="importData" data-ui-pass-element="true">
                            <button data-action="ui" data-ui-method="exportCSV" class="col-span-2 bg-green-50 text-green-600 p-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><span class="material-icons">table_view</span> ${utils.t('export_csv')}</button>
                        </div>

                        <div class="bg-white dark:bg-slate-800 rounded-2xl p-4 card-shadow mb-6 border theme-border">
                            <div class="flex items-center justify-between">
                                <div>
                                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">${utils.t('install_guide')}</div>
                                    <div class="text-sm theme-text-sub">${utils.t('install_guide_hint')}</div>
                                </div>
                                <button data-action="ui" data-ui-method="openInstallGuide" class="inline-flex items-center gap-2 text-xs font-bold text-teal-700 bg-teal-100 dark:bg-teal-900/30 px-3 py-2 rounded-xl border border-teal-200 dark:border-teal-800">
                                    ${utils.t('view_details')}
                                    <span class="material-icons text-[16px]">arrow_forward</span>
                                </button>
                            </div>
                        </div>

                        <div class="text-center flex justify-center">
                            <button data-action="ui" data-ui-method="openAboutModal" class="text-teal-600 text-sm font-bold inline-flex items-center justify-center gap-2 opacity-80 hover:opacity-100">
                                <span class="material-icons">info</span> ${utils.t('about')}
                            </button>
                        </div>

                        <div class="mt-4 flex flex-col items-center">
                            <button data-testid="settings-reload" data-action="ui" data-ui-method="reloadApp" class="w-full mb-4 min-h-12 rounded-xl bg-teal-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                                <span class="material-icons">refresh</span>${utils.t('reload_now')}
                            </button>
                            <div class="inline-flex items-start gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200">
                                <span class="material-icons text-base mt-0.5">warning</span>
                                <span class="font-bold">${utils.t('backup_warning')}</span>
                            </div>
                            <div data-app-version data-testid="app-version" class="text-[10px] theme-text-sub mt-2 text-center">${utils.t('version')} v${utils.escapeHtml(FuelMateVersion.current)} • IndexedDB • PWA</div>
                        </div>
                    </div>
                `;
            },

async updateReminderDays(type, value) {
                const allowed = ['license', 'insurance', 'registration'];
                if (!allowed.includes(type)) return;
                const current = store.data.settings.reminders[type] || { enabled: true };
                store.data.settings.reminders[type] = { ...current, days: value };
                await store.saveData();
            },

async toggleReminderSetting(type) {
                const allowed = ['license', 'insurance', 'registration'];
                if (!allowed.includes(type)) return;
                const current = store.data.settings.reminders[type] || { days: 30, enabled: true };
                store.data.settings.reminders[type] = { ...current, enabled: !current.enabled };
                await store.saveData();
                this.render();
            },

async updateActiveVehicleSetting(key, valueType, value) {
                const allowed = ['maintenanceDist', 'maintenanceTime', 'tireReplaceDist', 'tireReplaceYears'];
                if (!allowed.includes(key)) return;
                const vehicle = store.getActiveVehicle();
                if (!vehicle) return;
                const nextValue = valueType === 'integer' ? (parseInt(value, 10) || 0) : value;
                const nextVehicle = { ...vehicle, [key]: nextValue };
                const hasPeriodicService = store.getVehicleLogs('periodic_maintenance').length > 0;
                if (!hasPeriodicService && key === 'maintenanceDist' && parseInt(nextValue, 10) > 0 && !Number.isFinite(parseFloat(vehicle.maintenanceBaselineOdometer))) {
                    nextVehicle.maintenanceBaselineOdometer = parseFloat(vehicle.currentOdometer) || 0;
                }
                if (!hasPeriodicService && key === 'maintenanceTime' && parseInt(nextValue, 10) > 0 && !vehicle.maintenanceBaselineDate) {
                    nextVehicle.maintenanceBaselineDate = new Date().toISOString().slice(0, 10);
                }
                await store.updateVehicle(nextVehicle);
                this.render();
            },

async updateGlobalSetting(key, value) {
                const allowed = ['units', 'pressureUnit', 'currency', 'language'];
                if (!allowed.includes(key)) return;
                store.data.settings[key] = value;
                await store.saveData();
                this.render();
            },

openImportPicker() {
                document.getElementById('importFile')?.click();
            },

reloadApp() {
                window.location.reload();
            }
});
