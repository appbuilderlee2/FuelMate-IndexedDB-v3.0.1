// --- INDEXEDDB STORE ---
        const store = {
            db: null,
            dbName: 'FuelMateDB',
            currentSchemaVersion: 2,
            defaultSettings: { currency: '$', units: 'metric', pressureUnit: 'kPa', language: 'en', maintenanceDist: 'none', maintenanceTime: 'none', tireReplaceDist: 40000, tireReplaceYears: 4, reminders: {}, reminderCenter: { snoozedUntil: {}, done: {} }, lastBackupDate: null, activeVehicleId: null },
            data: { vehicles: [], logs: [], settings: { currency: '$', units: 'metric', pressureUnit: 'kPa', language: 'en', maintenanceDist: 'none', maintenanceTime: 'none', tireReplaceDist: 40000, tireReplaceYears: 4, reminders: {}, reminderCenter: { snoozedUntil: {}, done: {} }, lastBackupDate: null, activeVehicleId: null } },
            pageFilters: { 
                dashboard: { mode: 'month', value: new Date().toISOString().slice(0, 7) }, 
                fuel: { mode: 'year', value: new Date().getFullYear().toString() }, 
                maintenance: { mode: 'year', value: new Date().getFullYear().toString() }, 
                parking: { mode: 'year', value: new Date().getFullYear().toString() }, 
                analytics: { mode: 'year', value: new Date().getFullYear().toString() },
                maintenanceSearch: '',
                maintenanceTypes: [],
                maintenanceView: 'all',
                fuelSearch: '',
                parkingSearch: '',
                analyticsSearch: '',
                fuelFrom: '',
                fuelTo: '',
                parkingFrom: '',
                parkingTo: '',
                maintenanceFrom: '',
                maintenanceTo: '',
                analyticsFrom: '',
                analyticsTo: '',
                fuelFlags: { full: false, partial: false },
                parkingFlags: { withLocation: false, withNotes: false },
                remindersTab: 'active'
            },
            pageLimits: { fuel: 100, maintenance: 100, parking: 100 },
            _logsVersion: 0,
            _cache: {
                logsSorted: new Map(),
                logSearchText: new Map(),
                filtered: new Map()
            },
            _bulkImporting: false,

            _invalidateLogsCache() {
                this._logsVersion += 1;
                this._cache.logsSorted.clear();
                this._cache.logSearchText.clear();
                this._cache.filtered.clear();
            },

            _getCachedFiltered(key, compute) {
                const fullKey = `${this._logsVersion}|${this.data.settings.activeVehicleId || 'none'}|${key}`;
                const cached = this._cache.filtered.get(fullKey);
                if (cached) return cached;
                const value = compute();
                this._cache.filtered.set(fullKey, value);
                return value;
            },

            getLogSearchText(log) {
                if (!log || !log.id) return '';
                const cached = this._cache.logSearchText.get(log.id);
                if (cached) return cached;
                const text = `${log.location || ''}\n${log.notes || ''}`.toLowerCase();
                this._cache.logSearchText.set(log.id, text);
                return text;
            },

            async init() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, 1);
                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains('vehicles')) db.createObjectStore('vehicles', { keyPath: 'id' });
                        if (!db.objectStoreNames.contains('logs')) {
                            const logsStore = db.createObjectStore('logs', { keyPath: 'id' });
                            logsStore.createIndex('vehicleId', 'vehicleId', { unique: false });
                            logsStore.createIndex('type', 'type', { unique: false });
                        }
                        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
                    };
                    request.onsuccess = async (event) => {
                        this.db = event.target.result;
                        await this.migrateFromLocalStorage(); 
                        await this.loadAllData();
                        resolve();
                    };
                    request.onerror = (e) => reject(e);
                });
            },

            async runTransaction(storeName, mode, callback) {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction(storeName, mode);
                    const store = tx.objectStore(storeName);
                    let request;
                    let result;
                    try {
                        request = callback(store, tx);
                    } catch (err) {
                        reject(err);
                        return;
                    }
                    if (request) {
                        request.onsuccess = () => { result = request.result; };
                        request.onerror = () => reject(request.error);
                    }
                    tx.oncomplete = () => resolve(result);
                    tx.onerror = () => reject(tx.error || new Error('Transaction failed'));
                    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
                });
            },

            async clearAllData() {
                return new Promise((resolve, reject) => {
                    const tx = this.db.transaction(['vehicles', 'logs', 'settings'], 'readwrite');
                    tx.objectStore('vehicles').clear();
                    tx.objectStore('logs').clear();
                    tx.objectStore('settings').clear();
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error || new Error('Clear failed'));
                    tx.onabort = () => reject(tx.error || new Error('Clear aborted'));
                });
            },

            async migrateFromLocalStorage() {
                const oldData = localStorage.getItem('fuelmate_data');
                if (oldData) {
                    try {
                        const parsed = JSON.parse(oldData);
                        await this.importData(parsed);
                        localStorage.removeItem('fuelmate_data'); 
                        console.log('Migrated from LocalStorage to IndexedDB');
                    } catch(e) { console.error('Migration failed', e); }
                }
            },

            async loadAllData() {
                this.data.vehicles = await this.runTransaction('vehicles', 'readonly', s => s.getAll());
                this.data.logs = await this.runTransaction('logs', 'readonly', s => s.getAll());
                const settings = await this.runTransaction('settings', 'readonly', s => s.get('global'));
                if (settings) this.data.settings = { ...this.data.settings, ...settings };
                
                // Ensure default settings
                if (!this.data.settings.activeVehicleId && this.data.vehicles.length > 0) {
                    this.data.settings.activeVehicleId = this.data.vehicles[0].id;
                }
                this._invalidateLogsCache();
                await this.migrateSchemaIfNeeded();
            },

            async migrateSchemaIfNeeded() {
                const raw = parseInt(this.data.settings.schemaVersion, 10);
                let schemaVersion = Number.isFinite(raw) ? raw : 1;
                let changedSettings = false;
                let updatedLogs = [];

                if (!this.data.settings.schemaVersion) {
                    this.data.settings.schemaVersion = schemaVersion;
                    changedSettings = true;
                }

                while (schemaVersion < this.currentSchemaVersion) {
                    if (schemaVersion === 1) {
                        if (!this.data.settings.pressureUnit) {
                            this.data.settings.pressureUnit = (this.data.settings.units === 'imperial') ? 'psi' : 'kPa';
                            changedSettings = true;
                        }
                        for (const log of this.data.logs) {
                            if (log && log.type === 'tire_replace' && (log.tirePressureKpa === undefined || log.tirePressureKpa === null || log.tirePressureKpa === '') && log.tirePressure !== undefined && log.tirePressure !== null && log.tirePressure !== '') {
                                const kpa = utils.pressureToKpa(log.tirePressure, 'psi');
                                if (kpa !== null) {
                                    log.tirePressureKpa = kpa.toFixed(1);
                                    updatedLogs.push(log);
                                }
                            }
                        }
                        schemaVersion = 2;
                        continue;
                    }
                    schemaVersion = this.currentSchemaVersion;
                }

                if (schemaVersion !== parseInt(this.data.settings.schemaVersion, 10)) {
                    this.data.settings.schemaVersion = schemaVersion;
                    changedSettings = true;
                }

                if (updatedLogs.length) {
                    await new Promise((resolve, reject) => {
                        const tx = this.db.transaction('logs', 'readwrite');
                        const s = tx.objectStore('logs');
                        for (const l of updatedLogs) s.put(l);
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject(tx.error || new Error('Migration log update failed'));
                        tx.onabort = () => reject(tx.error || new Error('Migration log update aborted'));
                    });
                    this._invalidateLogsCache();
                }

                if (changedSettings) {
                    await this.saveData();
                }
            },

            async saveData() {
                await this.runTransaction('settings', 'readwrite', s => s.put({ id: 'global', ...this.data.settings }));
            },

            async addVehicle(vehicle) {
                const shouldActivate = !this.data.settings.activeVehicleId;
                const nextSettings = shouldActivate ? { ...this.data.settings, activeVehicleId: vehicle.id } : this.data.settings;
                await new Promise((resolve, reject) => {
                    const tx = this.db.transaction(['vehicles', 'settings'], 'readwrite');
                    tx.objectStore('vehicles').put(vehicle);
                    if (shouldActivate) tx.objectStore('settings').put({ id: 'global', ...nextSettings });
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error || new Error('Add vehicle failed'));
                    tx.onabort = () => reject(tx.error || new Error('Add vehicle aborted'));
                });
                this.data.vehicles.push(vehicle);
                if (shouldActivate) this.data.settings = nextSettings;
            },

            async updateVehicle(vehicle) {
                const idx = this.data.vehicles.findIndex(v => v.id === vehicle.id);
                if (idx !== -1) {
                    await this.runTransaction('vehicles', 'readwrite', s => s.put(vehicle));
                    this.data.vehicles[idx] = vehicle;
                }
            },

            async deleteVehicle(id) {
                const nextVehicles = this.data.vehicles.filter(v => v.id !== id);
                const nextLogs = this.data.logs.filter(l => l.vehicleId !== id);
                const nextSettings = this.data.settings.activeVehicleId === id
                    ? { ...this.data.settings, activeVehicleId: nextVehicles[0]?.id || null }
                    : this.data.settings;
                await new Promise((resolve, reject) => {
                    const tx = this.db.transaction(['vehicles', 'logs', 'settings'], 'readwrite');
                    tx.objectStore('vehicles').delete(id);
                    tx.objectStore('settings').put({ id: 'global', ...nextSettings });
                    const idx = tx.objectStore('logs').index('vehicleId');
                    const req = idx.openCursor(IDBKeyRange.only(id));
                    req.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (cursor) { cursor.delete(); cursor.continue(); }
                    };
                    req.onerror = () => reject(req.error || new Error('Delete vehicle logs failed'));
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error || new Error('Delete vehicle failed'));
                    tx.onabort = () => reject(tx.error || new Error('Delete vehicle aborted'));
                });
                this.data.vehicles = nextVehicles;
                this.data.logs = nextLogs;
                this.data.settings = nextSettings;
                this._invalidateLogsCache();
            },

            async addLog(log) {
                await this.runTransaction('logs', 'readwrite', s => s.put(log));
                this.data.logs.push(log);
                
                // Auto-update vehicle odometer
                const vehicle = this.data.vehicles.find(v => v.id === log.vehicleId);
                const odo = parseFloat(log.odometer) || 0;
                const current = parseFloat(vehicle?.currentOdometer) || 0;
                if (vehicle && odo > current) {
                    await this.updateVehicle({ ...vehicle, currentOdometer: odo });
                }
                if (!this._bulkImporting) this._invalidateLogsCache();
            },

            getVehicleMaxLogOdometer(vehicleId) {
                const values = this.data.logs
                    .filter(l => l.vehicleId === vehicleId)
                    .map(l => parseFloat(l.odometer))
                    .filter(Number.isFinite);
                return values.length ? Math.max(0, ...values) : 0;
            },

            async reconcileVehicleOdometer(vehicleId, previousMax) {
                const vehicle = this.data.vehicles.find(v => v.id === vehicleId);
                if (!vehicle) return;
                const current = parseFloat(vehicle.currentOdometer) || 0;
                const nextMax = this.getVehicleMaxLogOdometer(vehicleId);
                const shouldIncrease = nextMax > current;
                const shouldCorrectDerivedMaximum = Number.isFinite(previousMax) && current === previousMax && nextMax < current;
                if (shouldIncrease || shouldCorrectDerivedMaximum) {
                    await this.updateVehicle({ ...vehicle, currentOdometer: nextMax });
                }
            },

            async updateLog(log) {
                const idx = this.data.logs.findIndex(l => l.id === log.id);
                if (idx !== -1) {
                    const previous = this.data.logs[idx];
                    const previousVehicleId = previous.vehicleId;
                    const previousMax = this.getVehicleMaxLogOdometer(previousVehicleId);
                    await this.runTransaction('logs', 'readwrite', s => s.put(log));
                    this.data.logs[idx] = log;
                    if (!this._bulkImporting) this._invalidateLogsCache();
                    await this.reconcileVehicleOdometer(previousVehicleId, previousMax);
                    if (log.vehicleId !== previousVehicleId) await this.reconcileVehicleOdometer(log.vehicleId, null);
                }
            },

            async deleteLog(id) {
                const previous = this.data.logs.find(l => l.id === id);
                const previousMax = previous ? this.getVehicleMaxLogOdometer(previous.vehicleId) : null;
                await this.runTransaction('logs', 'readwrite', s => s.delete(id));
                this.data.logs = this.data.logs.filter(l => l.id !== id);
                if (!this._bulkImporting) this._invalidateLogsCache();
                if (previous) await this.reconcileVehicleOdometer(previous.vehicleId, previousMax);
            },

            async clearVehicleLogs(vehicleId) {
                await new Promise((resolve, reject) => {
                    const tx = this.db.transaction('logs', 'readwrite');
                    const idx = tx.objectStore('logs').index('vehicleId');
                    const req = idx.openCursor(IDBKeyRange.only(vehicleId));
                    req.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) { cursor.delete(); cursor.continue(); }
                    };
                    req.onerror = () => reject(req.error || new Error('Clear vehicle logs failed'));
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error || new Error('Clear vehicle logs failed'));
                    tx.onabort = () => reject(tx.error || new Error('Clear vehicle logs aborted'));
                });
                this.data.logs = this.data.logs.filter(l => l.vehicleId !== vehicleId);
                if (!this._bulkImporting) this._invalidateLogsCache();
            },

            async importData(importedData, options = {}) {
                const { overwrite = false } = options;
                this._bulkImporting = true;
                try {
                    const incomingVehicles = Array.isArray(importedData.vehicles) ? importedData.vehicles : [];
                    const incomingLogs = Array.isArray(importedData.logs) ? importedData.logs : [];
                    const mergeById = (current, incoming) => {
                        const merged = new Map(current.map(item => [item.id, item]));
                        for (const item of incoming) merged.set(item.id, item);
                        return Array.from(merged.values());
                    };
                    const nextVehicles = overwrite ? [...incomingVehicles] : mergeById(this.data.vehicles, incomingVehicles);
                    const nextLogs = overwrite ? [...incomingLogs] : mergeById(this.data.logs, incomingLogs);
                    const settingsBase = overwrite ? this.defaultSettings : this.data.settings;
                    const nextSettings = { ...settingsBase, ...(importedData.settings || {}) };
                    if (!nextVehicles.some(v => v.id === nextSettings.activeVehicleId)) {
                        nextSettings.activeVehicleId = nextVehicles[0]?.id || null;
                    }

                    await new Promise((resolve, reject) => {
                        const tx = this.db.transaction(['vehicles', 'logs', 'settings'], 'readwrite');
                        const vehicleStore = tx.objectStore('vehicles');
                        const logStore = tx.objectStore('logs');
                        const settingsStore = tx.objectStore('settings');
                        if (overwrite) {
                            vehicleStore.clear();
                            logStore.clear();
                            settingsStore.clear();
                        }
                        for (const vehicle of incomingVehicles) vehicleStore.put(vehicle);
                        for (const log of incomingLogs) logStore.put(log);
                        settingsStore.put({ id: 'global', ...nextSettings });
                        tx.oncomplete = () => resolve();
                        tx.onerror = () => reject(tx.error || new Error('Import transaction failed'));
                        tx.onabort = () => reject(tx.error || new Error('Import transaction aborted'));
                    });

                    this.data.vehicles = nextVehicles;
                    this.data.logs = nextLogs;
                    this.data.settings = nextSettings;
                    this._invalidateLogsCache();
                } finally {
                    this._bulkImporting = false;
                }
            },

            getActiveVehicle() {
                return this.data.vehicles.find(v => v.id === this.data.settings.activeVehicleId);
            },
            
            getVehicleLogs(type = null) {
                const vehicleId = this.data.settings.activeVehicleId;
                const key = `${vehicleId || 'none'}|${type || '*'}|${this._logsVersion}`;
                const cached = this._cache.logsSorted.get(key);
                if (cached) return cached;
                let logs = this.data.logs.filter(l => l.vehicleId === vehicleId);
                if (type) logs = logs.filter(l => l.type === type);
                logs = logs.sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first
                this._cache.logsSorted.set(key, logs);
                return logs;
            }
        };
