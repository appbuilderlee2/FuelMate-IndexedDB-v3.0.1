import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../src/core/native-notifications.js', import.meta.url), 'utf8');
const context = vm.createContext({ console, setTimeout, clearTimeout, store: { data: { settings: { language: 'en' } } } });
vm.runInContext(await fs.readFile(new URL('../src/translations.js', import.meta.url), 'utf8'), context);
vm.runInContext(await fs.readFile(new URL('../src/utils.js', import.meta.url), 'utf8'), context);
vm.runInContext(await fs.readFile(new URL('../src/core/calculations.js', import.meta.url), 'utf8'), context);
vm.runInContext(source, context);
const { plan, notificationId } = context.FuelMateNativeNotifications;
const now = new Date(2026, 5, 1, 12);
const item = (id, fields = {}) => ({ id, title: 'Reminder', vehicleLabel: 'Test Car', meta: 'Due', ...fields });
const run = (items, settings = {}, center = {}, pending = []) => plan({ items, ...center }, now, settings, pending);
const dateItem = item('doc:v:license:2026-07-01', { calendarType: 'license', dueDateIso: '2026-07-01' });

test('every category can be independently disabled', () => {
    for (const [type, id, category] of [['tires', 'tire:v', 'tire'], ['service', 'svc:v', 'service'], ['backup', 'backup:v', 'backup'], ...['license', 'insurance', 'registration'].map(type => [type, `doc:v:${type}:date`, 'docs'])]) {
        const reminder = item(id, { category, dueDateIso: '2026-07-01' });
        assert.ok(run([reminder]).notifications.length > 0);
        assert.equal(run([reminder], { reminders: { [type]: { enabled: false, days: 7 } } }).notifications.length, 0);
    }
});

test('tires, service and backup support advance days and custom notification time', () => {
    for (const [type, category] of [['tires', 'tire'], ['service', 'service'], ['backup', 'backup']]) {
        const reminder = item(`${category}:v`, { category, dueDateIso: '2026-07-01' });
        const result = run([reminder], { reminders: { [type]: { days: 7 } }, notificationTime: '18:45' });
        assert.deepEqual(Array.from(result.notifications, n => [n.schedule.at.getMonth(), n.schedule.at.getDate(), n.schedule.at.getHours(), n.schedule.at.getMinutes()]), [[5,24,18,45], [6,1,18,45]]);
        assert.equal(run([reminder], { reminders: { [type]: { days: 0 } } }).notifications.length, 1);
    }
    assert.equal(run([dateItem], { notificationTime: '99:99' }).notifications[0].schedule.at.getHours(), 9);
    assert.equal(run([dateItem], { notificationTime: '00:05' }).notifications[0].schedule.at.getMinutes(), 5);
});

test('daily overdue repeats use local calendar time, honor state, and stay under cap', () => {
    const overdue = item('svc:v', { category: 'service', remainingKm: -10 });
    const settings = { notificationOverdueRepeat: 'daily', notificationTime: '08:15', nativeNotificationNotifiedIds: [overdue.id] };
    const result = run([overdue], settings);
    assert.equal(result.notifications.length, 1);
    assert.equal(JSON.stringify(result.notifications[0].schedule), JSON.stringify({ on: { hour: 8, minute: 15 }, repeats: true }));
    assert.equal(new Date(result.notifications[0].extra.fireAt).getDate(), 2);
    assert.equal(run([overdue], settings, { done: { [overdue.id]: true } }).notifications.length, 0);
    assert.ok(run([overdue], settings, { snoozedUntil: { [overdue.id]: '2026-06-10' } }).notifications.every(n => !n.schedule.repeats));
    const items = Array.from({ length: 80 }, (_, index) => item(`svc:${index}`, { remainingKm: -1 }));
    const capped = run(items, { ...settings, nativeNotificationNotifiedIds: items.map(it => it.id) });
    assert.equal(capped.notifications.length, 64);
    assert.equal(new Set(capped.notifications.map(n => n.id)).size, 64);
    assert.equal(run([item('svc:future', { remainingKm: 100 })], settings).notifications.filter(n => n.schedule.repeats).length, 0);
    assert.equal(run([], settings).notifications.length, 0);
});

