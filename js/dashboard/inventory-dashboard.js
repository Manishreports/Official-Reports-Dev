/* Official Reports V3.2 - Inventory dashboards, ECOM & DROS upload, overview stock panels */
(() => {
  'use strict';

  const ORDER_KEY = 'official_reports_inventory_location_order_v1';
  const VISIBILITY_KEY = 'official_reports_inventory_dashboard_visibility_v1';
  const ECOM_COLUMNS = [
    'Plant','Plant Name','Location','Material No','Description','Net Weight','Pack Size',
    'Stock','Transit Stock','Total Stock','Avg.Sale(Ea)','Stock (Kg)','Transit Stock(Kg)','Total Stock (Kg)'
  ];

  let ecomRows = [];
  let completeRows = [];
  let offlineRows = [];
  let signatureRows = [];
  let onlineRows = [];

  const el = id => document.getElementById(id);
  const txt = value => typeof N === 'function' ? N(value) : String(value ?? '').trim();
  const num = value => typeof Q === 'function' ? Q(value) : (Number(value) || 0);
  const norm = value => typeof NK === 'function' ? NK(value) : txt(value).toLowerCase();
  const fmt = value => Math.round(num(value)).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (_) { return fallback; }
  }
  function saveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function locationName(row) { return txt(row['Plant Name']); }
  function rowRegion(row) { return txt(row['REGION NAME'] ?? row.Region ?? row['Region Name']); }
  function rowArea(row) { return txt(row.AREA ?? row.Area); }
  function stockKg(row) { return num(row['Stock (KG)'] ?? row['Stock (Kg)']); }
  function transitKg(row) { return num(row['Transit(KG)'] ?? row['Transit (KG)'] ?? row['Transit Stock(Kg)']); }
  function escapeHtml(value) { return txt(value).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  function activatePage(pageId, title) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const page = el(pageId);
    if (page) page.classList.add('active');
    if (el('title')) el('title').textContent = title;
    if (el('sub')) el('sub').textContent = 'Inventory analysis dashboard';
    const main = document.querySelector('.main');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function insertUi() {
    const main = document.querySelector('.main');
    const sidebar = document.querySelector('.side');
    if (!main || !sidebar || el('complete-inventory-dashboard')) return;

    // ECOM & DROS upload remains an independent data-source option after Supply section.
    const ecomLabel = document.createElement('div');
    ecomLabel.className = 'label inventory-ecom-label';
    ecomLabel.textContent = 'ECOM & DROS STOCK';
    const ecomNav = document.createElement('button');
    ecomNav.className = 'nav';
    ecomNav.dataset.p = 'ecom-dros-stock';
    ecomNav.textContent = 'ECOM & DROS Stock Upload';
    sidebar.append(ecomLabel, ecomNav);

    const ecomPage = document.createElement('section');
    ecomPage.id = 'ecom-dros-stock'; ecomPage.className = 'page';
    ecomPage.innerHTML = `
      <div class="metrics">
        <div class="metric"><span>ECOM & DROS Rows</span><strong id="ecomRowCount">0</strong></div>
        <div class="metric"><span>Unique Locations</span><strong id="ecomLocationCount">0</strong></div>
        <div class="metric"><span>Total Stock KG</span><strong id="ecomStockTotal">0</strong></div>
        <div class="metric"><span>Total Transit KG</span><strong id="ecomTransitTotal">0</strong></div>
      </div>
      <div class="panel">
        <div class="head"><div><h3>ECOM & DROS Stock Upload</h3><p>Dashboard source only. New upload replaces previous data.</p></div></div>
        <div class="drop"><input id="ecomDrosFile" type="file" accept=".xlsx,.xls,.csv" hidden><button id="ecomDrosBtn" class="btn primary">Choose ECOM & DROS File</button></div>
        <div id="ecomDrosInfo" class="notice">No file uploaded.</div>
      </div>
      <div class="panel"><div class="head"><h3>ECOM & DROS Preview</h3><div class="table-controls">Show <select id="ecomLimit" class="limit-select"><option>5</option><option>10</option><option>50</option></select></div></div><div class="tablewrap compact"><table id="ecomTable"><thead></thead><tbody></tbody></table></div></div>`;
    main.appendChild(ecomPage);

    [
      ['complete-inventory-dashboard','Complete Inventory Dashboard'],
      ['offline-inventory-dashboard','Offline Inventory Dashboard'],
      ['signature-inventory-dashboard','Signature Inventory Dashboard'],
      ['online-inventory-dashboard','Online Inventory Dashboard']
    ].forEach(([id, title]) => main.appendChild(createDashboardPage(id, title)));

    buildReportsDashboardCards();

    el('ecomDrosBtn').onclick = () => el('ecomDrosFile').click();
    el('ecomDrosFile').onchange = uploadEcom;
    el('ecomLimit').onchange = drawEcomPreview;
    if (el('offlineStockLimit')) el('offlineStockLimit').onchange = refreshOverviewStockTables;
    if (el('onlineStockLimit')) el('onlineStockLimit').onchange = refreshOverviewStockTables;
    document.querySelectorAll('.dashboard-visibility input').forEach(input => input.addEventListener('change', event => {
      saveVisibility(event.target); drawAllDashboards();
    }));
    document.querySelectorAll('.download-inventory-dashboard').forEach(button => button.onclick = downloadDashboards);
    if (window.rebuildSidebarAccordion) window.rebuildSidebarAccordion();
    if (window.bindSidebarNavigation) window.bindSidebarNavigation();
  }

  function buildReportsDashboardCards() {
    const page = el('reports-dashboard');
    if (!page) return;
    page.innerHTML = `
      <div class="panel reports-dashboard-home">
        <div class="head"><div><h3>Reports Dashboard</h3><p>Inventory dashboards ko yahin se build aur open karein.</p></div></div>
        <div class="report-dashboard-grid">
          ${[
            ['complete-inventory-dashboard','Complete Inventory Dashboard','Offline, Online, DROS aur Signature ka combined view.'],
            ['offline-inventory-dashboard','Offline Inventory Dashboard','Total Stock source ka complete Stock KG aur Transit KG.'],
            ['signature-inventory-dashboard','Signature Inventory Dashboard','Category me Signature wale materials ka view.'],
            ['online-inventory-dashboard','Online Inventory Dashboard','ECOM + FK01 + DROS ka combined online view.']
          ].map(([id,title,desc]) => `<button class="report-dashboard-card" type="button" data-dashboard-target="${id}"><strong>${title}</strong><span>${desc}</span><em>Open Dashboard →</em></button>`).join('')}
        </div>
      </div>`;
    page.querySelectorAll('[data-dashboard-target]').forEach(button => {
      button.onclick = () => openDashboard(button.dataset.dashboardTarget, button.querySelector('strong').textContent);
    });
  }

  function createDashboardPage(id, title) {
    const section = document.createElement('section');
    section.id = id; section.className = 'page';
    section.innerHTML = `
      <div class="panel inventory-dashboard-panel">
        <div class="head">
          <div><h3>${title}</h3><p>Location order Total Stock ke unique Plant Name ke basis par remembered rahega.</p></div>
          <div class="toolbar dashboard-visibility">
            <label><input type="checkbox" data-column="REGION NAME" checked> Region</label>
            <label><input type="checkbox" data-column="AREA" checked> Area</label>
            <button class="btn secondary edit-location-order" type="button">Edit Location Order</button>
            <button class="btn success download-inventory-dashboard" type="button">Download Dashboards</button>
          </div>
        </div>
        <div class="dynamic-metrics dashboard-summary"></div>
        <div class="tablewrap compact inventory-dashboard-wrap"><table class="inventory-dashboard-table"><thead></thead><tbody></tbody></table></div>
      </div>`;
    section.querySelector('.edit-location-order').onclick = () => promptLocationOrder(true, () => drawAllDashboards());
    return section;
  }

  async function uploadEcom(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const result = await ExcelImport.importMapped(file, 'ecom-dros-stock', ECOM_COLUMNS);
      ecomRows = result.rows.map(row => ({ ...row }));
      el('ecomDrosInfo').textContent = `${ecomRows.length.toLocaleString('en-IN')} rows loaded from ${result.sheetName}.`;
      drawEcomPreview(); buildDashboards(); refreshEcomCards(); refreshOverviewStockTables();
      toast('ECOM & DROS Stock loaded');
    } catch (error) {
      if (error.message !== 'Upload cancelled') toast(error.message || 'ECOM & DROS file read nahi hui');
    } finally { event.target.value = ''; }
  }

  function drawEcomPreview() {
    const table = el('ecomTable'); if (!table) return;
    const headers = ECOM_COLUMNS;
    table.tHead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    table.tBodies[0].innerHTML = '';
    const limit = Number(el('ecomLimit')?.value || 5);
    ecomRows.slice(0, limit).forEach(row => {
      const tr = document.createElement('tr');
      headers.forEach(header => { const td = document.createElement('td'); const value = row[header]; td.textContent = /Stock|Sale/i.test(header) ? fmt(value) : txt(value); tr.appendChild(td); });
      table.tBodies[0].appendChild(tr);
    });
  }

  function refreshEcomCards() {
    const put = (id, value) => { if (el(id)) el(id).textContent = typeof value === 'number' ? fmt(value) : value; };
    put('ecomRowCount', ecomRows.length);
    put('ecomLocationCount', new Set(ecomRows.map(row => norm(row.Location)).filter(Boolean)).size);
    put('ecomStockTotal', ecomRows.reduce((sum, row) => sum + num(row['Stock (Kg)']), 0));
    put('ecomTransitTotal', ecomRows.reduce((sum, row) => sum + num(row['Transit Stock(Kg)']), 0));
  }

  function locationOrders() { return readJson(ORDER_KEY, {}); }
  function totalStockLocations() {
    return [...new Set((Array.isArray(totalStockRows) ? totalStockRows : []).map(locationName).filter(Boolean))];
  }
  function orderedLocations() {
    const orders = locationOrders();
    return totalStockLocations().sort((a,b) => (Number(orders[norm(a)]) || 999999) - (Number(orders[norm(b)]) || 999999) || a.localeCompare(b));
  }

  function openDashboard(pageId, title) {
    const locations = totalStockLocations();
    if (!locations.length) { toast('Pehle Total Stock file upload karein'); return; }
    const orders = locationOrders();
    const missing = locations.filter(name => !orders[norm(name)]);
    const finish = () => { buildDashboards(); activatePage(pageId, title); };
    if (missing.length) promptLocationOrder(false, finish);
    else finish();
  }

  function locationOrderText(locations, existing) {
    const sorted = [...locations].sort((a,b) => (Number(existing[norm(a)]) || 999999) - (Number(existing[norm(b)]) || 999999) || a.localeCompare(b));
    let next = Math.max(0, ...Object.values(existing).map(Number).filter(Number.isFinite));
    return sorted.map(name => {
      const current = Number(existing[norm(name)]) || ++next;
      return `${current}\t${name}`;
    }).join('\n');
  }

  function parseLocationOrderText(value, validLocations) {
    const valid = new Map(validLocations.map(name => [norm(name), name]));
    const next = {};
    const used = new Set();
    const errors = [];
    txt(value).split(/\r?\n/).map(line => line.trim()).filter(Boolean).forEach((line, index) => {
      const parts = line.split(/\t|,|\s{2,}/).map(item => item.trim()).filter(Boolean);
      let order, name;
      if (/^\d+$/.test(parts[0] || '')) { order = Number(parts[0]); name = parts.slice(1).join(' '); }
      else if (/^\d+$/.test(parts[parts.length - 1] || '')) { order = Number(parts[parts.length - 1]); name = parts.slice(0, -1).join(' '); }
      else { errors.push(`Line ${index + 1}: order number missing`); return; }
      const canonical = valid.get(norm(name));
      if (!canonical) { errors.push(`Line ${index + 1}: unknown Location ${name}`); return; }
      if (!Number.isInteger(order) || order < 1 || used.has(order)) { errors.push(`Line ${index + 1}: duplicate/invalid order ${order}`); return; }
      used.add(order); next[norm(canonical)] = order;
    });
    validLocations.forEach(name => { if (!next[norm(name)]) errors.push(`Missing Location: ${name}`); });
    return { next, errors };
  }

  function promptLocationOrder(force = false, onSaved = null) {
    const locations = totalStockLocations();
    if (!locations.length) { toast('Pehle Total Stock file upload karein'); return; }
    const existing = locationOrders();
    const missing = locations.filter(name => !existing[norm(name)]);
    if (!force && !missing.length) { if (onSaved) onSaved(); return; }

    el('mTitle').textContent = force ? 'Location Dashboard Order' : 'Dashboard Location Order Required';
    el('mBody').innerHTML = `
      <p class="modal-help">Sabhi Locations ko ek saath copy/paste karke order set karein. Format: <b>Order [TAB] Location</b>. Har Location ek line me ho.</p>
      <textarea id="locationOrderPaste" class="location-order-paste" spellcheck="false"></textarea>
      <small class="mapping-example">Example: 1[TAB]Punjab CFA</small>`;
    el('locationOrderPaste').value = locationOrderText(locations, existing);
    el('mSave').textContent = 'Save & Build';
    el('mSave').onclick = () => {
      const parsed = parseLocationOrderText(el('locationOrderPaste').value, locations);
      if (parsed.errors.length) { toast(parsed.errors[0]); return; }
      saveJson(ORDER_KEY, parsed.next);
      closeM(); el('mSave').textContent = 'Save';
      buildDashboards();
      toast('Location order saved');
      if (onSaved) onSaved();
    };
    const cancel = () => { closeM(); el('mSave').textContent = 'Save'; };
    el('mCancel').onclick = cancel; el('mX').onclick = cancel; openM();
  }

  function totalStockByLocation() {
    const map = new Map();
    (Array.isArray(totalStockRows) ? totalStockRows : []).forEach(row => {
      const location = locationName(row); if (!location) return;
      const k = norm(location);
      if (!map.has(k)) map.set(k, { 'REGION NAME': rowRegion(row), AREA: rowArea(row), Code: txt(row.Plant), Location: location, offlineHand:0, offlineTransit:0, signatureHand:0, signatureTransit:0, allHand:0, allTransit:0 });
      const item = map.get(k); const hand = stockKg(row), transit = transitKg(row); const signature = norm(row.Category).includes('signature');
      item.allHand += hand; item.allTransit += transit;
      if (signature) { item.signatureHand += hand; item.signatureTransit += transit; }
      else { item.offlineHand += hand; item.offlineTransit += transit; }
    });
    return map;
  }

  function ecomByLocation() {
    const map = new Map();
    ecomRows.forEach(row => {
      const location = txt(row['Plant Name']); if (!location) return;
      const k = norm(location); if (!map.has(k)) map.set(k, { onlineHand:0, onlineTransit:0, drosHand:0, drosTransit:0, allHand:0, allTransit:0 });
      const item = map.get(k), sourceLoc = norm(row.Location), hand = num(row['Stock (Kg)']), transit = num(row['Transit Stock(Kg)']);
      item.allHand += hand; item.allTransit += transit;
      if (sourceLoc === 'dros') { item.drosHand += hand; item.drosTransit += transit; }
      else if (sourceLoc === 'ecom' || sourceLoc === 'fk01') { item.onlineHand += hand; item.onlineTransit += transit; }
    });
    return map;
  }

  function buildDashboards() {
    const base = totalStockByLocation(); const online = ecomByLocation(); const locations = orderedLocations();
    completeRows = []; offlineRows = []; signatureRows = []; onlineRows = [];
    locations.forEach((location, index) => {
      const b = base.get(norm(location)) || { 'REGION NAME':'', AREA:'', Code:'', Location:location, offlineHand:0, offlineTransit:0, signatureHand:0, signatureTransit:0, allHand:0, allTransit:0 };
      const o = online.get(norm(location)) || { onlineHand:0, onlineTransit:0, drosHand:0, drosTransit:0, allHand:0, allTransit:0 };
      const identity = { 'S.No': index + 1, 'REGION NAME': b['REGION NAME'], AREA: b.AREA, Code: b.Code, Location: b.Location };
      const complete = { ...identity, 'Off line In_hand':b.offlineHand, 'Off line In_transit':b.offlineTransit, 'On line In_hand':o.onlineHand, 'On line In_transit':o.onlineTransit, 'Dros In_hand':o.drosHand, 'Dros In_transit':o.drosTransit, 'Signature in Hand':b.signatureHand, 'Signature in Transit':b.signatureTransit };
      complete.Total = ['Off line In_hand','Off line In_transit','On line In_hand','On line In_transit','Dros In_hand','Dros In_transit','Signature in Hand','Signature in Transit'].reduce((s,h)=>s+num(complete[h]),0);
      completeRows.push(complete);
      const offline = { ...identity, 'Off line In_hand':b.allHand, 'Off line In_transit':b.allTransit }; offline.Total = offline['Off line In_hand'] + offline['Off line In_transit']; offlineRows.push(offline);
      const signature = { ...identity, 'Signature in Hand':b.signatureHand, 'Signature in Transit':b.signatureTransit }; signature.Total = signature['Signature in Hand'] + signature['Signature in Transit']; signatureRows.push(signature);
      const onlineRow = { ...identity, 'On line In_hand':o.allHand, 'On line In_transit':o.allTransit }; onlineRow.Total = onlineRow['On line In_hand'] + onlineRow['On line In_transit']; onlineRows.push(onlineRow);
    });
    drawAllDashboards(); refreshOverviewStockTables();
  }

  function visibility() { return readJson(VISIBILITY_KEY, { region:true, area:true }); }
  function saveVisibility(changedInput) {
    const group = changedInput?.closest('.dashboard-visibility') || document.querySelector('.dashboard-visibility'); if (!group) return;
    const values = { region: group.querySelector('[data-column="REGION NAME"]').checked, area: group.querySelector('[data-column="AREA"]').checked };
    saveJson(VISIBILITY_KEY, values);
    document.querySelectorAll('.dashboard-visibility').forEach(item => { item.querySelector('[data-column="REGION NAME"]').checked = values.region; item.querySelector('[data-column="AREA"]').checked = values.area; });
  }

  function dashboardHeaders(type) {
    const vis = visibility(); const base = ['S.No', ...(vis.region ? ['REGION NAME'] : []), ...(vis.area ? ['AREA'] : []), 'Code','Location'];
    if (type === 'complete') return [...base,'Off line In_hand','Off line In_transit','On line In_hand','On line In_transit','Dros In_hand','Dros In_transit','Signature in Hand','Signature in Transit','Total'];
    if (type === 'offline') return [...base,'Off line In_hand','Off line In_transit','Total'];
    if (type === 'signature') return [...base,'Signature in Hand','Signature in Transit','Total'];
    return [...base,'On line In_hand','On line In_transit','Total'];
  }

  function drawDashboard(pageId, type, rows) {
    const page = el(pageId); if (!page) return; const table = page.querySelector('table'); const headers = dashboardHeaders(type);
    table.tHead.innerHTML = `<tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`; table.tBodies[0].innerHTML = '';
    rows.forEach(row => { const tr=document.createElement('tr'); headers.forEach(h=>{const td=document.createElement('td'); td.textContent = ['S.No','REGION NAME','AREA','Code','Location'].includes(h) ? txt(row[h]) : fmt(row[h]); tr.appendChild(td)}); table.tBodies[0].appendChild(tr); });
    const total = document.createElement('tr'); total.className='total'; headers.forEach(h=>{const td=document.createElement('td'); if(h==='Location')td.textContent='Grand Total'; else if(!['S.No','REGION NAME','AREA','Code'].includes(h))td.textContent=fmt(rows.reduce((s,r)=>s+num(r[h]),0)); total.appendChild(td)}); table.tBodies[0].appendChild(total);
    const sum = rows.reduce((s,r)=>s+num(r.Total),0); const summary=page.querySelector('.dashboard-summary'); summary.innerHTML=`<div class="dynamic-metric"><span>Locations</span><strong>${fmt(rows.length)}</strong></div><div class="dynamic-metric"><span>Grand Total</span><strong>${fmt(sum)}</strong></div>`;
  }

  function drawAllDashboards() {
    const vis = visibility(); document.querySelectorAll('.dashboard-visibility').forEach(group => { group.querySelector('[data-column="REGION NAME"]').checked=vis.region; group.querySelector('[data-column="AREA"]').checked=vis.area; });
    drawDashboard('complete-inventory-dashboard','complete',completeRows);
    drawDashboard('offline-inventory-dashboard','offline',offlineRows);
    drawDashboard('signature-inventory-dashboard','signature',signatureRows);
    drawDashboard('online-inventory-dashboard','online',onlineRows);
  }

  function styleSheet(headers, rows) {
    const data=[headers,...rows.map(r=>headers.map(h=>r[h]??''))];
    const ws=XLSX.utils.aoa_to_sheet(data); const border={top:{style:'thin',color:{rgb:'FF111827'}},bottom:{style:'thin',color:{rgb:'FF111827'}},left:{style:'thin',color:{rgb:'FF111827'}},right:{style:'thin',color:{rgb:'FF111827'}}};
    for(let r=0;r<=rows.length;r++)for(let c=0;c<headers.length;c++){const cell=ws[XLSX.utils.encode_cell({r,c})];if(!cell)continue;cell.s={alignment:{horizontal:'center',vertical:'center',wrapText:false},border,font:r===0?{bold:true,color:{rgb:'FFFFFF00'}}:{color:{rgb:'FF000000'}},fill:r===0?{patternType:'solid',fgColor:{rgb:'FF003B66'}}:undefined};if(r>0&&!['S.No','REGION NAME','AREA','Code','Location'].includes(headers[c]))cell.z='#,##,##0';}
    const totalIndex=rows.length+1; XLSX.utils.sheet_add_aoa(ws,[headers.map(h=>h==='Location'?'Grand Total':(!['S.No','REGION NAME','AREA','Code'].includes(h)?rows.reduce((s,row)=>s+Math.round(num(row[h])),0):''))],{origin:{r:totalIndex,c:0}});
    for(let c=0;c<headers.length;c++){const cell=ws[XLSX.utils.encode_cell({r:totalIndex,c})];if(cell)cell.s={font:{bold:true,color:{rgb:'FFFF0000'}},fill:{patternType:'solid',fgColor:{rgb:'FFFFFFFF'}},alignment:{horizontal:'center',vertical:'center'},border};}
    ws['!cols']=headers.map(h=>({wch:h==='Location'?24:h==='REGION NAME'||h==='AREA'?18:Math.max(10,Math.min(20,h.length+2))}));
    return ws;
  }

  function downloadDashboards() {
    if (!completeRows.length) { toast('Pehle Total Stock upload aur dashboard build karein'); return; }
    try {
      const wb=XLSX.utils.book_new();
      [['Complete Inventory','complete',completeRows],['Offline Inventory','offline',offlineRows],['Signature Inventory','signature',signatureRows],['Online Inventory','online',onlineRows]].forEach(([name,type,rows])=>XLSX.utils.book_append_sheet(wb,styleSheet(dashboardHeaders(type),rows),name));
      const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true}); const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Inventory_Dashboards.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);toast('Inventory dashboards download started');
    } catch (error) { console.error(error); toast(`Download error: ${error.message||'Unknown error'}`); }
  }

  function groupStockByPlant(rows, stockField, transitField) {
    const map = new Map();
    rows.forEach(row => {
      const name = txt(row['Plant Name']); if (!name) return;
      const k = norm(name);
      if (!map.has(k)) map.set(k, { plantName:name, stock:0, transit:0 });
      const item = map.get(k); item.stock += num(row[stockField]); item.transit += num(row[transitField]);
    });
    return [...map.values()].sort((a,b)=>(b.stock+b.transit)-(a.stock+a.transit));
  }

  function drawOverviewStockTable(tableId, rows, limitId) {
    const table = el(tableId); if (!table) return;
    const limit = Number(el(limitId)?.value || 5);
    table.tHead.innerHTML = '<tr><th>Plant Name</th><th>Stock (KG)</th><th>Transit (KG)</th></tr>';
    table.tBodies[0].innerHTML = '';
    rows.slice(0,limit).forEach(row => {
      const tr=document.createElement('tr'); [row.plantName,fmt(row.stock),fmt(row.transit)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.appendChild(td)}); table.tBodies[0].appendChild(tr);
    });
    if (!rows.length) table.tBodies[0].innerHTML='<tr><td colspan="3" class="empty-table-cell">Data available nahi hai.</td></tr>';
  }

  function refreshOverviewStockTables() {
    const offline = groupStockByPlant(Array.isArray(totalStockRows)?totalStockRows:[], 'Stock (KG)', 'Transit(KG)');
    const online = groupStockByPlant(ecomRows, 'Stock (Kg)', 'Transit Stock(Kg)');
    drawOverviewStockTable('offlineStockOverviewTable', offline, 'offlineStockLimit');
    drawOverviewStockTable('onlineStockOverviewTable', online, 'onlineStockLimit');
  }

  function onTotalStockLoaded() {
    // V3.2: no order popup during upload. Dashboard asks only when opened.
    buildDashboards(); refreshOverviewStockTables();
  }

  window.InventoryDashboard = {
    onTotalStockLoaded,
    build: buildDashboards,
    refreshOverview: refreshOverviewStockTables,
    snapshot: () => ({ecomRows,completeRows,offlineRows,signatureRows,onlineRows})
  };
  insertUi(); refreshEcomCards(); drawEcomPreview(); buildDashboards(); refreshOverviewStockTables();
})();
