import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await fs.readFile(new URL('../src/core/native-notifications.js', import.meta.url), 'utf8');
const context = vm.createContext({ console, setTimeout, clearTimeout });
vm.runInContext(await fs.readFile(new URL('../src/core/calculations.js', import.meta.url), 'utf8'), context);
vm.runInContext(source, context);
const { plan, notificationId } = context.FuelMateNativeNotifications;
const now = new Date(2026, 5, 1, 12);
const item = (id, fields = {}) => ({ id, title: 'Reminder', vehicleLabel: 'Test Car', meta: 'Due', ...fields });
const run = (items, settings = {}, center = {}, pending = []) => plan({ items, ...center }, now, settings, pending);
const dateItem = item('doc:v:license:2026-07-01', { calendarType: 'license', dueDateIso: '2026-07-01' });

test('document offsets and separate due dates use local 09:00 with stable integer IDs', () => {
    const result = run([dateItem], { reminders: { license: { enabled: true, days: 7 } } });
    assert.deepEqual(Array.from(result.notifications, n => [n.schedule.at.getMonth(), n.schedule.at.getDate(), n.schedule.at.getHours()]), [[5, 24, 9], [6, 1, 9]]);
    assert.equal(result.notifications[0].title, 'FuelMate');
    assert.equal(result.notifications[0].body, 'Test Car • Reminder • Due');
    assert.ok(result.notifications.every(n => Number.isInteger(n.id) && n.id > 0 && n.id < 2147483647));
    assert.equal(notificationId('abc'), notificationId('abc'));
    assert.equal(run([dateItem], { reminders: { license: { days: 0 } } }).notifications.length, 1);
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
    assert.equal(pastMorning.notifications.length, 0);
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