test('old IndexedDB settings load without migration or changing document preferences', async () => {
    const legacy = vm.createContext({ console, setTimeout, clearTimeout });
    vm.runInContext(await fs.readFile(new URL('../src/store.js', import.meta.url), 'utf8') + '\nglobalThis.legacyStore=store;', legacy);
    const store = legacy.legacyStore;
    store.runTransaction = async name => name === 'settings' ? { schemaVersion: 2, reminders: { license: { enabled: false, days: 7 } } } : [];
    await store.loadAllData();
    const settings = store.data.settings;
    assert.equal(settings.schemaVersion, 2);
    assert.equal(settings.reminders.license.days, 7);
    assert.equal(context.FuelMateNativeNotifications.rule(settings, 'license').enabled, false);
    for (const type of ['tires', 'service', 'backup']) {
        assert.equal(context.FuelMateNativeNotifications.rule(settings, type).enabled, true);
        assert.equal(context.FuelMateNativeNotifications.rule(settings, type).days, 0);
    }
    assert.equal(context.FuelMateNativeNotifications.notificationTime(settings), '09:00');
    assert.equal(settings.nativeNotificationsEnabled, false);
    assert.equal(run([item('backup:old')], settings).notifications.length, 1);
});

test('distance-only tires with a null date threshold repeat only after reaching their mileage', () => {
    const settings = { notificationOverdueRepeat: 'daily' };
    const tire = item('tire:v:asset:front', { category: 'tire', remainingKm: 500, remainingDays: null, dueDateIso: null });
    const future = run([tire], settings);
    assert.ok(future.notifications.every(n => n.extra.immediate));
    assert.equal(run([tire], { ...settings, nativeNotificationNotifiedIds: future.notifiedIds }).notifications.length, 0);
    for (const remainingKm of [0, -1]) {
        const result = run([{ ...tire, remainingKm }], settings);
        assert.equal(result.notifications.filter(n => n.schedule.repeats).length, 1);
    }
    for (const remainingKm of [null, undefined, 500]) {
        const result = run([{ ...tire, remainingKm }], settings);
        assert.equal(result.notifications.filter(n => !n.extra.immediate).length, 0);
    }
    const snoozedUntil = { [tire.id]: new Date(2026, 5, 10, 12).toISOString() };
    assert.equal(run([tire], settings, { snoozedUntil }).notifications.length, 1);
    assert.equal(run([{ ...tire, remainingKm: 0 }], settings, { snoozedUntil }).notifications.length, 64);
    assert.equal(run([{ ...tire, remainingKm: -1 }], settings, { done: { [tire.id]: true } }).notifications.length, 0);
    assert.equal(run([], settings).notifications.length, 0);
});

test('daily mode queues future followups without reopening the app or firing before the deadline', () => {
    const settings = { notificationOverdueRepeat: 'daily', notificationTime: '08:15', reminders: { license: { days: 1 } } };
    const result = run([dateItem], settings);
    assert.equal(result.notifications.length, 64);
    const dates = result.notifications.map(n => n.schedule.at);
    assert.equal(dates[0].getTime(), new Date(2026, 5, 30, 8, 15).getTime());
    assert.equal(dates[1].getTime(), new Date(2026, 6, 1, 8, 15).getTime());
    assert.equal(dates[2].getTime(), new Date(2026, 6, 2, 8, 15).getTime());
    assert.equal(dates[63].getTime(), new Date(2026, 8, 1, 8, 15).getTime());
    assert.ok(dates.every(date => date.getHours() === 8 && date.getMinutes() === 15));
    assert.equal(new Set(dates.map(date => date.getTime())).size, 64);
    assert.ok(result.notifications.every(n => !n.schedule.repeats));
    assert.equal(new Set(result.notifications.map(n => n.id)).size, 64);
    assert.equal(run([dateItem], { ...settings, notificationOverdueRepeat: 'once' }).notifications.length, 2);
    assert.equal(run([dateItem], settings, { done: { [dateItem.id]: true } }).notifications.length, 0);
    assert.equal(run([], settings).notifications.length, 0);
    const disabled = { ...settings, reminders: { license: { enabled: false } } };
    assert.equal(run([dateItem], disabled).notifications.length, 0);
    const near = item('svc:near', { category: 'service', dueDateIso: '2026-06-03' });
    const competing = run([dateItem, near], settings).notifications;
    assert.equal(competing.length, 64);
    assert.equal(competing[0].schedule.at.getTime(), new Date(2026, 5, 3, 8, 15).getTime());
    const snoozed = run([near], settings, { snoozedUntil: { [near.id]: new Date(2026, 5, 5, 12).toISOString() } }).notifications;
    assert.equal(snoozed[0].schedule.at.getTime(), new Date(2026, 5, 5, 8, 15).getTime());
    assert.equal(snoozed[1].schedule.at.getTime(), new Date(2026, 5, 6, 8, 15).getTime());
});

