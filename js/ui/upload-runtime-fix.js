/* OFFICIAL REPORTS DEV - FILE UPLOAD BUTTON SAFETY FIX 2.7 */
(() => {
  'use strict';

  const pairs = [
    ['planBtn', 'planFile'],
    ['stockBtn', 'stockFile'],
    ['totalStockBtn', 'totalStockFile'],
    ['supplyUploadButton', 'supplyFile']
  ];

  function bindPair(buttonId, inputId) {
    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!button || !input || button.dataset.uploadSafetyBound === '1') return;

    button.dataset.uploadSafetyBound = '1';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      input.value = '';
      input.click();
    }, true);
  }

  function bindAll() {
    pairs.forEach(([buttonId, inputId]) => bindPair(buttonId, inputId));
  }

  const observer = new MutationObserver(bindAll);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll, { once: true });
  } else {
    bindAll();
  }
})();
