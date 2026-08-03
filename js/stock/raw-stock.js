/* Official Reports V3.0.1 - stable Plan and Raw Stock uploads */
(() => {
  'use strict';

  function bindUpload(buttonId, inputId, type) {
    const button = $(buttonId);
    const input = $(inputId);
    if (!button || !input) return;

    button.addEventListener('click', () => input.click());
    input.addEventListener('change', event => readMappedFile(event.target.files[0], type));
  }

  bindUpload('stockBtn', 'stockFile', 's');
  bindUpload('planBtn', 'planFile', 'p');

  async function readMappedFile(file, type) {
    if (!file) return;

    const prefix = type === 's' ? 'sp' : 'pp';
    const columns = type === 's' ? SC : PC;
    const profile = type === 's' ? 'raw-stock' : 'plan-file';
    const input = type === 's' ? $('stockFile') : $('planFile');

    prog(prefix, 3, `Opening ${file.name}...`, 0, 0);

    try {
      await ExcelLibrary.ensure();
      prog(prefix, 5, 'Reading workbook...', 0, 0);

      const result = await ExcelImport.importMapped(
        file,
        profile,
        columns,
        progress => prog(prefix, progress, 'Reading workbook...', 0, 0)
      );

      prog(prefix, 80, 'Preparing preview...', 0, result.rows.length);

      if (type === 's') {
        stock = result.rows;
        sync(false);
        drawStockPreview();
        log(`${result.rows.length.toLocaleString('en-IN')} stock rows loaded from ${result.sheetName}`);
      } else {
        plan = result.rows;
        drawPlanPreview();
        log(`${result.rows.length.toLocaleString('en-IN')} plan rows loaded from ${result.sheetName}`);
      }

      prog(prefix, 100, `Loaded: ${result.sheetName}`, result.rows.length, result.rows.length);
      refresh();
      save();
      toast(`${result.rows.length.toLocaleString('en-IN')} rows loaded`);
    } catch (error) {
      if (error && error.message !== 'Upload cancelled') {
        console.error(error);
        toast(error.message || 'File read nahi hui');
        log(`Upload failed: ${error.message || 'Unknown error'}`);
        prog(prefix, 0, 'Upload failed', 0, 0);
      } else {
        prog(prefix, 0, 'Upload cancelled', 0, 0);
      }
    } finally {
      if (input) input.value = '';
    }
  }

  const clearButton = $('clearStock');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      stock = [];
      drawStockPreview();
      refresh();
      prog('sp', 0, 'Waiting...', 0, 0);
      toast('Raw cleared');
    });
  }

  window.drawPrev = function drawPrev(id, cols, rows, limit = 5) {
    const table = $(id);
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = document.createElement('tr');
    cols.forEach(column => {
      const th = document.createElement('th');
      th.textContent = column;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    rows.slice(0, limit).forEach(row => {
      const tr = document.createElement('tr');
      cols.forEach(column => {
        const td = document.createElement('td');
        const value = row[column] ?? '';
        td.textContent = typeof value === 'number' ? value.toLocaleString('en-IN') : value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  };

  window.drawStockPreview = function drawStockPreview() {
    drawPrev('stockTable', SC, stock, limitValue('stockPreviewLimit'));
  };

  window.drawPlanPreview = function drawPlanPreview() {
    drawPrev('planTable', PC, plan, limitValue('planPreviewLimit'));
  };

  if ($('stockPreviewLimit')) $('stockPreviewLimit').addEventListener('change', drawStockPreview);
  if ($('planPreviewLimit')) $('planPreviewLimit').addEventListener('change', drawPlanPreview);
})();