test('snoozed mileage-overdue tires resume daily before their later calendar deadline', () => {
    const tire = item('tire:v:asset:front', { category: 'tire', remainingKm: -1, remainingDays: 19, dueDateIso: '2026-06-20' });
    const settings = { notificationOverdueRepeat: 'daily' };
    const center = { snoozedUntil: { [tire.id]: new Date(2026, 5, 5, 12).toISOString() } };
    const result = run([tire], settings, center).notifications;
    assert.equal(result.length, 64);
    assert.equal(result[0].schedule.at.getTime(), new Date(2026, 5, 5, 9).getTime());
    assert.equal(result[1].schedule.at.getTime(), new Date(2026, 5, 6, 9).getTime());
    assert.equal(new Set(result.map(n => n.schedule.at.getTime())).size, 64);
    const notYetDue = run([{ ...tire, remainingKm: 500 }], settings, center).notifications;
    assert.equal(notYetDue[1].schedule.at.getTime(), new Date(2026, 5, 20, 9).getTime());
    assert.equal(notYetDue[2].schedule.at.getTime(), new Date(2026, 5, 21, 9).getTime());
    assert.equal(run([tire], settings, { ...center, done: { [tire.id]: true } }).notifications.length, 0);
    assert.equal(run([], settings, center).notifications.length, 0);
});

test('due-day alerts use localized due-today text while advance notices retain the countdown', () => {
    try {
        for (const [language, label] of [['en', 'Due today'], ['zh', '今日到期']]) {
            context.store.data.settings.language = language;
            const reminder = { ...dateItem, meta: 'Due in 30d' };
            const result = run([reminder], { reminders: { license: { days: 7 } } }).notifications;
            assert.equal(result[0].body, 'Test Car • Reminder • Due in 30d');
            assert.equal(result[1].body, `Test Car • Reminder • ${label}`);
            const zero = run([reminder], { reminders: { license: { days: 0 } } }).notifications;
            assert.equal(zero.length, 1);
            assert.equal(zero[0].body, `Test Car • Reminder • ${label}`);
            assert.equal(run([]).notifications.length, 0);
        }
    } finally {
        context.store.data.settings.language = 'en';
    }
});

test('daily followups use localized overdue text rather than a stale countdown', () => {
    try {
        for (const [language, label] of [['en', 'Overdue'], ['zh', '已逾期']]) {
            context.store.data.settings.language = language;
            const reminder = { ...dateItem, meta: language === 'en' ? 'Due in 30 days' : '30 日後到期' };
            const settings = { notificationOverdueRepeat: 'daily', language };
            const result = run([reminder], settings).notifications;
            assert.equal(result[0].body, `Test Car • Reminder • ${language === 'en' ? 'Due today' : '今日到期'}`);
            assert.ok(result.slice(1).every(n => n.body === `Test Car • Reminder • ${label}`));
            const overdue = run([item('svc:overdue', { remainingKm: -1, meta: reminder.meta })], settings).notifications;
            assert.equal(overdue.find(n => n.schedule.repeats).body, `Test Car • Reminder • ${label}`);
            assert.equal(run([], settings).notifications.length, 0);
        }
    } finally {
        context.store.data.settings.language = 'en';
    }
});

