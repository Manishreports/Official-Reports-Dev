/*
  OFFICIAL REPORTS DEV - SUPPLY MODULE 2.4

  Adds:
  - Supply Upload navigation moved to the bottom of TOTAL STOCK WORKING
  - Allowed Supply Locations master (persistent)
  - Supply Report: Plant + Location + Material wise Issue Qty sum
  - Empty Allowed Supply Locations blocks Supply Report and Plan & Supply
  - New Supply upload replaces old Supply data
  - Plan & Supply uses only allowed Supply locations
  - Combined Excel download remains: Plan & HO + Plan & Supply
  - Optional Supply Report Excel download
  - Manual Material Description full-width

  Existing Core Pending and HO Stock calculations are not changed.
*/

(() => {
  'use strict';

  const MODULE_VERSION = '2.4.0';
  const ALLOWED_STORAGE_KEY = 'official_reports_dev_allowed_supply_locations_v1';

  const SUPPLY_REQUIRED_COLUMNS = [
    'Plant',
    'Plant Name',
    'Location',
    'Material No.',
    'Description',
    'Issue Qty',
    'Issue_Date'
  ];

  const SUPPLY_REPORT_HEADERS = [
    'Plant',
    'Plant Name',
    'Location',
    'Material No.',
    'Description',
    'Supply'
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
  let allowedSupplyLocations = loadAllowedSupplyLocations();
  let supplyReportRows = [];
  let planSupplyRows = [];
  let planSupplyHeaders = [];

  function loadAllowedSupplyLocations() {
    try {
      const saved = JSON.parse(localStorage.getItem(ALLOWED_STORAGE_KEY) || '[]');
      return Array.isArray(saved)
        ? [...new Set(saved.map(value => N(value)).filter(Boolean))]
        : [];
    } catch (error) {
      console.warn('Allowed Supply Locations load failed:', error);
      return [];
    }
  }

  function saveAllowedSupplyLocations() {
    localStorage.setItem(
      ALLOWED_STORAGE_KEY,
      JSON.stringify(allowedSupplyLocations)
    );
  }

  function addStyles() {
    /* V3.0 uses the shared ERP theme. No module-specific table widths. */
  }

  function pageMeta(pageId) {
    const values = {
      'allowed-supply-locations': [
        'Allowed Supply Locations',
        'Supply Report aur Plan & Supply ke liye required locations.'
      ],
      'supply-report': [
        'Supply Report',
        'Plant + Location + Material wise Issue Qty sum.'
      ],
      'supply-upload': [
        'Supply Upload',
        'Har nayi file purane Supply data ko replace karegi.'
      ]
    };

    return values[pageId] || [pageId, ''];
  }

  function activateCustomPage(pageId, button) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav').forEach(nav => nav.classList.remove('active'));

    const page = $(pageId);
    if (page) page.classList.add('active');
    if (button) button.classList.add('active');

    const [title, subtitle] = pageMeta(pageId);
    if ($('title')) $('title').textContent = title;
    if ($('sub')) $('sub').textContent = subtitle;
  }

  function createNavButton(pageId, text) {
    const button = document.createElement('button');
    button.className = 'nav';
    button.dataset.p = pageId;
    button.textContent = text;
    button.addEventListener('click', () => activateCustomPage(pageId, button));
    return button;
  }

  function rebuildSupplyNavigation() {
    [
      'allowed-supply-locations',
      'supply-report',
      'supply-upload'
    ].forEach(pageId => {
      const old = document.querySelector(`.nav[data-p="${pageId}"]`);
      if (old) old.remove();
    });

    const planSupplyNav = document.querySelector('.nav[data-p="plan-supply"]');
    if (!planSupplyNav) return;

    const parent = planSupplyNav.parentNode;

    // Explicit requested order: Supply Upload is the last item.
    parent.insertBefore(
      createNavButton('allowed-supply-locations', 'Allowed Supply Locations'),
      planSupplyNav.nextSibling
    );

    const allowedNav = document.querySelector('.nav[data-p="allowed-supply-locations"]');
    parent.insertBefore(
      createNavButton('supply-report', 'Supply Report'),
      allowedNav.nextSibling
    );

    const reportNav = document.querySelector('.nav[data-p="supply-report"]');
    parent.insertBefore(
      createNavButton('supply-upload', 'Supply Upload'),
      reportNav.nextSibling
    );
  }

  function removeExistingSupplyPages() {
    [
      'allowed-supply-locations',
      'supply-report',
      'supply-upload'
    ].forEach(pageId => {
      const page = $(pageId);
      if (page) page.remove();
    });
  }

  function addSupplyPages() {
    removeExistingSupplyPages();

    const main = document.querySelector('main.main');
    if (!main) return;

    const allowedPage = document.createElement('section');
    allowedPage.id = 'allowed-supply-locations';
    allowedPage.className = 'page';
    allowedPage.innerHTML = `
      <div class="panel">
        <div class="head">
          <div>
            <h3>Allowed Supply Locations</h3>
            <p>List empty hui to Supply Report aur Plan & Supply dono block rahenge.</p>
          </div>
          <div class="rec">Records: <b id="allowedSupplyLocationCount">0</b></div>
        </div>

        <div class="supply-location-toolbar">
          <input id="allowedSupplyLocationInput" class="inline-input" placeholder="Location e.g. MAIN">
          <button id="addAllowedSupplyLocation" class="btn primary">Add Location</button>
        </div>

        <div class="tablewrap compact">
          <table id="allowedSupplyLocationTable">
            <thead><tr><th>Location</th><th>Action</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    `;

    const reportPage = document.createElement('section');
    reportPage.id = 'supply-report';
    reportPage.className = 'page';
    reportPage.innerHTML = `
      <div class="supply-status-grid">
        <div class="supply-status-card"><span>Report Rows</span><strong id="supplyReportRowCount">0</strong></div>
        <div class="supply-status-card"><span>Total Supply</span><strong id="supplyReportQtyTotal">0</strong></div>
        <div class="supply-status-card"><span>Ignored Source Rows</span><strong id="supplyIgnoredRowCount">0</strong></div>
      </div>

      <div class="panel">
        <div class="head">
          <div>
            <h3>Supply Report</h3>
            <p>Same Plant + Location + Material ki Issue Qty sum hogi.</p>
          </div>
          <div class="table-controls">
            Show
            <select id="supplyReportLimit" class="limit-select">
              <option>5</option>
              <option>10</option>
              <option>50</option>
            </select>
          </div>
        </div>

        <div class="toolbar">
          <button id="buildSupplyReport" class="btn primary">Build Supply Report</button>
          <button id="downloadSupplyReport" class="btn success">Download Supply Report</button>
        </div>

        <div id="supplyReportInfo" class="notice">Report not built.</div>

        <div class="tablewrap compact">
          <table id="supplyReportTable"><thead></thead><tbody></tbody></table>
        </div>
      </div>
    `;

    const uploadPage = document.createElement('section');
    uploadPage.id = 'supply-upload';
    uploadPage.className = 'page';
    uploadPage.innerHTML = `
      <div class="supply-status-grid">
        <div class="supply-status-card"><span>Supply Source Rows</span><strong id="supplyRowCount">0</strong></div>
        <div class="supply-status-card"><span>Source Keys</span><strong id="supplyKeyCount">0</strong></div>
        <div class="supply-status-card"><span>Total Issue Qty</span><strong id="supplyQtyTotal">0</strong></div>
      </div>

      <div class="panel">
        <div class="head">
          <div>
            <h3>Supply Upload</h3>
            <p>New upload old Supply data ko replace karega.</p>
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
          <h3>Supply Source Preview</h3>
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

    main.appendChild(allowedPage);
    main.appendChild(reportPage);
    main.appendChild(uploadPage);
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
            <p>Sirf Allowed Supply Locations ki rows include hongi.</p>
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

    let buildButton = $('buildPlanSupply');
    if (!buildButton) {
      buildButton = document.createElement('button');
      buildButton.id = 'buildPlanSupply';
      buildButton.className = 'btn primary';
      buildButton.textContent = 'Build Plan & Supply';
      toolbar.insertBefore(buildButton, $('downloadPlanHo'));
    }
    buildButton.onclick = buildPlanSupplyReport;

    const downloadButton = $('downloadPlanHo');
    if (downloadButton) {
      downloadButton.textContent = 'Download Plan & HO + Plan & Supply';
      downloadButton.onclick = downloadCombinedTotalStockReport;
    }
  }

  function formatIndianNumber(value) {
    return Q(value).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function normalizedLocation(value) {
    return NK(value);
  }

  function allowedLocationSet() {
    return new Set(
      allowedSupplyLocations
        .map(normalizedLocation)
        .filter(Boolean)
    );
  }

  function ensureAllowedLocations() {
    if (allowedSupplyLocations.length) return true;

    showMessagePopup(
      'Allowed Supply Locations Required',
      'Pehle Allowed Supply Locations page me kam se kam ek Location add karein. Report aage nahi banegi.'
    );
    return false;
  }

  function supplyKey(row) {
    return `${NK(row.Plant)}||${NK(row.Location)}||${NK(row['Material No.'])}`;
  }

  function isAllowedSupplyRow(row) {
    return allowedLocationSet().has(normalizedLocation(row.Location));
  }

  function filteredSupplyRows() {
    const allowed = allowedLocationSet();
    return supplyRows.filter(row => allowed.has(normalizedLocation(row.Location)));
  }

  function renderAllowedSupplyLocations() {
    const tbody = $('allowedSupplyLocationTable')?.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    [...allowedSupplyLocations]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .forEach(location => {
        const tr = document.createElement('tr');

        const locationCell = document.createElement('td');
        locationCell.textContent = location;
        tr.appendChild(locationCell);

        const actionCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn danger';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => {
          allowedSupplyLocations = allowedSupplyLocations.filter(
            value => normalizedLocation(value) !== normalizedLocation(location)
          );
          saveAllowedSupplyLocations();
          clearBuiltSupplyReports();
          renderAllowedSupplyLocations();
          refreshSupplyStatus();
          toast('Supply Location deleted');
        };

        actionCell.appendChild(deleteButton);
        tr.appendChild(actionCell);
        tbody.appendChild(tr);
      });

    if ($('allowedSupplyLocationCount')) {
      $('allowedSupplyLocationCount').textContent =
        allowedSupplyLocations.length.toLocaleString('en-IN');
    }
  }

  function addAllowedSupplyLocation() {
    const input = $('allowedSupplyLocationInput');
    const value = N(input?.value);

    if (!value) {
      toast('Location enter karein');
      return;
    }

    const exists = allowedSupplyLocations.some(
      location => normalizedLocation(location) === normalizedLocation(value)
    );

    if (exists) {
      toast('Location already added');
      return;
    }

    allowedSupplyLocations.push(value);
    saveAllowedSupplyLocations();
    clearBuiltSupplyReports();
    renderAllowedSupplyLocations();
    refreshSupplyStatus();
    input.value = '';
    toast('Supply Location added');
  }

  function clearBuiltSupplyReports() {
    supplyReportRows = [];
    planSupplyRows = [];
    planSupplyHeaders = [];
    drawSupplyReport();
    drawPlanSupply();

    if ($('supplyReportInfo')) $('supplyReportInfo').textContent = 'Report not built.';
    if ($('planSupplyInfo')) $('planSupplyInfo').textContent = 'Report not built.';
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

      // Replacement rule: never append old Supply data.
      supplyRows = result.rows.map(row => ({
        Plant: N(row.Plant),
        'Plant Name': N(row['Plant Name']),
        Location: N(row.Location),
        'Material No.': N(row['Material No.']),
        Description: N(row.Description),
        'Issue Qty': Q(row['Issue Qty']),
        Issue_Date: row.Issue_Date
      }));

      supplySourceFileName = file.name;
      supplySourceSheet = result.sheetName;
      clearBuiltSupplyReports();
      drawSupplyPreview();
      refreshSupplyStatus();

      $('supplyInfo').textContent =
        `${supplyRows.length.toLocaleString('en-IN')} rows loaded from ${result.sheetName}. Old Supply data replaced.`;

      toast('Supply data replaced and loaded');
    } catch (error) {
      if (error.message !== 'Upload cancelled') {
        toast(error.message || 'Supply file read nahi hui');
      }
    } finally {
      $('supplyFile').value = '';
    }
  }

  function aggregateSupplyRows() {
    const map = new Map();

    filteredSupplyRows().forEach(row => {
      const key = supplyKey(row);

      if (!map.has(key)) {
        map.set(key, {
          Plant: row.Plant,
          'Plant Name': row['Plant Name'],
          Location: row.Location,
          'Material No.': row['Material No.'],
          Description: row.Description,
          Supply: 0
        });
      }

      const aggregate = map.get(key);
      aggregate.Supply += Q(row['Issue Qty']);

      if (!aggregate['Plant Name'] && row['Plant Name']) {
        aggregate['Plant Name'] = row['Plant Name'];
      }
      if (!aggregate.Description && row.Description) {
        aggregate.Description = row.Description;
      }
    });

    return map;
  }

  function buildSupplyReport() {
    if (!ensureAllowedLocations()) return false;

    if (!supplyRows.length) {
      showMessagePopup(
        'Supply Upload Required',
        'Pehle Supply file upload karein.'
      );
      return false;
    }

    const aggregateMap = aggregateSupplyRows();
    supplyReportRows = [...aggregateMap.values()].sort((a, b) => {
      return N(a.Plant).localeCompare(N(b.Plant), undefined, { numeric: true }) ||
        N(a.Location).localeCompare(N(b.Location), undefined, { numeric: true }) ||
        N(a['Material No.']).localeCompare(N(b['Material No.']), undefined, { numeric: true });
    });

    drawSupplyReport();
    refreshSupplyStatus();

    const ignored = supplyRows.length - filteredSupplyRows().length;
    $('supplyReportInfo').textContent =
      `${supplyReportRows.length.toLocaleString('en-IN')} aggregated rows ready` +
      (ignored ? ` • ${ignored.toLocaleString('en-IN')} source rows ignored by Location filter` : '');

    toast('Supply Report ready');
    return true;
  }

  function buildSupplyByKey() {
    return aggregateSupplyRows();
  }

  function drawSupplyPreview() {
    const table = $('supplyTable');
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = document.createElement('tr');
    SUPPLY_REQUIRED_COLUMNS.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const limit = Number($('supplyLimit')?.value || 5);

    supplyRows.slice(0, limit).forEach(row => {
      const tr = document.createElement('tr');

      SUPPLY_REQUIRED_COLUMNS.forEach(header => {
        const td = document.createElement('td');
        td.textContent = header === 'Issue Qty'
          ? formatIndianNumber(row[header])
          : (row[header] ?? '');
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  function drawSupplyReport() {
    const table = $('supplyReportTable');
    if (!table) return;

    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headerRow = document.createElement('tr');
    SUPPLY_REPORT_HEADERS.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const limit = Number($('supplyReportLimit')?.value || 5);

    supplyReportRows.slice(0, limit).forEach(row => {
      const tr = document.createElement('tr');

      SUPPLY_REPORT_HEADERS.forEach(header => {
        const td = document.createElement('td');
        td.textContent = header === 'Supply'
          ? formatIndianNumber(row[header])
          : (row[header] ?? '');
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  function refreshSupplyStatus() {
    const allowed = allowedLocationSet();
    const allowedRows = supplyRows.filter(row => allowed.has(normalizedLocation(row.Location)));
    const ignoredRows = supplyRows.length - allowedRows.length;
    const sourceKeyCount = new Set(supplyRows.map(supplyKey)).size;
    const qtyTotal = supplyRows.reduce((sum, row) => sum + Q(row['Issue Qty']), 0);
    const reportTotal = supplyReportRows.reduce((sum, row) => sum + Q(row.Supply), 0);

    if ($('supplyRowCount')) $('supplyRowCount').textContent = supplyRows.length.toLocaleString('en-IN');
    if ($('supplyKeyCount')) $('supplyKeyCount').textContent = sourceKeyCount.toLocaleString('en-IN');
    if ($('supplyQtyTotal')) $('supplyQtyTotal').textContent = formatIndianNumber(qtyTotal);
    if ($('supplyReportRowCount')) $('supplyReportRowCount').textContent = supplyReportRows.length.toLocaleString('en-IN');
    if ($('supplyReportQtyTotal')) $('supplyReportQtyTotal').textContent = formatIndianNumber(reportTotal);
    if ($('supplyIgnoredRowCount')) $('supplyIgnoredRowCount').textContent = ignoredRows.toLocaleString('en-IN');
    if ($('allowedSupplyLocationCount')) $('allowedSupplyLocationCount').textContent = allowedSupplyLocations.length.toLocaleString('en-IN');
  }

  function buildPlanSupplyReport() {
    if (!ensureAllowedLocations()) return false;

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
    const allowed = allowedLocationSet();

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

    // Only allowed Supply locations are included in Plan & Supply.
    planSupplyRows = totalStockRows
      .filter(source => allowed.has(normalizedLocation(source.Location)))
      .map(source => {
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

        const supplyAggregate = supplyMap.get(totalStockKey(source));
        row.Supply = supplyAggregate ? Q(supplyAggregate.Supply) : 0;
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

    const limit = Number($('planSupplyLimit')?.value || 5);

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

  function applyWorksheetFormatting(ws, headers, rows, numberColumns) {
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
            horizontal: numberColumns.has(header) ? 'right' : 'center',
            vertical: 'top',
            wrapText: true
          },
          border
        };

        if (numberColumns.has(header)) {
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
    applyWorksheetFormatting(ws, planSupplyHeaders, planSupplyRows, PLAN_SUPPLY_NUMBER_COLUMNS);
    return ws;
  }

  function buildSupplyReportWorksheet() {
    const data = [
      SUPPLY_REPORT_HEADERS,
      ...supplyReportRows.map(row =>
        SUPPLY_REPORT_HEADERS.map(header => row[header] ?? '')
      )
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    applyWorksheetFormatting(
      ws,
      SUPPLY_REPORT_HEADERS,
      supplyReportRows,
      new Set(['Supply'])
    );
    return ws;
  }

  function triggerWorkbookDownload(workbook, filename) {
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
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  function downloadSupplyReport() {
    if (!supplyReportRows.length) {
      const built = buildSupplyReport();
      if (!built) return;
    }

    try {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        buildSupplyReportWorksheet(),
        'Supply Report'
      );
      triggerWorkbookDownload(workbook, 'Supply_Report.xlsx');
      toast('Supply Report download started');
    } catch (error) {
      console.error(error);
      toast(`Download error: ${error.message || 'Unknown error'}`);
    }
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

      triggerWorkbookDownload(
        workbook,
        'Total_Stock_Plan_HO_and_Supply.xlsx'
      );

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
        input.oninput = () => {
          input.title = input.value;
        };
      });
    };

    const body = table.querySelector('tbody');
    if (body) {
      const observer = new MutationObserver(applyTitles);
      observer.observe(body, { childList: true, subtree: true });
    }

    applyTitles();
  }

  function bindEvents() {
    $('addAllowedSupplyLocation').onclick = addAllowedSupplyLocation;
    $('allowedSupplyLocationInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') addAllowedSupplyLocation();
    });

    $('buildSupplyReport').onclick = buildSupplyReport;
    $('downloadSupplyReport').onclick = downloadSupplyReport;
    $('supplyReportLimit').onchange = drawSupplyReport;

    $('supplyUploadButton').onclick = () => $('supplyFile').click();
    $('supplyFile').onchange = uploadSupplyFile;
    $('supplyLimit').onchange = drawSupplyPreview;

    $('planSupplyLimit').onchange = drawPlanSupply;
  }

  function initialize() {
    addStyles();
    rebuildSupplyNavigation();
    addSupplyPages();
    activatePlanSupplyPage();
    updateTotalStockActions();
    makeManualDescriptionAlwaysVisible();
    bindEvents();

    renderAllowedSupplyLocations();
    drawSupplyPreview();
    drawSupplyReport();
    drawPlanSupply();
    refreshSupplyStatus();

    console.info(`Supply Module ${MODULE_VERSION} loaded`);
  }

  initialize();
})();
