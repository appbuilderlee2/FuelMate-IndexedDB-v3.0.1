// FuelMate UI module: actions/dialogs
Object.assign(ui, {
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
});
