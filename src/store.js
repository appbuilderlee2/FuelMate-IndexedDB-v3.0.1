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
                this.data.vehicles.push(vehicle);
                if (!this.data.settings.activeVehicleId) {
                    this.data.settings.activeVehicleId = vehicle.id;
                    await this.saveData();
                }
                await this.runTransaction('vehicles', 'readwrite', s => s.put(vehicle));
            },

            async updateVehicle(vehicle) {
                const idx = this.data.vehicles.findIndex(v => v.id === vehicle.id);
                if (idx !== -1) {
                    this.data.vehicles[idx] = vehicle;
                    await this.runTransaction('vehicles', 'readwrite', s => s.put(vehicle));
                }
            },

            async deleteVehicle(id) {
                this.data.vehicles = this.data.vehicles.filter(v => v.id !== id);
                this.data.logs = this.data.logs.filter(l => l.vehicleId !== id);
                if (this.data.settings.activeVehicleId === id) {
                    this.data.settings.activeVehicleId = this.data.vehicles.length ? this.data.vehicles[0].id : null;
                    await this.saveData();
                }
                this._invalidateLogsCache();
                await this.runTransaction('vehicles', 'readwrite', s => s.delete(id));
                const tx = this.db.transaction('logs', 'readwrite');
                const logStore = tx.objectStore('logs');
                const idx = logStore.index('vehicleId');
                const keyRange = IDBKeyRange.only(id);
                const req = idx.openCursor(keyRange);
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) { cursor.delete(); cursor.continue(); }
                };
            },

            async addLog(log) {
                this.data.logs.push(log);
                await this.runTransaction('logs', 'readwrite', s => s.put(log));
                
                // Auto-update vehicle odometer
                const vehicle = this.data.vehicles.find(v => v.id === log.vehicleId);
                const odo = parseFloat(log.odometer) || 0;
                const current = parseFloat(vehicle?.currentOdometer) || 0;
                if (vehicle && odo > current) {
                    vehicle.currentOdometer = odo;
                    await this.updateVehicle(vehicle);
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
                    vehicle.currentOdometer = nextMax;
                    await this.updateVehicle(vehicle);
                }
            },

            async updateLog(log) {
                const idx = this.data.logs.findIndex(l => l.id === log.id);
                if (idx !== -1) {
                    const previous = this.data.logs[idx];
                    const previousVehicleId = previous.vehicleId;
                    const previousMax = this.getVehicleMaxLogOdometer(previousVehicleId);
                    this.data.logs[idx] = log;
                    await this.runTransaction('logs', 'readwrite', s => s.put(log));
                    if (!this._bulkImporting) this._invalidateLogsCache();
                    await this.reconcileVehicleOdometer(previousVehicleId, previousMax);
                    if (log.vehicleId !== previousVehicleId) await this.reconcileVehicleOdometer(log.vehicleId, null);
                }
            },

            async deleteLog(id) {
                const previous = this.data.logs.find(l => l.id === id);
                const previousMax = previous ? this.getVehicleMaxLogOdometer(previous.vehicleId) : null;
                this.data.logs = this.data.logs.filter(l => l.id !== id);
                await this.runTransaction('logs', 'readwrite', s => s.delete(id));
                if (!this._bulkImporting) this._invalidateLogsCache();
                if (previous) await this.reconcileVehicleOdometer(previous.vehicleId, previousMax);
            },

            async clearVehicleLogs(vehicleId) {
                this.data.logs = this.data.logs.filter(l => l.vehicleId !== vehicleId);
                if (!this._bulkImporting) this._invalidateLogsCache();
                const tx = this.db.transaction('logs', 'readwrite');
                const idx = tx.objectStore('logs').index('vehicleId');
                const req = idx.openCursor(IDBKeyRange.only(vehicleId));
                req.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) { cursor.delete(); cursor.continue(); }
                };
            },

            async importData(importedData, options = {}) {
                const { overwrite = false } = options;
                this._bulkImporting = true;
                if (overwrite) {
                    this.data.vehicles = [];
                    this.data.logs = [];
                    this.data.settings = { ...this.defaultSettings };
                    await this.clearAllData();
                }
                if (importedData.vehicles) {
                    for (const v of importedData.vehicles) await this.addVehicle(v);
                }
                if (importedData.logs) {
                    for (const l of importedData.logs) await this.addLog(l);
                }
                if (importedData.settings) {
                    this.data.settings = { ...this.data.settings, ...importedData.settings };
                    await this.saveData();
                }

                if (!this.data.settings.activeVehicleId && this.data.vehicles.length > 0) {
                    this.data.settings.activeVehicleId = this.data.vehicles[0].id;
                    await this.saveData();
                }
                this._bulkImporting = false;
                this._invalidateLogsCache();
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