test('daily followups reconstruct configured wall time after a DST-gap deadline', () => {
    const previous = process.env.TZ;
    try {
        for (const [zone, month, day] of [['America/New_York', 2, 8], ['Australia/Sydney', 9, 4]]) {
            process.env.TZ = zone;
            const due = new Date(2026, month, day, 12);
            const dueDateIso = context.FuelMateCore.localDateKey(due);
            const reminder = { ...dateItem, dueDateIso };
            const settings = { notificationOverdueRepeat: 'daily', notificationTime: '02:30', reminders: { license: { days: 0 } } };
            const result = plan({ items: [reminder] }, new Date(2026, month, 1, 12), settings).notifications;
            assert.equal(result.length, 64);
            assert.equal(result[0].schedule.at.getHours(), 3);
            assert.ok(result.slice(1).every(n => n.schedule.at.getHours() === 2 && n.schedule.at.getMinutes() === 30));
            assert.equal(result[1].schedule.at.getDate(), day + 1);
            assert.equal(new Set(result.map(n => context.FuelMateCore.localDateKey(n.schedule.at))).size, 64);
            const overdue = plan({ items: [item('svc:due', { remainingKm: -1 })] }, new Date(2026, month, day, 1), settings).notifications;
            const recurring = overdue.find(n => n.schedule.repeats);
            assert.equal(recurring.schedule.on.hour, 2);
            assert.equal(recurring.schedule.on.minute, 30);
            assert.equal(plan({ items: [] }, due, settings).notifications.length, 0);
        }
    } finally {
        if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
});

test('document offsets and separate due dates use local 09:00 with stable integer IDs', () => {
    const result = run([dateItem], { reminders: { license: { enabled: true, days: 7 } } });
    assert.deepEqual(Array.from(result.notifications, n => [n.schedule.at.getMonth(), n.schedule.at.getDate(), n.schedule.at.getHours()]), [[5, 24, 9], [6, 1, 9]]);
    assert.equal(result.notifications[0].title, 'FuelMate');
    assert.equal(result.notifications[0].body, 'Test Car • Reminder • Due');
    assert.ok(result.notifications.every(n => Number.isInteger(n.id) && n.id > 0 && n.id < 2147483647));
    assert.equal(notificationId('abc'), notificationId('abc'));
    assert.equal(run([dateItem], { reminders: { license: { days: 0 } } }).notifications.length, 1);
});

test('scheduled and delivered due alerts prevent a second overdue immediate notification', () => {
    const before = new Date(2026, 6, 1, 8);
    const after = new Date(2026, 6, 1, 10);
    const first = plan({ items: [dateItem] }, before, {});
    assert.equal(first.scheduledAlerts[dateItem.id], new Date(2026, 6, 1, 9).getTime());
    assert.equal(first.notifiedIds.length, 0);
    const settings = { nativeNotificationScheduledAlerts: first.scheduledAlerts };
    const second = plan({ items: [dateItem] }, after, settings);
    assert.equal(second.notifications.length, 0);
    assert.deepEqual(Array.from(second.notifiedIds), [dateItem.id]);
    assert.equal(plan({ items: [dateItem] }, after, {}, [], 64, first.notifications).notifications.length, 0);
    assert.equal(plan({ items: [dateItem] }, after, {}, first.notifications).notifications.length, 0);
    assert.equal(plan({ items: [dateItem] }, after, {}).notifications.length, 1);
    assert.equal(plan({ items: [dateItem] }, before, {}, [], 0).scheduledAlerts[dateItem.id], undefined);
    const advance = plan({ items: [dateItem] }, new Date(2026, 4, 1), {}).notifications[0];
    const advanced = plan({ items: [dateItem] }, before, {}, [], 64, [advance]);
    assert.equal(advanced.notifiedIds.length, 0);
    assert.equal(plan({ items: [] }, after, settings).notifiedIds.length, 0);
    assert.equal(Object.keys(plan({ items: [] }, after, settings).scheduledAlerts).length, 0);
});

test('past advance dates are skipped; overdue items notify only once', () => {
    const result = run([dateItem], { reminders: { license: { days: 60 } } });
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0].schedule.at.getMonth(), 6);
    const overdue = item('svc:v:dist:1000', { remainingKm: -10 });
    const first = run([overdue]);
    assert.equal(first.notifications.length, 1);
    assert.equal(first.notifications[0].schedule.at.getTime(), now.getTime() + 5000);
    assert.equal(run([overdue], { nativeNotificationNotifiedIds: first.notifiedIds }).notifications.length, 0);
    const pastDate = run([item('past', { dueDateIso: '2020-01-01' })]);
    assert.equal(pastDate.notifications.length, 1);
    assert.ok(pastDate.notifications[0].extra.immediate);
});

