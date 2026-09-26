// FuelMate UI module: pages/settings
Object.assign(ui, {
renderSettings(vehicle) {
                const settings = store.data.settings;
                const aiProviders = [
                    ['openai', 'OpenAI'], ['gemini', 'Google AI Studio'], ['groq', 'Groq'],
                    ['deepseek', 'DeepSeek'], ['openrouter', 'OpenRouter'], ['nvidia', 'NVIDIA'],
                    ['compatible', 'OpenAI-compatible API'],
                ];
                const aiProviderName = aiProviders.find(([id]) => id === settings.aiProvider)?.[1] || 'OpenAI';
                const aiModelExamples = { openai: 'gpt-4.1-mini', gemini: 'gemini-2.5-flash', groq: '輸入支援圖片的 Groq 模型 ID', deepseek: '輸入支援圖片的 DeepSeek 模型 ID', openrouter: '例如 google/gemini-2.5-flash', nvidia: '輸入支援圖片的 NVIDIA NIM 模型 ID', compatible: '輸入模型 ID' };
                const aiPdfSupported = FuelMateInvoiceAI.PROVIDERS[settings.aiProvider]?.pdf === true;
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
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">${utils.t('vehicle_management')}</div>
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
                                            ${!['none', '5000', '10000'].includes(String(vehicle?.maintenanceDist ?? settings.maintenanceDist)) ? `<option value="${utils.escapeAttr(vehicle?.maintenanceDist ?? settings.maintenanceDist)}" selected>${utils.escapeHtml(vehicle?.maintenanceDist ?? settings.maintenanceDist)} ${utils.getDistUnit()}</option>` : ''}
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
                            <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">${utils.t('app_settings')}</div>
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
                                <section data-testid="appearance-settings" class="pt-4 border-t theme-border">
                                    <div class="pb-2 text-xs font-bold theme-text-sub uppercase tracking-wider">${utils.t('appearance')}</div>
                                    <div class="rounded-2xl overflow-hidden border theme-border">
                                        ${[
                                            ['apple-fluid-light', 'light_mode', 'apple_fluid_light', 'light'],
                                            ['apple-fluid-dark', 'dark_mode', 'apple_fluid_dark', 'dark'],
                                            ['apple-fluid-system', 'brightness_auto', 'apple_fluid_system', 'system']
                                        ].map(([value, icon, label, preview]) => {
                                            const selected = (settings.appearance || 'apple-fluid-system') === value;
                                            const previewStyle = preview === 'light'
                                                ? 'background:linear-gradient(145deg,#fff 0 58%,#dff7f5 100%)'
                                                : preview === 'dark'
                                                    ? 'background:linear-gradient(145deg,#07111f 0 58%,#123b45 100%)'
                                                    : 'background:linear-gradient(90deg,#fff 0 49%,#07111f 51% 100%)';
                                            return `<button data-testid="appearance-${preview}" role="radio" aria-checked="${selected}" data-action="ui" data-ui-method="updateAppearance" data-ui-args="${encodeURIComponent(JSON.stringify([value]))}" class="appearance-option w-full min-h-[68px] px-3 flex items-center gap-3 text-left border-t first:border-t-0 theme-border">
                                                <span class="appearance-preview w-11 h-11 shrink-0 rounded-xl relative overflow-hidden" style="${previewStyle}"><span class="absolute left-2 right-2 top-2 h-1 rounded-full bg-teal-400/70"></span><span class="absolute left-2 right-3 top-5 h-0.5 rounded bg-slate-400/35"></span><span class="absolute left-2 right-2 top-7 h-0.5 rounded bg-slate-400/25"></span></span>
                                                <span class="min-w-0 flex-1"><span class="block text-sm font-bold theme-text-heading">${utils.t(label)}</span><span class="block text-[11px] theme-text-sub mt-0.5">${utils.t(label + '_desc')}</span></span>
                                                <span class="material-icons text-xl ${selected ? 'text-teal-600' : 'text-slate-300'}">${selected ? 'check_circle' : icon}</span>
                                            </button>`;
                                        }).join('')}
                                    </div>
                                    <div class="mt-4 rounded-2xl overflow-hidden border theme-border" role="group" aria-label="iOS">
                                        ${['ios-native', 'ios-glass'].map(family => {
                                            const selected = (settings.appearance || '').startsWith(family);
                                            const mode = (settings.appearance || 'apple-fluid-system').split('-').pop();
                                            const label = family === 'ios-native' ? 'iOS 原生' : 'iOS 玻璃';
                                            const english = family === 'ios-native' ? 'iOS Native' : 'iOS Glass';
                                            return `<button data-testid="appearance-${family}" aria-pressed="${selected}" data-action="ui" data-ui-method="updateAppearance" data-ui-args="${encodeURIComponent(JSON.stringify([family + '-' + mode]))}" class="appearance-option w-full min-h-[68px] px-3 flex items-center gap-3 text-left border-t first:border-t-0 theme-border">
                                                <span class="ios-theme-preview ${family === 'ios-glass' ? 'ios-theme-preview-glass' : ''}"><span class="material-icons">${family === 'ios-glass' ? 'blur_on' : 'view_agenda'}</span></span>
                                                <span class="flex-1"><span class="block text-sm font-bold theme-text-heading">${settings.language === 'zh' ? label : english}</span><span class="block text-xs theme-text-sub">${settings.language === 'zh' ? (family === 'ios-native' ? '簡潔分組列表' : '通透導覽與柔和層次') : (family === 'ios-native' ? 'Clean, grouped surfaces' : 'Translucent navigation and sheets')}</span></span>
                                                <span class="material-icons ${selected ? 'text-blue-600' : 'text-slate-300'}">${selected ? 'check_circle' : 'radio_button_unchecked'}</span>
                                            </button>`;
                                        }).join('')}
                                    </div>
                                    <p class="text-xs theme-text-sub mt-2">${settings.language === 'zh' ? '保留所有原有風格；切換不會影響記錄與資料。' : 'All existing styles remain available. Switching keeps your records and data.'}</p>
                                    ${(settings.appearance || '').startsWith('ios-') ? `<div class="ios-display-modes mt-4" role="group" aria-label="${settings.language === 'zh' ? '顯示模式' : 'Color scheme'}">
                                        ${['light', 'dark', 'system'].map((mode, i) => `<button data-testid="ios-mode-${mode}" aria-pressed="${settings.appearance.endsWith('-' + mode)}" data-action="ui" data-ui-method="updateAppearance" data-ui-args="${encodeURIComponent(JSON.stringify([settings.appearance.replace(/-(light|dark|system)$/, '-' + mode)]))}">${(settings.language === 'zh' ? ['淺色', '深色', '跟隨系統'] : ['Light', 'Dark', 'System'])[i]}</button>`).join('')}
                                    </div>` : ''}
                                    <label class="ios-transparency-row"><span>${settings.language === 'zh' ? '減少透明度' : 'Reduce transparency'}</span><input type="checkbox" role="switch" data-testid="reduce-transparency" ${settings.reduceTransparency === true ? 'checked' : ''} data-change-action="ui" data-ui-method="updateTransparency" data-ui-pass-element="true"></label>
                                </section>
                            </div>
                        </div>

                        <div data-testid="ai-invoice-settings" class="theme-bg-card rounded-2xl p-4 card-shadow mb-6 border theme-border">
                            <div class="flex items-start justify-between gap-4">
                                <div>
                                    <div class="text-sm font-black theme-text-heading flex items-center gap-2"><span class="material-icons text-blue-500">document_scanner</span>${settings.language === 'zh' ? 'AI 帳單識別' : 'AI Invoice Recognition'}</div>
                                    <div class="text-xs theme-text-sub mt-1">${settings.language === 'zh' ? '相片或 PDF 先由你選擇的供應商識別，確認後才儲存。' : 'Your selected provider reads a photo or PDF. You confirm before saving.'}</div>
                                </div>
                                <label class="ios-transparency-row !p-0"><span class="sr-only">AI</span><input data-testid="ai-invoice-toggle" type="checkbox" role="switch" ${settings.aiInvoiceEnabled ? 'checked' : ''} data-change-action="ui" data-ui-method="toggleAIInvoice" data-ui-pass-element="true"></label>
                            </div>
                            ${settings.aiInvoiceEnabled ? `
                                <div class="space-y-3 mt-4 pt-4 border-t theme-border">
                                    <div><label class="text-xs theme-text-sub block mb-1">${settings.language === 'zh' ? 'AI 供應商' : 'AI provider'}</label>
                                        <select id="ai_provider" data-testid="ai-provider" class="w-full p-3 rounded-xl" data-change-action="ui" data-ui-method="changeAIProvider" data-ui-pass-value="true">
                                            ${aiProviders.map(([id, name]) => `<option value="${id}" ${settings.aiProvider === id ? 'selected' : ''}>${name}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div><label class="text-xs theme-text-sub block mb-1">${settings.language === 'zh' ? '模型' : 'Model'}</label><input id="ai_model" data-testid="ai-model" type="text" maxlength="160" value="${utils.escapeAttr(settings.aiModel || '')}" class="w-full p-3 rounded-xl" autocomplete="off" placeholder="${utils.escapeAttr(aiModelExamples[settings.aiProvider] || 'Model ID')}"><select id="ai_model_select" data-testid="ai-model-select" class="hidden w-full p-3 rounded-xl"></select><button id="ai_model_entry_toggle" data-action="ui" data-ui-method="toggleAIModelEntry" class="hidden text-xs text-blue-600 mt-2">${settings.language === 'zh' ? '手動輸入模型 ID' : 'Enter model ID manually'}</button><div class="text-[11px] theme-text-sub mt-1">${settings.language === 'zh' ? `連接後會自動列出 ${aiProviderName} 模型。請選用支援圖片的模型；${aiPdfSupported ? '亦可上載 PDF。' : '只接受相片，不接受 PDF。'}` : `Connect to load ${aiProviderName} models automatically. Choose a vision-capable model; ${aiPdfSupported ? 'PDF is also accepted.' : 'use an image rather than a PDF.'}`}</div></div>
                                    ${settings.aiProvider === 'compatible' ? `<div><label class="text-xs theme-text-sub block mb-1">API Base URL</label><input id="ai_endpoint" data-testid="ai-endpoint" type="url" maxlength="500" value="${utils.escapeAttr(settings.aiEndpoint || '')}" class="w-full p-3 rounded-xl" inputmode="url" autocomplete="off" placeholder="https://example.com/v1"></div>` : ''}
                                    <div><label class="text-xs theme-text-sub block mb-1">${aiProviderName} API Key</label><input id="ai_api_key" data-testid="ai-api-key" type="password" class="w-full p-3 rounded-xl" autocomplete="new-password" placeholder="${FuelMateInvoiceAI.getKey(settings.aiProvider) ? '••••••••••••  ' + (settings.language === 'zh' ? '已儲存' : 'saved') : ''}"></div>
                                    <label class="flex items-start gap-3 text-sm theme-text-heading"><input id="ai_remember_key" data-testid="ai-remember-key" type="checkbox" class="mt-0.5" ${settings.aiRememberKey ? 'checked' : ''}><span>${settings.language === 'zh' ? '記住於此裝置' : 'Remember on this device'}<span class="block text-[11px] theme-text-sub mt-0.5">${settings.language === 'zh' ? '未選擇時，關閉分頁後需要重新輸入。API Key 不會加入備份。' : 'Otherwise the key is cleared when this tab closes. API keys are excluded from backups.'}</span></span></label>
                                    <div id="ai_connection_status" class="text-xs theme-text-sub" aria-live="polite"></div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <button data-testid="save-ai-settings" data-action="ui" data-ui-method="saveAISettings" class="py-3 rounded-xl bg-blue-600 text-white text-sm font-bold">${settings.language === 'zh' ? '儲存設定' : 'Save settings'}</button>
                                        <button data-testid="test-ai-connection" data-action="ui" data-ui-method="testAIConnection" class="py-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold border border-blue-100">${settings.language === 'zh' ? '載入模型' : 'Load models'}</button>
                                    </div>
                                    ${FuelMateInvoiceAI.getKey(settings.aiProvider) ? `<button data-action="ui" data-ui-method="clearAIKey" class="text-xs text-red-600">${settings.language === 'zh' ? '清除 API Key' : 'Clear API key'}</button>` : ''}
                                    <div class="rounded-xl bg-amber-50 text-amber-900 p-3 text-[11px] leading-relaxed">${settings.language === 'zh' ? '完全無後端模式：帳單會由此裝置直接傳送到所選 AI 供應商。只使用你信任的供應商及受限制的 API Key。' : 'Backend-free mode: this device sends the invoice directly to your selected AI provider. Use a trusted provider and a restricted API key.'}</div>
                                </div>` : ''}
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
                const reminders = store.data.settings.reminders && typeof store.data.settings.reminders === 'object' && !Array.isArray(store.data.settings.reminders)
                    ? store.data.settings.reminders : (store.data.settings.reminders = {});
                const current = reminders[type] || { enabled: true };
                reminders[type] = { ...current, days: value };
                await store.saveData();
            },

async toggleReminderSetting(type) {
                const allowed = ['license', 'insurance', 'registration'];
                if (!allowed.includes(type)) return;
                const reminders = store.data.settings.reminders && typeof store.data.settings.reminders === 'object' && !Array.isArray(store.data.settings.reminders)
                    ? store.data.settings.reminders : (store.data.settings.reminders = {});
                const current = reminders[type] || { days: 30, enabled: true };
                reminders[type] = { ...current, enabled: !current.enabled };
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
                    nextVehicle.maintenanceBaselineDate = FuelMateCore.localDateKey();
                }
                await store.updateVehicle(nextVehicle);
                this.render();
            },

async updateGlobalSetting(key, value) {
                const allowed = ['units', 'pressureUnit', 'currency', 'language'];
                if (!allowed.includes(key)) return;
                if (key === 'units') {
                    await store.changeDistanceUnits(value);
                    this.render();
                    return;
                }
                store.data.settings[key] = value;
                await store.saveData();
                this.render();
            },

async updateAppearance(value) {
                if (this._savingAppearance) return;
                this._savingAppearance = true;
                const previous = store.data.settings.appearance;
                const appearance = FuelMateAppearance.normalize(value);
                try {
                    store.data.settings.appearance = appearance;
                    await store.saveData();
                    FuelMateAppearance.apply(appearance);
                    this.render();
                } catch (error) {
                    store.data.settings.appearance = previous;
                    throw error;
                } finally { this._savingAppearance = false; }
            },

async updateTransparency(element) {
                const previous = store.data.settings.reduceTransparency === true;
                store.data.settings.reduceTransparency = element.checked;
                try {
                    await store.saveData();
                    this.applyTransparency();
                } catch (error) {
                    store.data.settings.reduceTransparency = previous;
                    element.checked = previous;
                    throw error;
                }
            },

applyTransparency() {
                const value = store.data.settings.reduceTransparency === true;
                document.documentElement.dataset.reduceTransparency = String(value);
                try { localStorage.setItem('fuelmate_reduce_transparency', String(value)); } catch (_) {}
            },

openImportPicker() {
                document.getElementById('importFile')?.click();
            },

reloadApp() {
                window.location.reload();
            }
});
