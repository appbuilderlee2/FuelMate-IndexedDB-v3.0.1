// Vehicle tools share the existing logs store; no database migration required.
globalThis.FuelMateDriving = Object.freeze({
    items: ['oil_change', 'transmission_fluid', 'battery', 'tire_replace'],
    timeline(logs) {
        return this.items.map(item => ({ item, logs: logs.filter(l =>
            item === 'tire_replace' ? l.type === 'tire_replace' :
            ['service', 'repair', 'periodic_maintenance'].includes(l.type) && Array.isArray(l.maintenanceItems) && l.maintenanceItems.includes(item)
        ).slice().sort((a,b) => b.date.localeCompare(a.date) || Number(b.odometer) - Number(a.odometer)) }));
    },
    monthly(logs, month) {
        const totals = { fuel: 0, maintenance: 0, insurance: 0, registration: 0, parking: 0, other: 0 };
        for (const log of logs.filter(l => l.type !== 'trip' && l.date?.slice(0,7) === month)) {
            const category = ['fuel','insurance','registration','parking'].includes(log.type) ? log.type
                : ['service','repair','periodic_maintenance','tire_replace','tire_rotation','car_wash','car_accessories'].includes(log.type) ? 'maintenance' : 'other';
            const cost = Number(log.cost);
            if (Number.isFinite(cost) && cost >= 0) totals[category] += cost;
        }
        return { ...totals, total: Object.values(totals).reduce((a,b) => a+b, 0) };
    },
    estimate(distance, efficiency, price, mpg = false) {
        if (![distance,efficiency,price].every(n => Number.isFinite(n) && n > 0)) return null;
        const amount = mpg ? distance / efficiency : distance * efficiency / 100;
        return { amount, cost: amount * price };
    },
    tripError(log, others = []) {
        if (!FuelMateCore.isValidIsoDate(log.date) || log.date > FuelMateCore.localDateKey()) return 'date';
        if (![log.startOdometer,log.odometer].every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0) || log.odometer <= log.startOdometer) return 'range';
        if (!['work','private'].includes(log.tripKind)) return 'kind';
        if (typeof log.purpose !== 'string' || !log.purpose.trim() || log.purpose.length > 300) return 'purpose';
        if (others.some(l => l.type === 'trip' && l.id !== log.id && l.vehicleId === log.vehicleId && log.startOdometer < Number(l.odometer) && log.odometer > Number(l.startOdometer))) return 'overlap';
        if (others.some(l => l.vehicleId === log.vehicleId && l.id !== log.id && l.odometer !== '' && l.odometer != null && Number.isFinite(Number(l.odometer)) && ((l.date < log.date && Number(l.odometer) > log.startOdometer) || (l.date > log.date && Number(l.odometer) < log.odometer)))) return 'order';
        return '';
    },
    csv(logs, unit, vehicleName) {
        const cell = value => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
        return '\ufeff' + [['Vehicle','Date','Kind','Purpose','Start ODO','End ODO','Distance','Unit'], ...logs.map(l => [vehicleName,l.date,l.tripKind,l.purpose,l.startOdometer,l.odometer,Number((l.odometer-l.startOdometer).toFixed(3)),unit])].map(row => row.map(cell).join(',')).join('\r\n');
    }
});