test('pending immediate notifications survive a resync before delivery', () => {
    const items = [item('backup:cycle')];
    const first = run(items);
    const second = run(items, { nativeNotificationNotifiedIds: first.notifiedIds }, {}, first.notifications);
    assert.equal(second.notifications.length, 1);
    assert.equal(second.notifications[0].id, first.notifications[0].id);
    assert.equal(second.notifications[0].schedule.at.getTime(), first.notifications[0].schedule.at.getTime());
});

test('all categories and vehicles produce notifications, including non-date reminders', () => {
    const items = [
        item('tire:v1:unset:front_left', { category: 'tire' }),
        item('svc:v2:dist:1000', { category: 'service', remainingKm: 0 }),
        { ...dateItem, category: 'docs' },
        item('backup:initial', { category: 'backup' }),
    ];
    const result = run(items);
    for (const entry of items) assert.ok(result.notifications.some(n => n.extra.reminderId === entry.id));
});

test('merged distance/time service reminders retain the time deadline even when the center prioritizes distance', () => {
    const result = run([item('svc:v:dist:1000', { category: 'service', dueDateIso: null, remainingDays: 40, remainingKm: 100 })]);
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0].schedule.at.getMonth(), 6);
    assert.equal(result.notifications[0].schedule.at.getDate(), 11);
    assert.equal(result.notifications[0].schedule.at.getHours(), 9);
    assert.equal(result.notifications[0].extra.immediate, false);
});

test('disabled document types and done/legacy done reminders are excluded and notified IDs cleared', () => {
    const doneItem = item('new', { legacyIds: ['old'] });
    const result = run([dateItem, doneItem], {
        reminders: { license: { enabled: false } },
        nativeNotificationNotifiedIds: ['old', 'new', 'resolved'],
    }, { done: { old: true } });
    assert.equal(result.notifications.length, 0);
    assert.equal(result.notifiedIds.length, 0);
});

test('snoozed reminders schedule at 09:00 instead of notifying immediately', () => {
    const reminder = item('backup:initial');
    const result = run([reminder], {}, { snoozedUntil: { [reminder.id]: new Date(2026, 5, 10, 12).toISOString() } });
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0].schedule.at.getDate(), 10);
    assert.equal(result.notifications[0].schedule.at.getHours(), 9);
    assert.equal(result.notifications[0].extra.immediate, false);
    const pastMorning = run([reminder], {}, { snoozedUntil: { [reminder.id]: new Date(2026, 5, 1, 18).toISOString() } });
    assert.equal(pastMorning.notifications.length, 1);
    assert.equal(pastMorning.notifications[0].extra.immediate, true);
});

test('snooze catch-up fires once, survives resync, and does not repeat after snooze expiry', () => {
    const reminder = item('doc:v:license:expired', { calendarType: 'license', dueDateIso: '2026-05-01' });
    const until = new Date(2026, 5, 1, 18).toISOString();
    const center = { items: [reminder], snoozedUntil: { [reminder.id]: until } };
    const first = plan(center, now, { nativeNotificationNotifiedIds: [reminder.id] });
    assert.equal(first.notifications.length, 1);
    assert.equal(first.notifications[0].schedule.at.getTime(), now.getTime() + 5000);
    const settings = { nativeNotificationNotifiedIds: first.notifiedIds, nativeNotificationScheduledAlerts: first.scheduledAlerts };
    const second = plan(center, now, settings, first.notifications);
    assert.equal(second.notifications.length, 1);
    assert.equal(second.notifications[0].id, first.notifications[0].id);
    assert.equal(second.notifications[0].schedule.at.getTime(), first.notifications[0].schedule.at.getTime());
    assert.equal(plan(center, new Date(now.getTime() + 10000), settings).notifications.length, 0);
    assert.equal(plan(center, new Date(2026, 5, 1, 19), settings).notifications.length, 0);
    const future = plan(center, new Date(2026, 5, 1, 8), {});
    assert.equal(plan(center, now, { nativeNotificationScheduledAlerts: future.scheduledAlerts }).notifications.length, 0);
    const changed = { ...center, snoozedUntil: { [reminder.id]: new Date(2026, 5, 1, 20).toISOString() } };
    assert.equal(plan(changed, now, settings).notifications.length, 1);
    assert.equal(plan(center, now, {}, [], 0).notifiedIds.length, 0);
    assert.equal(plan({ ...center, done: { [reminder.id]: true } }, now, settings).notifications.length, 0);
    assert.equal(plan({ items: [] }, now, settings).notifiedIds.length, 0);
    assert.equal(plan({ ...center, snoozedUntil: { [reminder.id]: 'invalid' } }, now, {}).notifications.length, 1);
});

