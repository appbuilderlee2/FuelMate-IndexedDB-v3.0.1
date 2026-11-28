(function exposeFuelMateSecurity(global) {
  const HTML_ENTITIES = Object.freeze({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  });

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function isSafeId(value) {
    return typeof value === 'string'
      && value.length > 0
      && value.length <= 128
      && /^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(value);
  }

  function neutralizeSpreadsheetFormula(value) {
    const text = String(value ?? '');
    return /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  }

  global.FuelMateSecurity = Object.freeze({
    escapeAttribute,
    escapeHtml,
    isSafeId,
    neutralizeSpreadsheetFormula,
  });
})(globalThis);
