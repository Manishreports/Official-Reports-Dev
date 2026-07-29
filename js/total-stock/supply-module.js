/*
  OFFICIAL REPORTS DEV - SUPPLY MODULE 2.3

  Adds:
  - Supply Upload page
  - Plan & Supply report
  - Combined Excel download: Plan & HO + Plan & Supply
  - Full-width Manual Material Description input

  Existing Core Pending and HO Stock calculations are not changed.
*/

(() => {
  'use strict';

  const SUPPLY_REQUIRED_COLUMNS = [
    'Plant',
    'Plant Name',
    'Location',
    'Material No.',
    'Description',
    'Issue Qty',
    'Issue_Date'
  ];

  const PLAN_SUPPLY_NUMBER_COLUMNS = new Set([
    'Stock (ps)',
    'Transit(Ps)',
    'Plan',
    'T.Stock (Ps)',
    'HO.Blc Qty',
    'Supply'
  ]);

  let supplyRows = [];
  let supplySourceFileName = '';
  let supplySourceSheet = '';
  let planSupplyRows = [];
  let planSupplyHeaders = [];

  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #manTable th:nth-child(4),
      #manTable td:nth-child(4) {
        min-width: 440px;
        width: 440px;
        max-width: none;
      }

      #manTable td:nth-child(4) input {
        min-width: 420px;
        width: 100%;
      }

      .supply-status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }

      .supply-status-card {
        background: #fff;
        border: 1px solid #edf1f6;
        border-radius: 17px;
        padding: 14px;
        box-shadow: 0 12px 30px rgba(36, 60, 105, .07);
      }

      .supply-status-card span {
        display: block;
        color: #788397;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 5px;
      }

      .supply-status-card strong {
        font-size: 22px;
      }
    `;
    document.head.appendChild(style);
  }

  function addSupplyNavigation() {
    const planSupplyNav = document.querySelector('.nav[data-p="plan-supply"]');
    if (!planSupplyNav || document.querySelector('.nav[data-p="supply-upload"]')) return;

    const button = document.createElement('button');
    button.className = 'nav';
    button.dataset.p = 'supply-upload';
    button.textContent = 'Supply Upload';

    planSupplyNav.parentNode.insertBefore(button, planSupplyNav);

    button.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
      document.querySelectorAll('.nav').forEach(nav => nav.classList.remove('active'));
      const page = document.getElementById('supply-upload');
      if (page) page.classList.add('active');
      button.classList.add('active');
      if ($('title')) $('title').textContent = 'Supply Upload';
      if ($('sub')) $('sub').textContent = 'Issue Qty ko Plant + Location + Material wise pull karein.';
    });
  }

  function addSupplyPage() {
    if ($('supply-upload')) return;

    const planSupplyPage = $('plan-supply');
    if (!planSupplyPage) return;

    const section = document.createElement('section');
    section.id = 'supply-upload';
    section.className = 'page';
    section.innerHTML = `
      <div class="supply-status-grid">
        <div class="supply-status-card"><span>Supply Rows</span><strong id="supplyRowCount">0</strong></div>
        <div class="supply-status-card"><span>Matched Keys</span><strong id="supplyKeyCount">0</strong></div>
        <div class="supply-status-card"><span>Total Issue Qty</span><strong id="supplyQtyTotal">0</strong></div>
      </div>

      <div class="panel">
        <div class="head">
          <div>
            <h3>Supply Upload</h3>
            <p>Matching key: Plant + Location + Material No.</p>
          </div>
        </div>
        <div class="drop">
          <input id="supplyFile" type="file" accept=".xlsx,.xls,.csv" hidden>
          <button id="supplyUploadButton" class="btn primary">Choose Supply File</button>
        </div>
        <div id="supplyInfo" class="notice">No supply file uploaded.</div>
      </div>

      <div class="panel">
        <div class="head">
          <h3>Supply Preview</h3>
          <div class="table-controls">
            Show
            <select id="supplyLimit" class="limit-select">
              <option>5</option>
              <option>10</option>
              <option>50</option>
            </select>
          </div>
        </div>
        <div class="tablewrap compact">
          <table id="supplyTable"><thead></thead><tbody></tbody></table>
        </div>
      </div>
    `;

    planSupplyPage.parentNode.insertBefore(section, planSupplyPage);
  }

  function activatePlanSupplyPage() {
    const page = $('plan-supply');
    if (!page) return;

    page.innerHTML = `
      <div id="planSupplySummary" class="dynamic-metrics"></div>
      <div class="panel">
        <div class="head">
          <div>
            <h3>Plan & Supply</h3>
            <p>Supply = Supply Upload ki Issue Qty.</p>
          </div>
          <div class="table-controls">
            Show
            <select id="planSupplyLimit" class="limit-select">
              <option>5</option>
              <option>10</option>
              <option>50</option>
            </select>
          </div>
        </div>
        <div id="planSupplyInfo" class="notice">Report not built.</div>
        <div class="tablewrap compact">
          <table id="planSupplyTable"><thead></thead><tbody></tbody></table>
        </div>
      </div>
    `;
  }

  function updateTotalStockActions() {
    const toolbar = document.querySelector('.total-stock-actions');
    if (!toolbar) return;

    if (!$('buildPlanSupply')) {
      const buildButton = document.createElement('button');
      buildButton.id = 'buildPlanSupply';
      buildButton.className = 'btn primary';
      buildButton.textContent = 'Build Plan & Supply';
      toolbar.insertBefore(buildButton, $('downloadPlanHo'));
      buildButton.onclick = buildPlanSupplyReport;
    }

    const downloadButton = $('downloadPlanHo');
    if (downloadButton) {
      downloadButton.textContent = 'Download Plan & HO + Plan & Supply';
      downloadButton.onclick = downloadCombinedTotalStockReport;
    }
  }

  function formatIndianNumber(value) {
    return Q(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function supplyKey(row) {
    return `${NK(row.Plant)}||${NK(row.Location)}||${NK(row['Material No.'])}`;
  }

  async function uploadSupplyFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await ExcelImport.importMapped(
        file,
        'total-stock-supply',
        SUPPLY_REQUIRED_COLUMNS
      );

      supplyRows = result.rows.map(row => ({
        Plant: row.Plant,
        'Plant Name': row['Plant Name'],
        Location: row.Location,
        'Material No.': row['Material No.'],
        Description: row.Description,
        'Issue Qty': Q(row['Issue Qty']),
        Issue_Date: row.Issue_Date
      }));

      supplySourceFileName = file.name;
      supplySourceSheet = result.sheetName;
      planSupplyRows = [];
      planSupplyHeaders = [];

      drawSupplyPreview();
      drawPlanSupply();
      refreshSupplyStatus();

      $('supplyInfo').textContent =
        `${supplyRows.length.toLocaleString('en-IN')} rows loaded from ${result.sheetName}.`;

      toast('Supply data loaded');
    } catch (error) {
      if (error.message !== 'Upload cancelled') {
        toast(error.message || 'Supply file read nahi hui');
      }
    } finally {
      $('supplyFile').value = '';
    }
  }

  function buildSupplyByKey() {
    const map = new Map();

    supplyRows.forEach(row => {
      const key = supplyKey(row);
      map.set(key, Q(map.get(key)) + Q(row['Issue Qty']));
    });

    return map;
  }

  function drawSupplyPreview() {
    const table = $('supplyTable');
    if (!table) return;

    const headers = SUPPLY_REQUIRED_COLUMNS;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = document.createElement('tr');
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const limit = Number($('supplyLimit').value || 5);

    supplyRows.slice(0, limit).forEach(row => {
      const tr = document.createElement('tr');
      headers.forEach(header => {
        const td = document.createElement('td');
        td.textContent = header === 'Issue Qty'
          ? formatIndianNumber(row[header])
          : (row[header] ?? '');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function refreshSupplyStatus() {
    if (!$('supplyRowCount')) return;

    const keyCount = new Set(supplyRows.map(supplyKey)).size;
    const qtyTotal = supplyRows.reduce((sum, row) => sum + Q(row['Issue Qty']), 0);

    $('supplyRowCount').textContent = supplyRows.length.toLocaleString('en-IN');
    $('supplyKeyCount').textContent = keyCount.toLocaleString('en-IN');
    $('supplyQtyTotal').textContent = formatIndianNumber(qtyTotal);
  }

  function buildPlanSupplyReport() {
    if (!totalStockRows.length) {
      toast('Pehle Total Stock file upload karein');
      return false;
    }

    validateTotalStockDuplicates();
    if (totalStockDuplicateRows.length) {
      showDuplicatePopup();
      return false;
    }

    if (!supplyRows.length) {
      showMessagePopup(
        'Supply Upload Required',
        'Pehle Supply file upload karein. Supply data ke bina Plan & Supply report nahi banegi.'
      );
      return false;
    }

    const planAvailable = totalStockCoreBuilt();
    const planMap = planAvailable ? buildPlanByKey() : new Map();
    const supplyMap = buildSupplyByKey();

    planSupplyHeaders = [
      'Plant',
      'Plant Name',
      'Location',
      'Material No.',
      'Description',
      'Net wt',
      'Stock (ps)',
      'Transit(Ps)'
    ];

    if (planAvailable) planSupplyHeaders.push('Plan');

    planSupplyHeaders.push(
      'T.Stock (Ps)',
      'HO.Blc Qty',
      'Supply'
    );

    planSupplyRows = totalStockRows.map(source => {
      const planQty = planAvailable
        ? (planMap.get(totalStockKey(source)) || 0)
        : 0;

      const stock = Q(source['Stock (ps)']);
      const transit = Q(source['Transit(Ps)']);

      const row = {
        Plant: source.Plant,
        'Plant Name': source['Plant Name'],
        Location: source.Location,
        'Material No.': source['Material No.'],
        Description: source.Description,
        'Net wt': source['Net wt'],
        'Stock (ps)': stock,
        'Transit(Ps)': transit
      };

      if (planAvailable) row.Plan = planQty;

      row['T.Stock (Ps)'] = stock + transit + planQty;
      row['HO.Blc Qty'] = Q(source['HO.Blc Qty']);
      row.Supply = supplyMap.get(totalStockKey(source)) || 0;
      row._descriptionStyle = source._descriptionStyle;

      return row;
    });

    drawPlanSupply();

    $('planSupplyInfo').textContent =
      `${planSupplyRows.length.toLocaleString('en-IN')} rows ready` +
      (planAvailable ? '' : ' • Plan source not built: Plan column hidden');

    toast('Plan & Supply report ready');
    return true;
  }

  function drawPlanSupply() {
    const table = $('planSupplyTable');
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = document.createElement('tr');
    planSupplyHeaders.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const limit = Number($('planSupplyLimit').value || 5);

    planSupplyRows.slice(0, limit).forEach(row => {
      const tr = document.createElement('tr');

      planSupplyHeaders.forEach(header => {
        const td = document.createElement('td');
        td.textContent = PLAN_SUPPLY_NUMBER_COLUMNS.has(header)
          ? formatIndianNumber(row[header])
          : (row[header] ?? '');

        if (header === 'Description') {
          applyDescriptionStyleToCell(td, row._descriptionStyle);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    if ($('planSupplySummary')) {
      renderDynamicSummary('planSupplySummary', {
        Rows: planSupplyRows.length,
        'T.Stock (Ps)': planSupplyRows.reduce((sum, row) => sum + Q(row['T.Stock (Ps)']), 0),
        Supply: planSupplyRows.reduce((sum, row) => sum + Q(row.Supply), 0)
      });
    }
  }

  function applyWorksheetFormatting(ws, headers, rows) {
    const border = {
      top: { style: 'thin', color: { rgb: 'FFD9E1EA' } },
      bottom: { style: 'thin', color: { rgb: 'FFD9E1EA' } },
      left: { style: 'thin', color: { rgb: 'FFD9E1EA' } },
      right: { style: 'thin', color: { rgb: 'FFD9E1EA' } }
    };

    headers.forEach((header, columnIndex) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: columnIndex })];
      cell.s = {
        font: { bold: true, color: { rgb: 'FFFFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: 'FF003366' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border
      };
    });

    rows.forEach((row, rowIndex) => {
      headers.forEach((header, columnIndex) => {
        const cell = ws[XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex })];
        if (!cell) return;

        cell.s = {
          font: { color: { rgb: 'FF000000' } },
          alignment: {
            horizontal: PLAN_SUPPLY_NUMBER_COLUMNS.has(header) ? 'right' : 'center',
            vertical: 'top',
            wrapText: true
          },
          border
        };

        if (PLAN_SUPPLY_NUMBER_COLUMNS.has(header)) {
          cell.z = '#,##,##0.##';
        }

        if (header === 'Description' && row._descriptionStyle) {
          if (row._descriptionStyle.fill) cell.s.fill = row._descriptionStyle.fill;
          if (row._descriptionStyle.font) {
            cell.s.font = { ...cell.s.font, ...row._descriptionStyle.font };
          }
        }
      });
    });

    ws['!cols'] = headers.map(header => ({
      wch: header === 'Description'
        ? 38
        : header === 'Plant Name'
          ? 23
          : Math.min(Math.max(header.length + 3, 12), 22)
    }));

    ws['!rows'] = [
      { hpt: 28 },
      ...rows.map(row => ({
        hpt: Math.max(20, Math.ceil(N(row.Description).length / 42) * 15)
      }))
    ];
  }

  function buildPlanSupplyWorksheet() {
    const data = [
      planSupplyHeaders,
      ...planSupplyRows.map(row =>
        planSupplyHeaders.map(header => row[header] ?? '')
      )
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    applyWorksheetFormatting(ws, planSupplyHeaders, planSupplyRows);
    return ws;
  }

  function downloadCombinedTotalStockReport() {
    if (!totalStockPlanHoRows.length) {
      buildPlanHoReport();
    }

    if (!totalStockPlanHoRows.length) return;

    if (!planSupplyRows.length) {
      const built = buildPlanSupplyReport();
      if (!built) return;
    }

    try {
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        buildPlanHoWorksheet(),
        'Plan & HO'
      );

      XLSX.utils.book_append_sheet(
        workbook,
        buildPlanSupplyWorksheet(),
        'Plan & Supply'
      );

      const bytes = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
        compression: true
      });

      const blob = new Blob(
        [bytes],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'Total_Stock_Plan_HO_and_Supply.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 2500);
      toast('Plan & HO + Plan & Supply download started');
    } catch (error) {
      console.error(error);
      toast(`Download error: ${error.message || 'Unknown error'}`);
    }
  }

  function makeManualDescriptionAlwaysVisible() {
    const table = $('manTable');
    if (!table) return;

    const applyTitles = () => {
      table.querySelectorAll('tbody tr').forEach(row => {
        const input = row.querySelector('td:nth-child(4) input');
        if (!input) return;
        input.title = input.value;
        input.addEventListener('input', () => {
          input.title = input.value;
        });
      });
    };

    const observer = new MutationObserver(applyTitles);
    observer.observe(table.querySelector('tbody'), { childList: true, subtree: true });
    applyTitles();
  }

  function initialize() {
    addStyles();
    addSupplyNavigation();
    addSupplyPage();
    activatePlanSupplyPage();
    updateTotalStockActions();
    makeManualDescriptionAlwaysVisible();

    $('supplyUploadButton').onclick = () => $('supplyFile').click();
    $('supplyFile').onchange = uploadSupplyFile;
    $('supplyLimit').onchange = drawSupplyPreview;
    $('planSupplyLimit').onchange = drawPlanSupply;
  }

  initialize();
})();
