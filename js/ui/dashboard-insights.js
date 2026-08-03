/* Official Reports V3.0.2 - System Overview insights and report tabs */
(() => {
  'use strict';

  const $id = id => document.getElementById(id);
  const number = value => typeof Q === 'function' ? Q(value) : (Number(value) || 0);
  const text = value => typeof N === 'function' ? N(value) : String(value ?? '').trim();
  const key = value => typeof NK === 'function' ? NK(value) : text(value).toLowerCase();
  const indian = value => number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  function renderTopTable(tableId, rows) {
    const table = $id(tableId);
    if (!table) return;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '<tr><th>Rank</th><th>Material No.</th><th>Description</th><th>Qty</th></tr>';
    tbody.innerHTML = '';

    rows.slice(0, 20).forEach((row, index) => {
      const tr = document.createElement('tr');
      [index + 1, row.material, row.description, indian(row.qty)].forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'Data available nahi hai.';
      td.className = 'empty-table-cell';
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  function topPlanMaterials() {
    const map = new Map();
    (Array.isArray(core) ? core : []).forEach(row => {
      const material = text(row['Material No.']);
      if (!material) return;
      const mapKey = key(material);
      if (!map.has(mapKey)) {
        map.set(mapKey, {
          material,
          description: text(row.Description),
          qty: 0
        });
      }
      const item = map.get(mapKey);
      item.qty += number(row['STO Qty']);
      if (!item.description && row.Description) item.description = text(row.Description);
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty);
  }

  function supplySnapshot() {
    if (window.OfficialSupply && typeof window.OfficialSupply.snapshot === 'function') {
      return window.OfficialSupply.snapshot();
    }
    return { sourceRows: 0, allowedRows: 0, reportRows: 0, totalQty: 0, materials: [] };
  }

  function refreshDashboardInsights() {
    const supply = supplySnapshot();
    const put = (id, value) => {
      const element = $id(id);
      if (element) element.textContent = typeof value === 'number' ? indian(value) : value;
    };

    put('dSupplyRows', supply.sourceRows);
    put('dSupplyQty', supply.totalQty);

    if (typeof renderDynamicSummary === 'function') {
      renderDynamicSummary('supplyOverviewSummary', {
        'Supply Source Rows': supply.sourceRows,
        'Allowed Rows': supply.allowedRows,
        'Supply Report Rows': supply.reportRows,
        'Total Supply': supply.totalQty
      });
    }

    renderTopTable('topPlanMaterialsTable', topPlanMaterials());
    renderTopTable('topSupplyMaterialsTable', supply.materials || []);
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('.tab[data-t]');
    if (!tab) return;
    const report = tab.closest('#horeport');
    const target = document.getElementById(tab.dataset.t);
    if (!report || !target) return;

    report.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
    report.querySelectorAll('.tabp').forEach(panel => panel.classList.remove('active'));
    tab.classList.add('active');
    target.classList.add('active');
  });

  window.refreshDashboardInsights = refreshDashboardInsights;
  refreshDashboardInsights();
})();