Object.assign(ui, {
    drivingText(zh, en) { return store.data.settings.language === 'zh' ? zh : en; },
    drivingButton(method, label, id = '') {
        return `<button data-testid="${method}" data-action="ui" data-ui-method="${method}" data-ui-args="${encodeURIComponent(JSON.stringify(id ? [id] : []))}" class="p-3 rounded-xl border theme-border font-bold text-sm">${label}</button>`;
    },
    drivingField(id, label, type, value = '') {
        return `<label class="block text-sm mb-3">${label}<input id="${id}" type="${type}" ${type === 'number' ? 'min="0" step="any"' : ''} value="${utils.escapeAttr(value)}" class="block w-full p-3 rounded-xl mt-1"></label>`;
    },
    openMaintenanceTimeline() {
        const timeline = FuelMateDriving.timeline(store.getVehicleLogs());
        this.openModal(`<h2 class="text-xl font-bold mb-4">${this.drivingText('保養時間線','Maintenance timeline')}</h2>
            <div data-testid="maintenance-timeline" class="space-y-3">${timeline.map(({item,logs}) => `<section class="p-3 rounded-xl border theme-border"><h3 class="font-bold">${utils.t(item)}</h3>${logs.length ? `<div class="text-sm mt-2">${utils.formatDate(logs[0].date)} · ${utils.escapeHtml(logs[0].odometer)} ${utils.getDistUnit()}</div>${this.drivingButton('openLogEditorById',utils.t('edit'),logs[0].id)}<details class="mt-2"><summary class="text-sm">${this.drivingText('歷史紀錄','History')} (${logs.length})</summary>${logs.map(l=>`<div class="flex justify-between items-center gap-2 mt-2 text-sm"><span>${utils.formatDate(l.date)} · ${utils.escapeHtml(l.odometer)} ${utils.getDistUnit()}</span>${this.drivingButton('openLogEditorById',utils.t('edit'),l.id)}</div>`).join('')}</details>` : `<p class="text-sm theme-text-sub mt-2">${this.drivingText('尚未記錄','Not recorded')}</p>`}</section>`).join('')}</div>
            <div class="mt-4">${this.drivingButton('openAddService',utils.t('add_service'))}</div>`);
    },
    openMonthlyCosts(month) {
        month = /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : FuelMateCore.localDateKey().slice(0,7);
        const totals = FuelMateDriving.monthly(store.getVehicleLogs(), month);
        this.openModal(`<h2 class="text-xl font-bold mb-4">${this.drivingText('每月養車成本','Monthly ownership cost')}</h2><input aria-label="Month" type="month" value="${month}" data-change-action="ui" data-ui-method="openMonthlyCosts" data-ui-pass-value="true" class="w-full p-3 rounded-xl mb-4">
            <div data-testid="monthly-total" class="text-3xl font-bold mb-1">${utils.formatCurrency(totals.total)}</div><div class="text-xs theme-text-sub mb-4">${this.drivingText('當月實付','Paid this month')}</div>
            <div data-testid="monthly-costs" class="space-y-3">${Object.entries(totals).filter(([k])=>k!=='total').map(([k,v])=>`<div data-cost-category="${k}" class="flex justify-between gap-3"><span>${k==='other'?this.drivingText('其他','Other'):utils.t(k)}</span><strong>${utils.formatCurrency(v)}</strong></div>`).join('')}</div>`);
    },
    openTripEstimate() {
        const logs = store.getVehicleLogs('fuel');
        const segments = FuelMateCore.buildFuelEfficiencySegments(logs);
        const distance = segments.reduce((s,l)=>s+l.distance,0), fuel = segments.reduce((s,l)=>s+l.fuel,0);
        const mpg = utils.getDistUnit() === 'mi' && utils.getFuelUnit() === 'Gal';
        const efficiency = distance > 0 && fuel > 0 ? (mpg ? distance/fuel : fuel/distance*100).toFixed(2) : '';
        const latest = logs.find(l=>Number(l.liters)>0 && Number(l.cost)>0);
        this.openModal(`<h2 class="text-xl font-bold mb-4">${this.drivingText('行程油費估算','Trip fuel estimate')}</h2>
            ${this.drivingField('estimate_distance',`${this.drivingText('預計距離','Distance')} (${utils.getDistUnit()})`,'number')}
            ${this.drivingField('estimate_efficiency',`${this.drivingText('油耗','Efficiency')} (${utils.getEfficiencyLabel()})`,'number',efficiency)}
            ${this.drivingField('estimate_price',`${utils.t('price_unit')} (${utils.getFuelUnit()})`,'number',latest?(Number(latest.cost)/Number(latest.liters)).toFixed(3):'')}
            <label class="flex gap-2 mb-4"><input id="estimate_return" type="checkbox">${this.drivingText('來回（距離 × 2）','Return trip (distance × 2)')}</label>
            ${this.drivingButton('calculateTripEstimate',this.drivingText('估算','Estimate'))}<div id="estimate_result" role="status" class="text-2xl font-bold mt-4"></div>`);
    },
    calculateTripEstimate() {
        const read = id=>Number(document.getElementById(id).value);
        const result = FuelMateDriving.estimate(read('estimate_distance')*(document.getElementById('estimate_return').checked?2:1),read('estimate_efficiency'),read('estimate_price'),utils.getDistUnit()==='mi'&&utils.getFuelUnit()==='Gal');
        document.getElementById('estimate_result').textContent = result ? `${utils.formatCurrency(result.cost)} · ${result.amount.toFixed(2)} ${utils.getFuelUnit()}` : this.drivingText('請輸入有效距離、油耗及單價','Enter valid distance, efficiency and price');
    },
    openTrips(month, kind) {
        this._tripMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') ? month : FuelMateCore.localDateKey().slice(0,7);
        this._tripKind = ['work','private'].includes(kind) ? kind : 'all';
        const logs = this.filteredTrips();
        const distance = logs.reduce((s,l)=>s+Number(l.odometer)-Number(l.startOdometer),0);
        this.openModal(`<h2 class="text-xl font-bold mb-4">${this.drivingText('里程紀錄','Mileage log')}</h2><div class="grid grid-cols-2 gap-2 mb-3"><input id="trip_month" aria-label="Month" type="month" value="${this._tripMonth}" class="w-full min-w-0 p-3 rounded-xl" data-change-action="ui" data-ui-method="filterTrips"><select id="trip_kind_filter" aria-label="Journey kind" class="w-full min-w-0 p-3 rounded-xl" data-change-action="ui" data-ui-method="filterTrips">${['all','work','private'].map(k=>`<option value="${k}" ${this._tripKind===k?'selected':''}>${this.tripKindLabel(k)}</option>`).join('')}</select></div>
            <div data-testid="trip-total" class="text-2xl font-bold mb-3">${distance.toLocaleString(undefined,{maximumFractionDigits:3})} ${utils.getDistUnit()}</div><div class="flex gap-2 mb-4">${this.drivingButton('openTripForm',this.drivingText('新增行程','Add journey'))}${this.drivingButton('exportTrips','CSV')}</div>
            <div data-testid="trip-list" class="space-y-3">${logs.map(l=>`<div class="rounded-xl border theme-border p-3"><div class="font-bold">${this.tripKindLabel(l.tripKind)} · ${(l.odometer-l.startOdometer).toLocaleString(undefined,{maximumFractionDigits:3})} ${utils.getDistUnit()}</div><div class="text-sm">${utils.formatDate(l.date)} · ${utils.escapeHtml(l.purpose)}</div><div class="text-xs theme-text-sub">${l.startOdometer} → ${l.odometer}</div>${this.drivingButton('openTripForm',utils.t('edit'),l.id)}</div>`).join('') || `<p>${utils.t('no_records_found')}</p>`}</div>`);
    },
    tripKindLabel(k) { return k==='work'?this.drivingText('工作','Work'):k==='private'?this.drivingText('私人','Private'):utils.t('all'); },
    filteredTrips() { return store.getVehicleLogs('trip').filter(l=>l.date.slice(0,7)===this._tripMonth && (this._tripKind==='all'||l.tripKind===this._tripKind)); },
    filterTrips() { this.openTrips(document.getElementById('trip_month').value,document.getElementById('trip_kind_filter').value); },
    openTripForm(id) {
        const existing = id ? store.data.logs.find(l=>l.id===id && l.type==='trip' && l.vehicleId===store.data.settings.activeVehicleId) : null;
        if (id && !existing) return;
        const log = existing || { date: FuelMateCore.localDateKey(), startOdometer: store.getActiveVehicle().currentOdometer || 0, odometer:'', tripKind:'private', purpose:'' };
        this._tripEditId = existing?.id || null;
        this._tripSnapshot = store.fuelWriteSnapshot();
        this.openModal(`<h2 class="text-xl font-bold mb-4">${this.drivingText('行程','Journey')}</h2>${this.drivingField('journey_date',utils.t('date'),'date',log.date)}
            <select id="journey_kind" aria-label="Journey kind" class="w-full p-3 rounded-xl mb-3">${['work','private'].map(k=>`<option value="${k}" ${log.tripKind===k?'selected':''}>${this.tripKindLabel(k)}</option>`).join('')}</select>
            ${this.drivingField('journey_start',`${this.drivingText('起點里數','Start ODO')} (${utils.getDistUnit()})`,'number',log.startOdometer)}${this.drivingField('journey_end',`${this.drivingText('終點里數','End ODO')} (${utils.getDistUnit()})`,'number',log.odometer)}${this.drivingField('journey_purpose',this.drivingText('用途','Purpose'),'text',log.purpose)}
            <div class="flex gap-2">${existing?this.drivingButton('deleteJourney',utils.t('delete')):''}${this.drivingButton('saveJourney',utils.t('save'))}</div>`);
    },
    async saveJourney() {
        if (this._savingJourney) return;
        const start=document.getElementById('journey_start').value, end=document.getElementById('journey_end').value;
        const log={id:this._tripEditId||utils.newId(),vehicleId:this._tripSnapshot.vehicleId,type:'trip',date:document.getElementById('journey_date').value,startOdometer:start===''?NaN:Number(start),odometer:end===''?NaN:Number(end),tripKind:document.getElementById('journey_kind').value,purpose:document.getElementById('journey_purpose').value.trim(),cost:0};
        const error=FuelMateDriving.tripError(log,store.data.logs);
        const messages={date:['請核對日期','Check the date'],range:['終點里數必須大於起點','End ODO must exceed start ODO'],kind:['請選擇用途類別','Choose a journey kind'],purpose:['請填用途（最多 300 字）','Enter a purpose (up to 300 characters)'],overlap:['里程與其他行程重疊','Mileage overlaps another journey'],order:['日期與已有里數不符','Date and mileage conflict with existing records']};
        if(error) return alert(this.drivingText(...messages[error]));
        this._savingJourney=true;
        try { if(this._tripEditId) await store.updateLog(log,this._tripSnapshot); else await store.addLog(log,this._tripSnapshot); this.render(); this.openTrips(log.date.slice(0,7)); }
        catch (_) { alert(this.drivingText('未能儲存，請重新開啟行程再試','Not saved. Reopen the journey and try again')); }
        finally { this._savingJourney=false; }
    },
    async deleteJourney() {
        if(this._savingJourney || !this._tripEditId || !confirm(this.drivingText('刪除此行程？','Delete this journey?'))) return;
        this._savingJourney=true;
        try { await store.deleteLog(this._tripEditId,false,this._tripSnapshot); this.render(); this.openTrips(this._tripMonth); }
        catch (_) { alert(this.drivingText('未能刪除，請重新開啟再試','Not deleted. Reopen and try again')); }
        finally { this._savingJourney=false; }
    },
    exportTrips() {
        const v=store.getActiveVehicle();
        const blob=new Blob([FuelMateDriving.csv(this.filteredTrips(),utils.getDistUnit(),`${v.make} ${v.model}`)],{type:'text/csv;charset=utf-8'});
        const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=`fuelmate-mileage-${this._tripMonth}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
    }
});
