const FuelMateAppearance = (() => {
            const allowed = new Set(['apple-fluid-light', 'apple-fluid-dark', 'apple-fluid-system']);
            const media = window.matchMedia('(prefers-color-scheme: dark)');
            let current = 'apple-fluid-system';

            const normalize = value => allowed.has(value) ? value : 'apple-fluid-system';
            const resolve = value => value === 'apple-fluid-dark' || (value === 'apple-fluid-system' && media.matches) ? 'dark' : 'light';
            const apply = value => {
                current = normalize(value);
                const scheme = resolve(current);
                document.documentElement.dataset.appearance = current;
                document.documentElement.dataset.colorScheme = scheme;
                document.documentElement.style.colorScheme = scheme;
                document.querySelector('meta[name="theme-color"]')?.setAttribute('content', scheme === 'dark' ? '#07111f' : '#e9f7f7');
                try { localStorage.setItem('fuelmate_appearance', current); } catch (_) {}
                return current;
            };
            media.addEventListener?.('change', () => { if (current === 'apple-fluid-system') apply(current); });
            return Object.freeze({ apply, normalize, resolve });
        })();
        window.FuelMateAppearance = FuelMateAppearance;

const router = {
            currentPage: 'dashboard',
            navigate(page) {
                this.currentPage = page;
                ui.render();
            }
        };

        window.ui = ui;
        window.store = store;
        window.utils = utils;
        window.router = router;

        window.addEventListener('DOMContentLoaded', () => {
            FuelMateEvents.init();
            ui.init();
        });
        document.addEventListener('click', (event) => {
            if (event.target.closest('a')) return;
            const target = event.target.closest('[data-action="edit-log"]');
            if (!target) return;
            event.preventDefault();
            const id = target.getAttribute('data-log-id');
            if (!id) return;
            ui.openLogEditorById(id);
        }, true);

        const setPieActive = (label) => {
            const list = document.getElementById('pie-breakdown');
            if (list) {
                const items = list.querySelectorAll('[data-pie-item]');
                items.forEach((el) => {
                    const isActive = el.getAttribute('data-pie-item') === label;
                    el.style.fontSize = isActive ? '13px' : '11px';
                    el.style.fontWeight = isActive ? '800' : '600';
                    el.style.opacity = isActive ? '1' : '0.6';
                });
            }
            const slices = document.querySelectorAll('path[data-pie-label]');
            slices.forEach((el) => {
                const isActive = el.getAttribute('data-pie-label') === label;
                el.style.opacity = isActive ? '1' : '0.35';
            });
        };

        const clearPieActive = () => {
            const list = document.getElementById('pie-breakdown');
            if (list) {
                const items = list.querySelectorAll('[data-pie-item]');
                items.forEach((el) => {
                    el.style.fontSize = '';
                    el.style.fontWeight = '';
                    el.style.opacity = '';
                });
            }
            const slices = document.querySelectorAll('path[data-pie-label]');
            slices.forEach((el) => {
                el.style.opacity = '';
            });
        };

        document.addEventListener('click', (event) => {
            const rect = event.target.closest('rect[data-label-id]');
            if (!rect) return;
            const svg = rect.closest('svg');
            if (!svg) return;
            const label = rect.getAttribute('data-label') || '';
            const value = rect.getAttribute('data-value') || '';
            const month = rect.getAttribute('data-month') || '';
            let tip = document.getElementById('chart-tooltip');
            if (!tip) {
                tip = document.createElement('div');
                tip.id = 'chart-tooltip';
                tip.style.position = 'fixed';
                tip.style.zIndex = '60';
                tip.style.background = 'var(--bg-card)';
                tip.style.color = 'var(--text-heading)';
                tip.style.border = '1px solid var(--border-color)';
                tip.style.boxShadow = '0 10px 25px rgba(15, 23, 42, 0.15)';
                tip.style.borderRadius = '12px';
                tip.style.padding = '8px 10px';
                tip.style.fontSize = '12px';
                tip.style.fontWeight = '700';
                tip.style.pointerEvents = 'none';
                tip.style.opacity = '0';
                tip.style.transition = 'opacity 150ms ease';
                document.body.appendChild(tip);
            }
            tip.innerHTML = `
                <div style="font-size:10px; font-weight:600; color: var(--text-sub);">${month}月</div>
                <div style="font-size:12px; font-weight:800;">${label}</div>
                <div style="font-size:13px; font-weight:800; margin-top:2px;">${value}</div>
            `;
            const rectBox = rect.getBoundingClientRect();
            const tipBox = tip.getBoundingClientRect();
            const top = Math.max(12, rectBox.top - tipBox.height - 8);
            const left = Math.min(
                window.innerWidth - tipBox.width - 12,
                Math.max(12, rectBox.left + rectBox.width / 2 - tipBox.width / 2)
            );
            tip.style.top = `${top}px`;
            tip.style.left = `${left}px`;
            requestAnimationFrame(() => {
                tip.style.opacity = '1';
            });
        });

        const setMonthlySeriesActive = (series) => {
            const bars = document.querySelectorAll('rect[data-series]');
            bars.forEach((el) => {
                const isActive = el.getAttribute('data-series') === series;
                el.style.opacity = isActive ? '1' : '0.35';
            });
        };

        const setMonthlyMonthActive = (monthIndex) => {
            const bars = document.querySelectorAll('rect[data-month-index]');
            bars.forEach((el) => {
                const isActive = el.getAttribute('data-month-index') === String(monthIndex);
                el.style.opacity = isActive ? '1' : '0.35';
            });
        };

        const clearMonthlyHighlight = () => {
            const bars = document.querySelectorAll('rect[data-series], rect[data-month-index]');
            bars.forEach((el) => {
                el.style.opacity = '';
            });
        };

        document.addEventListener('click', (event) => {
            const slice = event.target.closest('path[data-pie-label]');
            if (!slice) return;
            const label = slice.getAttribute('data-pie-label') || '';
            const value = slice.getAttribute('data-pie-value') || '';
            setPieActive(label);
            let tip = document.getElementById('chart-tooltip');
            if (!tip) {
                tip = document.createElement('div');
                tip.id = 'chart-tooltip';
                tip.style.position = 'fixed';
                tip.style.zIndex = '60';
                tip.style.background = 'var(--bg-card)';
                tip.style.color = 'var(--text-heading)';
                tip.style.border = '1px solid var(--border-color)';
                tip.style.boxShadow = '0 10px 25px rgba(15, 23, 42, 0.15)';
                tip.style.borderRadius = '12px';
                tip.style.padding = '8px 10px';
                tip.style.fontSize = '12px';
                tip.style.fontWeight = '700';
                tip.style.pointerEvents = 'none';
                tip.style.opacity = '0';
                tip.style.transition = 'opacity 150ms ease';
                document.body.appendChild(tip);
            }
            tip.innerHTML = `
                <div style="font-size:12px; font-weight:800;">${label}</div>
                <div style="font-size:13px; font-weight:800; margin-top:2px;">${value}</div>
            `;
            const tipBox = tip.getBoundingClientRect();
            const top = Math.max(12, event.clientY - tipBox.height - 12);
            const left = Math.min(
                window.innerWidth - tipBox.width - 12,
                Math.max(12, event.clientX - tipBox.width / 2)
            );
            tip.style.top = `${top}px`;
            tip.style.left = `${left}px`;
            requestAnimationFrame(() => {
                tip.style.opacity = '1';
            });
        });

        document.addEventListener('click', (event) => {
            const btn = event.target.closest('[data-action="reminder-calendar"]');
            if (!btn) return;
            const title = decodeURIComponent(btn.getAttribute('data-title') || '');
            const dateIso = btn.getAttribute('data-date') || '';
            const type = btn.getAttribute('data-type') || '';
            ui.openReminderCalendarSelector({ title, dateIso, type });
        });

        document.addEventListener('click', (event) => {
            const item = event.target.closest('[data-pie-item]');
            if (!item) return;
            const label = item.getAttribute('data-pie-item') || '';
            const value = item.getAttribute('data-pie-value') || '';
            setPieActive(label);
            const slice = document.querySelector(`path[data-pie-label="${label}"]`);
            const box = slice ? slice.getBoundingClientRect() : item.getBoundingClientRect();
            let tip = document.getElementById('chart-tooltip');
            if (!tip) {
                tip = document.createElement('div');
                tip.id = 'chart-tooltip';
                tip.style.position = 'fixed';
                tip.style.zIndex = '60';
                tip.style.background = 'var(--bg-card)';
                tip.style.color = 'var(--text-heading)';
                tip.style.border = '1px solid var(--border-color)';
                tip.style.boxShadow = '0 10px 25px rgba(15, 23, 42, 0.15)';
                tip.style.borderRadius = '12px';
                tip.style.padding = '8px 10px';
                tip.style.fontSize = '12px';
                tip.style.fontWeight = '700';
                tip.style.pointerEvents = 'none';
                tip.style.opacity = '0';
                tip.style.transition = 'opacity 150ms ease';
                document.body.appendChild(tip);
            }
            tip.innerHTML = `
                <div style="font-size:12px; font-weight:800;">${label}</div>
                <div style="font-size:13px; font-weight:800; margin-top:2px;">${value}</div>
            `;
            const tipBox = tip.getBoundingClientRect();
            const top = Math.max(12, box.top - tipBox.height - 12);
            const left = Math.min(
                window.innerWidth - tipBox.width - 12,
                Math.max(12, box.left + box.width / 2 - tipBox.width / 2)
            );
            tip.style.top = `${top}px`;
            tip.style.left = `${left}px`;
            requestAnimationFrame(() => {
                tip.style.opacity = '1';
            });
        });

        document.addEventListener('click', (event) => {
            if (event.target.closest('rect[data-label-id]')) return;
            if (event.target.closest('path[data-pie-label]')) return;
            if (event.target.closest('[data-pie-item]')) return;
            const tip = document.getElementById('chart-tooltip');
            if (!tip) return;
            tip.style.opacity = '0';
            setTimeout(() => {
                if (tip.parentNode) tip.parentNode.removeChild(tip);
            }, 160);
            clearPieActive();
            clearMonthlyHighlight();
        });

        document.addEventListener('click', (event) => {
            const legend = event.target.closest('[data-series]');
            if (!legend) return;
            const series = legend.getAttribute('data-series');
            if (!series) return;
            setMonthlySeriesActive(series);
        });

        document.addEventListener('click', (event) => {
            const bar = event.target.closest('rect[data-month-index]');
            if (!bar) return;
            const monthIndex = bar.getAttribute('data-month-index');
            if (!monthIndex) return;
            setMonthlyMonthActive(monthIndex);
        });

        document.addEventListener('mousemove', (event) => {
            const bar = event.target.closest('rect[data-month-index]');
            if (!bar) return;
            const monthIndex = bar.getAttribute('data-month-index');
            if (!monthIndex) return;
            setMonthlyMonthActive(monthIndex);
        });

        const showPwaStatus = (message, options = {}) => {
            let banner = document.getElementById('pwa-status-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'pwa-status-banner';
                banner.setAttribute('role', 'status');
                banner.className = 'fixed left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100%-1.5rem)] rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold shadow-xl flex items-center gap-3 pointer-events-auto';
                banner.style.top = 'calc(env(safe-area-inset-top, 0px) + 0.75rem)';
                document.body.appendChild(banner);
            }
            banner.replaceChildren();
            const text = document.createElement('span');
            text.textContent = message;
            banner.appendChild(text);
            if (options.actionLabel && typeof options.onAction === 'function') {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = options.actionLabel;
                button.className = 'rounded-lg bg-teal-500 px-2 py-1 text-white whitespace-nowrap';
                button.addEventListener('click', options.onAction, { once: true });
                banner.appendChild(button);
            }
            banner.classList.remove('hidden');
            if (!options.persistent) {
                clearTimeout(showPwaStatus._timer);
                showPwaStatus._timer = setTimeout(() => banner.classList.add('hidden'), options.duration || 2200);
            }
        };

        const updateNetworkStatus = () => {
            if (!navigator.onLine) {
                showPwaStatus(utils.t('offline_mode'), { persistent: true });
                return;
            }
            const banner = document.getElementById('pwa-status-banner');
            if (banner && !banner.classList.contains('hidden')) showPwaStatus(utils.t('back_online'));
        };
        window.addEventListener('offline', updateNetworkStatus);
        window.addEventListener('online', updateNetworkStatus);
        if (!navigator.onLine) updateNetworkStatus();

        if ('serviceWorker' in navigator) {
            const hadController = Boolean(navigator.serviceWorker.controller);
            const showUpdateReady = () => showPwaStatus(utils.t('update_available'), {
                persistent: true,
                actionLabel: utils.t('reload_now'),
                onAction: () => window.location.reload()
            });
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data?.type === 'APP_SHELL_UPDATED') showUpdateReady();
            });
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (hadController) showUpdateReady();
            });
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(err => console.error('Service Worker registration failed', err));
            });
        }
