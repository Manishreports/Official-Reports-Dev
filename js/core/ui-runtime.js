/* Official Reports V3.0.1 - shared UI runtime */
(() => {
  'use strict';

  let toastTimer = null;

  window.toast = function toast(message, duration = 2800) {
    const element = document.getElementById('toast');
    if (!element) return;
    element.textContent = String(message ?? '');
    element.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.add('hidden'), duration);
  };

  window.log = function log(message) {
    const box = document.getElementById('log');
    if (!box) return;
    const row = document.createElement('div');
    row.textContent = `${new Date().toLocaleTimeString('en-IN')} — ${String(message ?? '')}`;
    box.prepend(row);
  };

  window.prog = function prog(prefix, percent, label, loaded = 0, total = 0) {
    const safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    const bar = document.getElementById(`${prefix}Bar`);
    const pct = document.getElementById(`${prefix}Pct`);
    const text = document.getElementById(`${prefix}Text`);
    const detail = document.getElementById(`${prefix}Det`);

    if (bar) bar.style.width = `${safePercent}%`;
    if (pct) pct.textContent = `${Math.round(safePercent)}%`;
    if (text) text.textContent = String(label || 'Working...');
    if (detail) {
      const loadedValue = Number(loaded) || 0;
      const totalValue = Number(total) || 0;
      const pending = Math.max(totalValue - loadedValue, 0);
      detail.textContent = `Rows loaded: ${loadedValue.toLocaleString('en-IN')} | Pending: ${pending.toLocaleString('en-IN')}`;
    }
  };

  window.openM = function openM() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.remove('hidden');
  };

  window.closeM = function closeM() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
  };

  function bindModalDefaults() {
    const cancel = document.getElementById('mCancel');
    const close = document.getElementById('mX');
    if (cancel && !cancel.dataset.runtimeBound) {
      cancel.dataset.runtimeBound = '1';
      cancel.addEventListener('click', window.closeM);
    }
    if (close && !close.dataset.runtimeBound) {
      close.dataset.runtimeBound = '1';
      close.addEventListener('click', window.closeM);
    }
  }

  window.addEventListener('error', event => {
    console.error('Official Reports runtime error:', event.error || event.message);
    window.log(`Runtime error: ${event.message || 'Unknown error'}`);
  });

  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason && event.reason.message ? event.reason.message : String(event.reason || 'Unknown error');
    console.error('Official Reports promise error:', event.reason);
    window.log(`Upload error: ${reason}`);
  });

  bindModalDefaults();
})();
