/* OFFICIAL REPORTS DEV - CONTENT FIT TABLE LAYOUT 2.6 */
(() => {
  'use strict';

  const MIN_CH = 6;
  const MAX_CH = 64;

  function textLength(value) {
    return String(value ?? '').trim().length;
  }

  function fitInput(input) {
    if (!input || input.closest('td')?.cellIndex == null) return;
    if (input.type === 'checkbox' || input.type === 'radio' || input.type === 'file') return;

    const cell = input.closest('td');
    const table = input.closest('table');
    if (!cell || !table) return;

    const index = cell.cellIndex;
    const heading = table.tHead?.rows?.[0]?.cells?.[index]?.textContent || '';
    const placeholder = input.getAttribute('placeholder') || '';
    const length = Math.max(textLength(input.value), textLength(heading), Math.min(textLength(placeholder), 24));
    const width = Math.max(MIN_CH, Math.min(MAX_CH, length + 3));
    input.style.width = `${width}ch`;
  }

  function fitTable(table) {
    if (!table) return;
    table.querySelectorAll('input:not([type="file"]), select').forEach(fitInput);
  }

  function fitAll(root = document) {
    root.querySelectorAll('.tablewrap table').forEach(fitTable);
  }

  document.addEventListener('input', event => {
    if (event.target.matches('.tablewrap input, .tablewrap select')) fitInput(event.target);
  });
  document.addEventListener('change', event => {
    if (event.target.matches('.tablewrap input, .tablewrap select')) fitInput(event.target);
  });

  const observer = new MutationObserver(mutations => {
    const tables = new Set();
    mutations.forEach(mutation => {
      const targetTable = mutation.target.nodeType === 1 ? mutation.target.closest?.('table') : null;
      if (targetTable) tables.add(targetTable);
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('table')) tables.add(node);
        node.querySelectorAll?.('table').forEach(table => tables.add(table));
        const parentTable = node.closest?.('table');
        if (parentTable) tables.add(parentTable);
      });
    });
    tables.forEach(fitTable);
  });

  function initialize() {
    fitAll();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.fitReportTables = fitAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
