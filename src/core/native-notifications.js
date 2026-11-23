(function exposeNativeNotifications(global) {
    const isNative = () => !!global.Capacitor?.isNativePlatform();
    const plugin = () => global.Capacitor.Plugins.LocalNotifications || global.Capacitor.registerPlugin('LocalNotifications');
    let timer;
    let running = Promise.resolve();
    let initialized = false;

    function rule(settings, type) {
        const value = settings.reminders?.[type] || {};
        const fallback = ['license', 'insurance', 'registration'].includes(type) ? 30 : 0;
        return { enabled: value.enabled !== false, days: Number.isFinite(Number(value.days)) && Number(value.days) >= 0 ? Number(value.days) : fallback };
    }

    function notificationTime(settings) {
        return /^([01]\d|2[0-3]):[0-5]\d$/.test(settings.notificationTime || '') ? settings.notificationTime : '09:00';
    }

    async function permissionStatus() {
        return isNative() ? (await plugin().checkPermissions()).display : 'web';
    }

    function localMorning(value, offset = 0, time = '09:00') {
        if (!/^\d{4}-\d{2}-\d{2}/.test(value || '')) return null;
        const [year, month, day] = value.slice(0, 10).split('-').map(Number);
        const [hour, minute] = time.split(':').map(Number);
        return new Date(year, month - 1, day - offset, hour, minute);
    }

    function notificationId(key) {
        let hash = 2166136261;
        for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
        return (hash >>> 0) % 2147483646 + 1;
    }

    function plan(center, now, settings, pending = [], limit = 64) {
        const notifications = [];
        const notified = new Set(settings.nativeNotificationNotifiedIds || []);
        const retained = new Set();
        const state = settings.reminderCenter || {};
        const candidates = [];
        const seen = new Set();
        const time = notificationTime(settings);
        const [hour, minute] = time.split(':').map(Number);
        for (const item of center.items) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            const type = item.calendarType || (item.id.startsWith('doc:') ? item.id.split(':')[2]
                : item.category === 'tire' || item.id.startsWith('tire:') ? 'tires'
                    : item.category === 'service' || item.id.startsWith('svc:') ? 'service' : 'backup');
            const config = rule(settings, type);
            if (!config.enabled) continue;
            const ids = [item.id, ...(item.legacyIds || [])];
            if (ids.some(id => center.done?.[id] || state.done?.[id])) continue;
            const dueDate = item.dueDateIso || (item.category === 'service' && Number.isFinite(item.remainingDays)
                ? FuelMateCore.localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + item.remainingDays))
                : null);
            const snooze = ids.map(id => center.snoozedUntil?.[id] || state.snoozedUntil?.[id])
                .filter(Boolean).map(value => new Date(value)).filter(date => date > now).sort((a, b) => b - a)[0];
            const due = localMorning(dueDate, 0, time);
            const distanceDue = Number.isFinite(item.remainingKm) && item.remainingKm <= 0;
            const overdue = distanceDue || (due && due <= now) || (!due && Number.isFinite(item.remainingDays) && item.remainingDays <= 0);
            const body = [item.vehicleLabel, item.title, item.meta].filter(Boolean).join(' • ');
            const overdueBody = [item.vehicleLabel, item.title, utils.t('reminder_overdue')].filter(Boolean).join(' • ');
            const add = (at, slot, immediate = false, daily = false, message = body) => {
                if (at && at > now) candidates.push({
                    key: item.id + ':' + slot, title: 'FuelMate', body: message,
                    schedule: daily ? { on: { hour, minute }, repeats: true } : { at },
                    extra: { fuelmate: true, reminderId: item.id, immediate, fireAt: at.getTime() },
                });
            };
            const addDailyFollowups = start => {
                for (let day = 1; day < 64; day++) {
                    const next = localMorning(FuelMateCore.addCalendarDays(FuelMateCore.localDateKey(start), day), 0, time);
                    add(next, 'daily:' + FuelMateCore.localDateKey(next), false, false, overdueBody);
                }
            };
            if (snooze) {
                const morning = localMorning(FuelMateCore.localDateKey(snooze), 0, time);
                add(morning, 'snooze');
                if (due && due > morning && !(settings.notificationOverdueRepeat === 'daily' && overdue)) add(due, 'due');
                if (settings.notificationOverdueRepeat === 'daily' && (due || overdue)) addDailyFollowups(!overdue && due && due > morning ? due : morning);
                continue;
            }
            retained.add(item.id);
            if (!due || due <= now || distanceDue) {
                if (!notified.has(item.id)) add(new Date(now.getTime() + 5000), 'now', true);
                else {
                    const existing = pending.find(entry => entry.extra?.reminderId === item.id && entry.extra?.immediate);
                    if (existing) add(new Date(existing.extra.fireAt), 'now', true);
                }
            }
            if (due) {
                const alertDate = localMorning(dueDate, config.days, time);
                add(alertDate, 'alert');
                if (alertDate.getTime() !== due.getTime()) add(due, 'due');
            }
            if (settings.notificationOverdueRepeat === 'daily' && overdue) {
                const next = localMorning(FuelMateCore.localDateKey(now), 0, time);
                if (next <= now) next.setDate(next.getDate() + 1);
                add(next, 'daily', false, true, overdueBody);
            } else if (settings.notificationOverdueRepeat === 'daily' && due && due > now) {
                addDailyFollowups(due);
            }
        }
        const used = new Set();
        candidates.sort((a, b) => a.key.localeCompare(b.key)).forEach(entry => {
            let id = notificationId(entry.key);
            while (used.has(id)) id = id % 2147483646 + 1;
            used.add(id);
            entry.id = id;
        });
        candidates.sort((a, b) => a.extra.fireAt - b.extra.fireAt || a.id - b.id);
        for (const { key, ...entry } of candidates.slice(0, Math.min(64, Math.max(0, limit)))) {
            notifications.push(entry);
            if (entry.extra.immediate) notified.add(entry.extra.reminderId);
        }
        return { notifications, notifiedIds: [...notified].filter(id => retained.has(id)).sort() };
    }

    async function sync() {
        if (!isNative() || !initialized) return;
        const api = plugin();
        const { notifications: pending } = await api.getPending();
        const owned = pending.filter(entry => entry.extra?.fuelmate === true);
        if (owned.length) await api.cancel({ notifications: owned.map(({ id }) => ({ id })) });
        if (!store.data.settings.nativeNotificationsEnabled) return;
        if ((await api.checkPermissions()).display !== 'granted') {
            store.data.settings.nativeNotificationsEnabled = false;
            await store.saveData({ nativeNotifications: false });
            ui.render();
            return;
        }
        const result = plan(ui.getReminderCenterData('all'), new Date(), store.data.settings, owned, 64 - (pending.length - owned.length));
        if (result.notifications.length) await api.schedule({ notifications: result.notifications });
        if (JSON.stringify(store.data.settings.nativeNotificationNotifiedIds || []) !== JSON.stringify(result.notifiedIds)) {
            store.data.settings.nativeNotificationNotifiedIds = result.notifiedIds;
            await store.saveData({ nativeNotifications: false });
        }
    }

    function requestSync() {
        if (!isNative() || !initialized) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
            running = running.then(sync).catch(error => console.error('Native notification sync failed', error));
        }, 500);
    }

    async function init() {
        if (!isNative() || initialized) return;
        initialized = true;
        await plugin().addListener('localNotificationActionPerformed', () => router.navigate('reminders'));
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                requestSync();
                ui.refreshNotificationPermission?.();
            }
        });
        requestSync();
    }

    async function toggle() {
        if (!isNative()) return;
        if (store.data.settings.nativeNotificationsEnabled) store.data.settings.nativeNotificationsEnabled = false;
        else {
            const permission = await plugin().requestPermissions();
            store.data.settings.nativeNotificationsEnabled = permission.display === 'granted';
            if (permission.display !== 'granted') alert(utils.t('native_notifications_denied'));
        }
        await store.saveData();
        ui.render();
    }

    global.FuelMateNativeNotifications = Object.freeze({ isNative, init, requestSync, toggle, plan, notificationId, rule, notificationTime, permissionStatus });
})(globalThis);
