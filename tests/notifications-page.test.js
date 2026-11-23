import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

test('advance-day selectors have distinct localized category names with legacy settings', async () => {
    const context = vm.createContext({ ui: {}, store: { data: { settings: {} } }, document: { querySelector: () => null } });
    for (const file of ['translations', 'utils', 'core/native-notifications', 'ui/pages/notifications']) {
        vm.runInContext(await fs.readFile(new URL(`../src/${file}.js`, import.meta.url), 'utf8'), context);
    }
    for (const [language, advance] of [['en', 'Advance notice'], ['zh', '提前提醒']]) {
        context.store.data.settings.language = language;
        const html = context.ui.renderNotifications();
        const names = [...html.matchAll(/<select aria-label="([^"]+)" data-testid="notification-days-([^"]+)"/g)];
        assert.equal(names.length, 6);
        assert.equal(new Set(names.map(match => match[1])).size, 6);
        for (const [, name, type] of names) {
            const key = { tires: 'reminder_tires', service: 'reminder_service', backup: 'reminder_backup' }[type] || type;
            assert.equal(name, `${vm.runInContext(`utils.t('${key}')`, context)} ${advance}`);
        }
        assert.equal(html.includes('data-testid="native-notifications-toggle"'), false);
    }
});