test('an early snooze or advance alert does not consume a later mileage-overdue warning', () => {
    const reminder = item('tire:v:asset:front', { category: 'tire', dueDateIso: '2026-06-20', remainingKm: 500 });
    const center = { items: [reminder], snoozedUntil: { [reminder.id]: new Date(2026, 5, 2, 12).toISOString() } };
    const first = plan(center, now, {});
    const afterSnooze = new Date(2026, 5, 2, 13);
    const crossed = { ...center, items: [{ ...reminder, remainingKm: -1 }] };
    const later = plan(crossed, afterSnooze, { nativeNotificationScheduledAlerts: first.scheduledAlerts });
    assert.equal(later.notifications.filter(n => n.extra.immediate).length, 1);
    const delivered = plan(crossed, afterSnooze, {}, [], 64, first.notifications.filter(n => n.extra.fireAt <= afterSnooze));
    assert.equal(delivered.notifications.filter(n => n.extra.immediate).length, 1);
    const beforeCrossing = plan(center, new Date(2026, 5, 2, 10), { nativeNotificationScheduledAlerts: first.scheduledAlerts });
    assert.equal(beforeCrossing.notifiedIds.includes(reminder.id), false);
    const caughtUp = plan(center, new Date(2026, 5, 2, 10), {});
    assert.equal(caughtUp.notifiedIds.includes(reminder.id), false);
    const afterCatchUp = plan(crossed, afterSnooze, { nativeNotificationNotifiedIds: caughtUp.notifiedIds, nativeNotificationScheduledAlerts: caughtUp.scheduledAlerts });
    assert.equal(afterCatchUp.notifications.filter(n => n.extra.immediate).length, 1);
    const alreadyOverdue = plan({ ...center, items: [{ ...reminder, remainingKm: -1 }] }, now, {});
    const seen = plan(crossed, afterSnooze, { nativeNotificationScheduledAlerts: alreadyOverdue.scheduledAlerts });
    assert.equal(seen.notifications.filter(n => n.extra.immediate).length, 0);
    const undated = { ...reminder, dueDateIso: null, remainingDays: null };
    const notice = plan({ items: [undated] }, now, {});
    assert.equal(notice.notifiedIds.includes(undated.id), false);
    const reached = plan({ items: [{ ...undated, remainingKm: 0 }] }, afterSnooze, { nativeNotificationNotifiedIds: notice.notifiedIds });
    assert.equal(reached.notifications.filter(n => n.extra.immediate).length, 1);
    const advance = plan({ items: [reminder] }, now, { reminders: { tires: { days: 7 } } });
    assert.equal(advance.notifications[0].extra.notifiedKey, undefined);
    const afterAdvance = plan({ items: [{ ...reminder, remainingKm: -1 }] }, new Date(2026, 5, 14, 12), {
        nativeNotificationScheduledAlerts: advance.scheduledAlerts,
    }, [], 64, [advance.notifications[0]]);
    assert.equal(afterAdvance.notifications.filter(n => n.extra.immediate).length, 1);
    const undatedSnooze = plan({ ...center, items: [undated] }, now, {});
    const undatedSeen = plan({ ...center, items: [undated] }, afterSnooze, {
        nativeNotificationScheduledAlerts: undatedSnooze.scheduledAlerts,
    });
    assert.equal(undatedSeen.notifications.length, 0);
    assert.equal(plan({ items: [] }, afterSnooze, {}).notifications.length, 0);
});

