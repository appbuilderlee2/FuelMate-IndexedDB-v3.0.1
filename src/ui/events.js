// Central delegated event controller for declarative UI actions.
const FuelMateEvents = (() => {
  let initialized = false;

  function parseArgs(element) {
    if (!element.dataset.uiArgs) return [];
    try {
      const parsed = JSON.parse(decodeURIComponent(element.dataset.uiArgs));
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Invalid UI event arguments', error);
      return [];
    }
  }

  function callUi(element, event) {
    const methodName = element.dataset.uiMethod || '';
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(methodName) || typeof ui[methodName] !== 'function') {
      console.error(`Unknown UI event method: ${methodName}`);
      return;
    }

    const args = parseArgs(element);
    if (element.dataset.uiPassElement === 'true') args.push(element);
    if (element.dataset.uiPassValue === 'true') args.push(element.value);
    if (element.dataset.uiPassChecked === 'true') args.push(Boolean(element.checked));
    try {
      Promise.resolve(ui[methodName](...args)).catch((error) => {
        console.error(`UI event failed: ${methodName}`, error);
      });
    } catch (error) {
      console.error(`UI event failed: ${methodName}`, error);
    }
    if (element.dataset.preventDefault === 'true') event.preventDefault();
  }

  function dispatch(event, attribute) {
    const element = event.target.closest?.(`[${attribute}]`);
    if (!element) return;
    const action = element.getAttribute(attribute);
    if (action === 'ui') callUi(element, event);
    else if (action === 'navigate') router.navigate(element.dataset.page);
    else if (action === 'close-modal' && event.target === element) ui.closeModal();
  }

  function init() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('click', (event) => dispatch(event, 'data-action'));
    document.addEventListener('change', (event) => dispatch(event, 'data-change-action'));
    document.addEventListener('input', (event) => dispatch(event, 'data-input-action'));
    document.addEventListener('focusout', (event) => dispatch(event, 'data-blur-action'));
  }

  return Object.freeze({ init });
})();
