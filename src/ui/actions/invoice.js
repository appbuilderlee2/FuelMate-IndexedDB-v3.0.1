// AI invoice settings, direct provider requests, and review-before-save workflow.
Object.assign(ui, {
  _aiText(en, zh) { return store.data.settings.language === 'zh' ? zh : en; },

  async toggleAIInvoice(element) {
    const previous = store.data.settings.aiInvoiceEnabled === true;
    store.data.settings.aiInvoiceEnabled = Boolean(element.checked);
    try { await store.saveData(); this.render(); }
    catch (error) { store.data.settings.aiInvoiceEnabled = previous; element.checked = previous; throw error; }
  },

  async changeAIProvider(provider) {
    if (!FuelMateInvoiceAI.PROVIDERS[provider]) return;
    const previous = { provider: store.data.settings.aiProvider, model: store.data.settings.aiModel, endpoint: store.data.settings.aiEndpoint };
    store.data.settings.aiProvider = provider;
    store.data.settings.aiModel = FuelMateInvoiceAI.PROVIDERS[provider].model;
    store.data.settings.aiEndpoint = FuelMateInvoiceAI.PROVIDERS[provider].endpoint;
    try { await store.saveData(); this.render(); }
    catch (error) { Object.assign(store.data.settings, { aiProvider: previous.provider, aiModel: previous.model, aiEndpoint: previous.endpoint }); throw error; }
  },

  _readAIForm() {
    const provider = document.getElementById('ai_provider')?.value || store.data.settings.aiProvider || 'openai';
    const enteredKey = document.getElementById('ai_api_key')?.value?.trim() || '';
    return {
      provider,
      model: document.getElementById('ai_model_select')?.classList.contains('hidden') === false
        ? document.getElementById('ai_model_select')?.value?.trim() || ''
        : document.getElementById('ai_model')?.value?.trim() || '',
      endpoint: document.getElementById('ai_endpoint')?.value?.trim() || FuelMateInvoiceAI.PROVIDERS[provider]?.endpoint || '',
      apiKey: enteredKey || FuelMateInvoiceAI.getKey(provider),
      remember: Boolean(document.getElementById('ai_remember_key')?.checked),
    };
  },

  async saveAISettings() {
    const config = this._readAIForm();
    if (!config.model || !/^[\w./:@+-]{1,160}$/.test(config.model)) return alert(this._aiText('Enter a valid model ID.', '請輸入有效模型 ID。'));
    try { FuelMateInvoiceAI.normalizeEndpoint(config.provider, config.endpoint); }
    catch (_) { return alert(this._aiText('Enter a valid HTTPS API URL.', '請輸入有效 HTTPS API 網址。')); }
    const previous = { ...store.data.settings };
    Object.assign(store.data.settings, { aiProvider: config.provider, aiModel: config.model, aiEndpoint: config.provider === 'compatible' ? config.endpoint : '', aiRememberKey: config.remember });
    try {
      FuelMateInvoiceAI.setKey(config.provider, config.apiKey, config.remember);
      await store.saveData();
      this.render();
    } catch (error) { store.data.settings = previous; throw error; }
  },

  async testAIConnection() {
    const status = document.getElementById('ai_connection_status');
    const config = this._readAIForm();
    if (status) status.textContent = this._aiText('Testing…', '正在測試…');
    try {
      const models = await FuelMateInvoiceAI.listModels(config);
      const select = document.getElementById('ai_model_select');
      const input = document.getElementById('ai_model');
      const toggle = document.getElementById('ai_model_entry_toggle');
      if (select && input && models.length) {
        select.replaceChildren(new Option(this._aiText('Choose a model', '選擇模型'), '', true, false));
        select.options[0].disabled = true;
        models.forEach(model => select.add(new Option(model, model)));
        if (models.includes(config.model)) select.value = config.model;
        select.classList.remove('hidden');
        input.classList.add('hidden');
        toggle?.classList.remove('hidden');
      }
      if (status) {
        status.textContent = models.length
          ? this._aiText(`Connected. ${models.length} models loaded.`, `連接成功，已載入 ${models.length} 個模型。`)
          : this._aiText('Connected, but this provider returned no model list. Enter the model ID manually.', '連接成功，但供應商未有傳回模型清單，請手動輸入模型 ID。');
        status.className = models.length ? 'text-xs text-green-600' : 'text-xs text-amber-700';
      }
    } catch (error) {
      if (status) { status.textContent = this._invoiceError(error); status.className = 'text-xs text-red-600'; }
    }
  },

  toggleAIModelEntry() {
    const select = document.getElementById('ai_model_select');
    const input = document.getElementById('ai_model');
    const toggle = document.getElementById('ai_model_entry_toggle');
    if (!select || !input || !toggle) return;
    const useManual = input.classList.contains('hidden');
    if (useManual) {
      if (select.value) input.value = select.value;
      input.classList.remove('hidden');
      select.classList.add('hidden');
      toggle.textContent = this._aiText('Use loaded model list', '使用已載入模型清單');
    } else {
      select.classList.remove('hidden');
      input.classList.add('hidden');
      toggle.textContent = this._aiText('Enter model ID manually', '手動輸入模型 ID');
    }
  },

  async clearAIKey() {
    FuelMateInvoiceAI.clearKey(store.data.settings.aiProvider || 'openai');
    store.data.settings.aiRememberKey = false;
    await store.saveData();
    this.render();
  },

  openInvoicePicker() { document.getElementById('invoice_file')?.click(); },

  _invoiceError(error) {
    const messages = {
      missing_api_key: ['Enter your API key in Settings first.', '請先喺設定輸入 API Key。'],
      missing_model: ['Choose a model first.', '請先選擇模型。'],
      unsupported_file: ['Use a JPG, PNG, WebP, or PDF file.', '請使用 JPG、PNG、WebP 或 PDF。'],
      file_too_large: ['The file must be 12 MB or smaller.', '檔案不可超過 12 MB。'],
      pdf_not_supported: ['This provider only supports invoice images in FuelMate.', 'FuelMate 只可用相片連接呢個供應商。'],
      unsupported_provider: ['Choose a supported AI provider.', '請選擇支援嘅 AI 供應商。'],
      invalid_api_key: ['The API key was rejected.', 'API Key 被拒絕。'],
      rate_limited: ['The provider rate limit was reached.', '已到達供應商用量限制。'],
      invalid_endpoint: ['The API URL is invalid.', 'API 網址無效。'],
      invalid_ai_response: ['The provider did not return a valid invoice result.', '供應商未有傳回有效帳單結果。'],
      provider_error: ['The provider could not process this invoice.', '供應商未能處理此帳單。'],
      storage_unavailable: ['This browser could not save the API key.', '瀏覽器未能儲存 API Key。'],
    };
    const pair = messages[error?.message] || ['Could not recognize the invoice. Check the connection and try again.', '無法識別帳單，請檢查連接後重試。'];
    const base = this._aiText(pair[0], pair[1]);
    return error?.detail ? `${base} ${error.detail}` : base;
  },

  async scanInvoice(input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const settings = store.data.settings;
    if (!settings.aiInvoiceEnabled) return alert(this._aiText('Enable AI invoice recognition in Settings.', '請先喺設定開啟 AI 帳單識別。'));
    try { FuelMateInvoiceAI.validateFile(file); }
    catch (error) { return alert(this._invoiceError(error)); }
    const apiKey = FuelMateInvoiceAI.getKey(settings.aiProvider);
    if (!apiKey) return alert(this._invoiceError(new Error('missing_api_key')));
    this.openModal(`<h2 class="text-xl font-bold theme-text-heading">${this._aiText('Reading invoice', '正在識別帳單')}</h2><div class="py-12 text-center"><div class="invoice-spinner mx-auto mb-4"></div><p class="text-sm theme-text-sub">${utils.escapeHtml(file.name)}</p><p class="text-xs theme-text-sub mt-2">${this._aiText('The file is sent directly to your selected AI provider.', '檔案會直接傳送到你選擇嘅 AI 供應商。')}</p></div>`);
    try {
      const [result, hash] = await Promise.all([
        FuelMateInvoiceAI.analyze({ provider: settings.aiProvider, endpoint: settings.aiEndpoint, apiKey, model: settings.aiModel, file }),
        FuelMateInvoiceAI.hashFile(file),
      ]);
      if (result.documentType === 'quote') result.lineItems.forEach(item => { item.selected = false; });
      this._invoiceDraft = { ...result, hash, fileName: file.name, provider: settings.aiProvider, model: settings.aiModel };
      this.renderInvoiceReview();
    } catch (error) {
      this.openModal(`<h2 class="text-xl font-bold theme-text-heading">${this._aiText('Recognition failed', '識別失敗')}</h2><div class="py-6"><p class="text-sm text-red-600">${utils.escapeHtml(this._invoiceError(error))}</p><button data-action="ui" data-ui-method="closeModal" class="w-full mt-6 py-3 rounded-xl bg-slate-100 theme-text-heading font-bold">${utils.t('cancel')}</button></div>`);
    }
  },

  _invoiceSuggestedType(items) {
    const categories = new Set(items.filter(item => item.status === 'completed').map(item => item.category));
    if (categories.has('oil') || categories.has('filter') || categories.has('transmission') || categories.has('coolant')) return 'periodic_maintenance';
    if (categories.has('brake') || categories.has('battery')) return 'repair';
    return 'service';
  },

  renderInvoiceReview() {
    const draft = this._invoiceDraft;
    if (!draft) return;
    const duplicate = store.data.logs.find(log => log.invoiceHash === draft.hash || (draft.invoiceNumber && log.invoiceMeta?.invoiceNumber === draft.invoiceNumber && log.location === draft.supplier));
    const selectedAmounts = draft.lineItems.filter(item => item.selected && Number.isFinite(item.amount)).map(item => item.amount);
    const total = draft.total ?? (selectedAmounts.length ? selectedAmounts.reduce((sum, amount) => sum + amount, 0) : null);
    const warnings = [...draft.warnings];
    if (draft.documentType === 'quote') warnings.unshift(this._aiText('This looks like a quote. Nothing is marked completed.', '呢份似係報價單，所有項目暫時不當作已完成。'));
    if (duplicate) warnings.unshift(this._aiText('A possible duplicate invoice already exists.', '可能已經儲存過同一張帳單。'));
    const completedAmounts = draft.lineItems.filter(item => item.selected && item.status === 'completed').map(item => item.amount);
    if (draft.subtotal !== null && completedAmounts.length && completedAmounts.every(Number.isFinite) && Math.abs(completedAmounts.reduce((sum, amount) => sum + amount, 0) - draft.subtotal) > 0.02) warnings.push(this._aiText('Line items do not match the subtotal.', '明細加總同小計不一致。'));
    if (draft.total !== null && draft.subtotal !== null && draft.tax !== null && Math.abs(draft.total - draft.subtotal - draft.tax) > 0.02) warnings.push(this._aiText('Subtotal plus tax does not match the total.', '小計加稅項同總額不一致。'));
    this.openModal(`
      <h2 class="text-xl font-bold theme-text-heading">${this._aiText('Review invoice', '核對帳單')}</h2>
      <div class="space-y-4">
        ${warnings.length ? `<div class="p-3 rounded-xl bg-amber-50 text-amber-900 text-xs font-semibold space-y-1">${warnings.map(warning => `<div>• ${utils.escapeHtml(warning)}</div>`).join('')}</div>` : ''}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label class="text-xs theme-text-sub block mb-1">${this._aiText('Document', '文件類型')}</label><select id="inv_document_type" class="w-full p-3 rounded-xl">${['invoice','receipt','quote','unknown'].map(type => `<option value="${type}" ${draft.documentType === type ? 'selected' : ''}>${type}</option>`).join('')}</select></div>
          <div><label class="text-xs theme-text-sub block mb-1">${utils.t('date')}</label><input id="inv_date" type="date" value="${utils.escapeAttr(draft.date || '')}" class="w-full p-3 rounded-xl"></div>
        </div>
        <div><label class="text-xs theme-text-sub block mb-1">${this._aiText('Supplier', '商戶／車房')}</label><input id="inv_supplier" value="${utils.escapeAttr(draft.supplier)}" maxlength="300" class="w-full p-3 rounded-xl"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs theme-text-sub block mb-1">Invoice #</label><input id="inv_number" value="${utils.escapeAttr(draft.invoiceNumber)}" maxlength="300" class="w-full p-3 rounded-xl"></div>
          <div><label class="text-xs theme-text-sub block mb-1">${utils.t('odometer')}</label><input id="inv_odometer" type="number" min="0" value="${draft.odometer ?? ''}" class="w-full p-3 rounded-xl"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs theme-text-sub block mb-1">${this._aiText('Record type', '記錄類型')}</label><select id="inv_log_type" class="w-full p-3 rounded-xl"><option value="service" ${this._invoiceSuggestedType(draft.lineItems)==='service'?'selected':''}>${utils.t('service')}</option><option value="repair" ${this._invoiceSuggestedType(draft.lineItems)==='repair'?'selected':''}>${utils.t('repair')}</option><option value="periodic_maintenance" ${this._invoiceSuggestedType(draft.lineItems)==='periodic_maintenance'?'selected':''}>${utils.t('periodic_maintenance')}</option></select></div>
          <div><label class="text-xs theme-text-sub block mb-1">${this._aiText('Invoice total', '帳單總額')}</label><input id="inv_total" type="number" min="0" step="0.01" value="${Number.isFinite(total) ? total.toFixed(2) : ''}" class="w-full p-3 rounded-xl"></div>
        </div>
        <div><div class="text-xs font-bold theme-text-heading mb-2">${this._aiText('Items — check completed work', '項目——只勾選已完成工作')}</div><div class="space-y-2">${draft.lineItems.length ? draft.lineItems.map((item, index) => `
          <div class="invoice-item p-3 rounded-xl border theme-border" data-invoice-item="${index}">
            <div class="flex gap-3 items-start"><input id="inv_selected_${index}" type="checkbox" class="mt-3 w-5 h-5" ${item.selected ? 'checked' : ''}><input id="inv_description_${index}" value="${utils.escapeAttr(item.description)}" maxlength="300" class="flex-1 p-2 rounded-lg text-sm"></div>
            <div class="grid grid-cols-2 gap-2 mt-2"><select id="inv_status_${index}" class="p-2 rounded-lg text-xs">${['completed','recommended','unknown'].map(status => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select><input id="inv_amount_${index}" type="number" min="0" step="0.01" value="${item.amount ?? ''}" class="p-2 rounded-lg text-sm" placeholder="${this._aiText('Amount', '金額')}"></div>
          </div>`).join('') : `<div class="text-xs text-amber-700">${this._aiText('No line items found.', '未能讀取明細。')} <button data-action="ui" data-ui-method="addEmptyInvoiceItem" class="font-bold underline">${this._aiText('Add an item', '手動加入一項')}</button></div>`}</div></div>
        <div class="text-[11px] theme-text-sub">${this._aiText(`Confidence ${Math.round(draft.confidence * 100)}%. Verify every field against the original.`, `識別信心 ${Math.round(draft.confidence * 100)}%。請逐項對照原單。`)}</div>
        <div class="invoice-review-actions sticky bottom-0 flex gap-3 pt-3"><button data-action="ui" data-ui-method="closeModal" class="flex-1 py-3 rounded-xl bg-slate-100 theme-text-heading font-bold">${utils.t('cancel')}</button><button data-testid="save-invoice-record" data-action="ui" data-ui-method="saveInvoiceRecord" class="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold">${this._aiText('Confirm & save', '確認並儲存')}</button></div>
      </div>`);
  },

  addEmptyInvoiceItem() {
    if (!this._invoiceDraft || this._invoiceDraft.lineItems.length) return;
    this._invoiceDraft.lineItems.push({ description: '', amount: null, category: 'other', status: 'completed', selected: true });
    this.renderInvoiceReview();
    setTimeout(() => document.getElementById('inv_description_0')?.focus(), 0);
  },

  async saveInvoiceRecord() {
    if (this._savingInvoice || !this._invoiceDraft) return;
    const draft = this._invoiceDraft;
    const date = this.validateDateField('inv_date');
    const odometer = this.validateNumberField('inv_odometer', { messageKey: 'validation_odometer' });
    const total = this.validateNumberField('inv_total', { required: false, messageKey: 'validation_cost' });
    if (!date || !odometer.ok || !total.ok) return;
    const items = draft.lineItems.map((item, index) => {
      const amount = document.getElementById(`inv_amount_${index}`)?.value?.trim() || '';
      return { description: document.getElementById(`inv_description_${index}`)?.value?.trim().slice(0, 300) || '', category: item.category, status: document.getElementById(`inv_status_${index}`)?.value || 'unknown', amount: amount === '' ? null : Number(amount), selected: Boolean(document.getElementById(`inv_selected_${index}`)?.checked) };
    }).filter(item => item.description);
    if (items.some(item => item.amount !== null && (!Number.isFinite(item.amount) || item.amount < 0))) return alert(utils.t('validation_cost'));
    if (!items.some(item => item.selected && item.status === 'completed')) return alert(this._aiText('Select at least one completed item.', '請至少勾選一項已完成工作。'));
    if (document.getElementById('inv_document_type').value === 'quote') return alert(this._aiText('Change the document type only if the work was completed.', '如果工作已完成，請先更改文件類型。'));
    const supplier = document.getElementById('inv_supplier').value.trim().slice(0, 300);
    const invoiceNumber = document.getElementById('inv_number').value.trim().slice(0, 300);
    const completed = items.filter(item => item.selected && item.status === 'completed');
    const recommended = items.filter(item => item.status === 'recommended');
    const notes = [
      invoiceNumber ? `Invoice: ${invoiceNumber}` : '',
      ...completed.map(item => `✓ ${item.description}${item.amount === null ? '' : ` (${draft.currency || store.data.settings.currency}${item.amount.toFixed(2)})`}`),
      ...recommended.map(item => `${this._aiText('Recommended', '建議')}: ${item.description}`),
    ].filter(Boolean).join('\n');
    const log = { id: utils.newId(), vehicleId: store.data.settings.activeVehicleId, type: document.getElementById('inv_log_type').value, date, odometer: odometer.number, cost: total.value, location: supplier, notes, invoiceHash: draft.hash, invoiceMeta: { invoiceNumber, documentType: document.getElementById('inv_document_type').value, currency: draft.currency, subtotal: draft.subtotal, tax: draft.tax, fileName: draft.fileName, provider: draft.provider, model: draft.model, confidence: draft.confidence }, invoiceItems: items };
    this._savingInvoice = true;
    try { await store.addLog(log); this._invoiceDraft = null; this.closeModal(); this.render(); }
    finally { this._savingInvoice = false; }
  },
});
