Object.assign(ui, {
    renderNotifications() {
        const settings = store.data.settings;
        const native = FuelMateNativeNotifications.isNative();
        Promise.resolve().then(() => this.refreshNotificationPermission());
        return `<div class="px-6 pt-safe min-h-screen pb-36">
            <header class="flex items-center justify-between mb-6">
                <button data-action="navigate" data-page="settings" class="min-h-11 text-teal-700 font-bold">${utils.t('settings')}</button>
                <h1 class="text-2xl font-black theme-text-heading">${utils.t('notifications')}</h1>
                <button data-action="navigate" data-page="reminders" aria-label="${utils.t('reminder_center')}" class="min-h-11 text-teal-700 font-bold"><span class="material-icons">notifications_active</span></button>
            </header>
            <section class="theme-bg-card rounded-2xl p-5 card-shadow mb-6">
                ${native ? `<div class="flex items-center justify-between gap-3 mb-3"><div class="font-bold theme-text-heading">${utils.t('native_notifications')}</div>
                <button type="button" data-testid="native-notifications-toggle" data-action="ui" data-ui-method="toggleNativeNotifications" aria-label="${utils.t('native_notifications')}" aria-pressed="${!!settings.nativeNotificationsEnabled}" class="w-12 h-7 rounded-full relative shrink-0 ${settings.nativeNotificationsEnabled ? 'bg-teal-500' : 'bg-slate-300'}"><span class="w-5 h-5 bg-white rounded-full absolute top-1 ${settings.nativeNotificationsEnabled ? 'left-6' : 'left-1'}"></span></button></div>` : ''}
                <p data-testid="notification-permission" class="text-sm theme-text-sub" role="status">${utils.t(native ? 'notification_permission_prompt' : 'notification_web_note')}</p>
            </section>
            <section class="theme-bg-card rounded-2xl p-5 card-shadow mb-6">
                <h2 class="font-bold theme-text-heading mb-3">${utils.t('notification_rules')}</h2>
                <p class="text-xs theme-text-sub mb-4">${utils.t('notification_rules_hint')}</p>
                ${['tires', 'service', 'license', 'insurance', 'registration', 'backup'].map(type => {
                    const rule = FuelMateNativeNotifications.rule(settings, type);
                    const label = utils.t({ tires: 'reminder_tires', service: 'reminder_service', backup: 'reminder_backup' }[type] || type);
                    return `<div class="py-4 border-b theme-border last:border-0">
                        <div class="flex items-center justify-between gap-3 mb-3"><span class="font-bold theme-text-heading">${label}</span>
                        <button type="button" data-testid="notification-rule-${type}" data-action="ui" data-ui-method="toggleNotificationRule" data-ui-args="${encodeURIComponent(JSON.stringify([type]))}" aria-label="${label}" aria-pressed="${rule.enabled}" class="w-12 h-7 rounded-full relative shrink-0 ${rule.enabled ? 'bg-teal-500' : 'bg-slate-300'}"><span class="w-5 h-5 bg-white rounded-full absolute top-1 ${rule.enabled ? 'left-6' : 'left-1'}"></span></button></div>
                        <label class="flex items-center justify-between gap-3 text-sm theme-text-sub">${utils.t('notification_advance')}
                        <select aria-label="${label} ${utils.t('notification_advance')}" data-testid="notification-days-${type}" data-change-action="ui" data-ui-method="updateNotificationDays" data-ui-args="${encodeURIComponent(JSON.stringify([type]))}" data-ui-pass-value="true" class="p-2 rounded-xl theme-text-heading">
                        ${[...new Set([0, 1, 7, 30, rule.days])].sort((a,b) => a-b).map(days => `<option value="${days}" ${days === rule.days ? 'selected' : ''}>${days === 0 ? utils.t('notification_on_day') : `${days} ${utils.t('days_before')}`}</option>`).join('')}</select></label>
                    </div>`;
                }).join('')}
            </section>
            <section class="theme-bg-card rounded-2xl p-5 card-shadow space-y-5">
                <label class="flex items-center justify-between gap-3 font-bold theme-text-heading">${utils.t('notification_time')}<input data-testid="notification-time" type="time" value="${FuelMateNativeNotifications.notificationTime(settings)}" data-change-action="ui" data-ui-method="updateNotificationTime" data-ui-pass-value="true" class="p-2 rounded-xl"></label>
                <label class="flex items-center justify-between gap-3 font-bold theme-text-heading">${utils.t('notification_repeat')}<select data-testid="notification-repeat" data-change-action="ui" data-ui-method="updateNotificationRepeat" data-ui-pass-value="true" class="p-2 rounded-xl"><option value="once">${utils.t('notification_once')}</option><option value="daily" ${settings.notificationOverdueRepeat === 'daily' ? 'selected' : ''}>${utils.t('notification_daily')}</option></select></label>
                <p class="text-xs theme-text-sub">${utils.t('notification_repeat_hint')}</p>
            </section>
        </div>`;
    },

    async refreshNotificationPermission() {
        let status;
        try { status = await FuelMateNativeNotifications.permissionStatus(); }
        catch (_) { status = 'error'; }
        const line = document.querySelector('[data-testid="notification-permission"]');
        if (line) line.textContent = utils.t(status === 'web' ? 'notification_web_note' : status === 'denied' ? 'native_notifications_denied' : status === 'granted' ? 'notification_permission_granted' : status === 'error' ? 'notification_permission_error' : 'notification_permission_prompt');
    },

    async saveNotificationRules() {
        await store.saveData();
        FuelMateNativeNotifications.requestSync();
        this.render();
    },

    async toggleNotificationRule(type) {
        if (!['tires', 'service', 'license', 'insurance', 'registration', 'backup'].includes(type)) return;
        const rule = FuelMateNativeNotifications.rule(store.data.settings, type);
        (store.data.settings.reminders ||= {})[type] = { ...rule, enabled: !rule.enabled };
        await this.saveNotificationRules();
    },

    async updateNotificationDays(type, value) {
        if (!['tires', 'service', 'license', 'insurance', 'registration', 'backup'].includes(type) || !['0', '1', '7', '30'].includes(value)) return;
        (store.data.settings.reminders ||= {})[type] = { ...FuelMateNativeNotifications.rule(store.data.settings, type), days: Number(value) };
        await this.saveNotificationRules();
    },

    async updateNotificationTime(value) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return;
        store.data.settings.notificationTime = value;
        await this.saveNotificationRules();
    },

    async updateNotificationRepeat(value) {
        if (!['once', 'daily'].includes(value)) return;
        store.data.settings.notificationOverdueRepeat = value;
        await this.saveNotificationRules();
    },
});
