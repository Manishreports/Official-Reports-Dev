/* Official Reports V3.0 - common table sizing and accessibility */
(() => {
  'use strict';
  const MAX_INPUT_CH = 46;
  function updateInput(input) {
    if (!input || ['file','checkbox','radio'].includes(input.type)) return;
    const cell = input.closest('td');
    const table = input.closest('table');
    const heading = table && cell ? table.tHead?.rows?.[0]?.cells?.[cell.cellIndex]?.textContent || '' : '';
    const text = String(input.value || input.placeholder || heading || '');
    const ch = Math.min(MAX_INPUT_CH, Math.max(7, text.length + 2));
    input.style.width = `${ch}ch`;
    input.title = String(input.value || '');
  }
  function enhance(root = document) {
    root.querySelectorAll('.tablewrap').forEach(w => w.setAttribute('tabindex','0'));
    root.querySelectorAll('.tablewrap input, .tablewrap select').forEach(updateInput);
    root.querySelectorAll('.tablewrap td').forEach(td => {
      if (!td.title && td.textContent.trim()) td.title = td.textContent.trim();
    });
  }
  document.addEventListener('input', e => { if (e.target.matches('.tablewrap input,.tablewrap select')) updateInput(e.target); });
  const observer = new MutationObserver(() => requestAnimationFrame(() => enhance()));
  observer.observe(document.body, { childList:true, subtree:true });
  window.enhanceReportTables = enhance;
  enhance();
})();