test('native sync persists scheduled receipts and clears canceled future receipts when switched off', async () => {
    const callbacks = [];
    let pending = [];
    const settings = { nativeNotificationsEnabled: true };
    const saved = [];
    const nativeContext = vm.createContext({
        console, setTimeout: callback => { callbacks.push(callback); return 1; }, clearTimeout() {},
        Capacitor: { isNativePlatform: () => true, Plugins: { LocalNotifications: {
            addListener: async () => {}, checkPermissions: async () => ({ display: 'granted' }),
            getPending: async () => ({ notifications: pending }), getDeliveredNotifications: async () => ({ notifications: [] }),
            cancel: async () => { pending = []; }, schedule: async ({ notifications }) => { pending = notifications; },
        } } },
        document: { addEventListener() {} },
        store: { data: { settings }, saveData: async () => { saved.push(JSON.parse(JSON.stringify(settings))); } },
        ui: { getReminderCenterData: () => ({ items: [{ ...dateItem, dueDateIso: '2099-07-01' }] }) },
        utils: { t: key => key },
    });
    vm.runInContext(source, nativeContext);
    await nativeContext.FuelMateNativeNotifications.init();
    callbacks.shift()();
    await new Promise(setImmediate);
    assert.equal(pending.length, 2);
    assert.ok(settings.nativeNotificationScheduledAlerts[dateItem.id] > Date.now());
    settings.nativeNotificationsEnabled = false;
    nativeContext.FuelMateNativeNotifications.requestSync();
    callbacks.shift()();
    await new Promise(setImmediate);
    assert.equal(pending.length, 0);
    assert.equal(Object.keys(settings.nativeNotificationScheduledAlerts).length, 0);
    assert.ok(saved.length >= 2);
});

test('64 cap retains soonest notifications independent of input ordering and only marks selected states', () => {
    const items = Array.from({ length: 80 }, (_, i) => item('svc:' + i, { dueDateIso: '2026-09-' + String(1 + i % 28).padStart(2, '0') }));
    const result = run(items);
    assert.equal(result.notifications.length, 64);
    assert.equal(new Set(result.notifications.map(n => n.id)).size, 64);
    assert.deepEqual(Array.from(result.notifications, n => n.id), Array.from(run(items.reverse()).notifications, n => n.id));
    for (let i = 1; i < 64; i++) assert.ok(result.notifications[i].schedule.at >= result.notifications[i - 1].schedule.at);
    const immediate = run(Array.from({ length: 80 }, (_, i) => item('backup:' + i)));
    assert.equal(immediate.notifiedIds.length, 64);
});

test('empty and invalid date inputs do not produce invalid schedules', () => {
    assert.equal(run([]).notifications.length, 0);
    const result = run([item('invalid', { dueDateIso: 'not a date' })]);
    assert.ok(result.notifications.every(n => Number.isFinite(n.schedule.at.getTime())));
});

test('web init, sync requests and permission toggle are no-ops without native APIs', async () => {
    assert.equal(context.FuelMateNativeNotifications.isNative(), false);
    await context.FuelMateNativeNotifications.init();
    context.FuelMateNativeNotifications.requestSync();
    await context.FuelMateNativeNotifications.toggle();
});

test('native permission grant persists on; denial persists off and explains iOS settings', async () => {
    for (const display of ['granted', 'denied']) {
        let saved = 0;
        let rendered = 0;
        const alerts = [];
        const nativeContext = vm.createContext({
            console, setTimeout, clearTimeout,
            Capacitor: { isNativePlatform: () => true, Plugins: { LocalNotifications: { requestPermissions: async () => ({ display }) } } },
            store: { data: { settings: {} }, saveData: async () => { saved++; } },
            ui: { render: () => { rendered++; } },
            utils: { t: key => key },
            alert: message => alerts.push(message),
        });
        vm.runInContext(source, nativeContext);
        await nativeContext.FuelMateNativeNotifications.toggle();
        assert.equal(nativeContext.store.data.settings.nativeNotificationsEnabled, display === 'granted');
        assert.equal(saved, 1);
        assert.equal(rendered, 1);
        assert.equal(alerts.length, display === 'denied' ? 1 : 0);
    }
});

test('native permission API failures leave the preference unchanged', async () => {
    const nativeContext = vm.createContext({
        Capacitor: { isNativePlatform: () => true, Plugins: { LocalNotifications: { requestPermissions: async () => { throw new Error('permission API failed'); } } } },
        store: { data: { settings: { nativeNotificationsEnabled: false } } },
    });
    vm.runInContext(source, nativeContext);
    await assert.rejects(nativeContext.FuelMateNativeNotifications.toggle(), /permission API failed/);
    assert.equal(nativeContext.store.data.settings.nativeNotificationsEnabled, false);
});
