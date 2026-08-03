const TOTAL_STOCK_REQUIRED_COLUMNS=[
  'Plant','Plant Name','Location','REGION NAME','AREA','Material No.','Description','Category','Net wt','Case Size',
  'Stock (ps)','Transit(Ps)','Avg Sale','Stock (KG)','Transit(KG)','HO.Blc Qty'
];
const PLAN_HO_PENDING_COLUMNS=[
  ['Bakal Pending','Bakal Pending'],
  ['DOFL Pending','DOFL Pending'],
  ['Pending 9916','9916 Pending'],
  ['Pending Bakal ECOM','Bakal Ecom Pending'],
  ['Tolagaon Pending','Tolagaon Pending'],
  ['Pending 9918','9918 Pending'],
  ['Pending 9919','9919 Pending'],
  ['Pending Tolagaon ECOM','Tolagaon Ecom Pending']
];
const TS_NUMBER_COLUMNS=new Set(['Stock (ps)','Transit(Ps)','Plan','T.Stock (Ps)','Avg Sale','HO.Blc Qty','Forecast Pend.',...PLAN_HO_PENDING_COLUMNS.map(x=>x[0])]);

$('totalStockBtn').onclick=()=>$('totalStockFile').click();
$('totalStockFile').onchange=uploadTotalStockFile;
$('totalStockLimit').onchange=drawTotalStock;
$('planHoLimit').onchange=drawPlanHo;
$('buildPlanHo').onclick=buildPlanHoReport;
$('downloadPlanHo').onclick=downloadPlanHoReport;

function totalStockKey(row){return `${NK(row.Plant)}||${NK(row.Location)}||${NK(row['Material No.'])}`}
function formatIndian(value){return Q(value).toLocaleString('en-IN',{maximumFractionDigits:2})}
function totalStockCoreBuilt(){return $('coreInfo')&&NK($('coreInfo').textContent)!=='report not built.'}
function totalStockMainReady(){return Array.isArray(mr)&&mr.some(r=>N(r['Material Description'])&&r['Material Description']!=='Grand Total')}
function totalStockHeaderKey(v){return N(v).toLowerCase().replace(/[^a-z0-9]/g,'')}
function normalizeRgb(value){
  const raw=N(value).replace(/^#/, '').toUpperCase();
  if(!raw)return '';
  if(raw.length===8)return raw;
  if(raw.length===6)return `FF${raw}`;
  return '';
}
function indexedColor(index){
  const colors={5:'FFFFFF00',6:'FFFF00FF',9:'FFFFFFFF',10:'FFFF0000',13:'FFFF00FF',64:'FF000000'};
  return colors[Number(index)]||'';
}
function colorFromObject(color){
  if(!color)return '';
  if(color.rgb)return normalizeRgb(color.rgb);
  if(color.indexed!==undefined)return indexedColor(color.indexed);
  return '';
}
function resolveWorkbookCellStyle(cell,workbook){
  if(!cell)return null;
  let style=cell.s;
  if(typeof style==='number'&&workbook&&workbook.Styles){
    const xf=workbook.Styles.CellXf&&workbook.Styles.CellXf[style];
    if(xf){
      const fill=workbook.Styles.Fills&&workbook.Styles.Fills[xf.fillId];
      const font=workbook.Styles.Fonts&&workbook.Styles.Fonts[xf.fontId];
      style={fill,font};
    }
  }else if(style&&style.fillId!==undefined&&workbook&&workbook.Styles){
    style={
      ...style,
      fill:style.fill||(workbook.Styles.Fills&&workbook.Styles.Fills[style.fillId]),
      font:style.font||(workbook.Styles.Fonts&&workbook.Styles.Fonts[style.fontId])
    };
  }
  return style||null;
}
function extractCellVisualStyle(cell,workbook){
  const style=resolveWorkbookCellStyle(cell,workbook);
  if(!style)return null;
  const fill=style.fill||{};
  const font=style.font||{};
  const fillRgb=colorFromObject(fill.fgColor)||colorFromObject(fill.bgColor)||colorFromObject(style.fgColor);
  const fontRgb=colorFromObject(font.color);
  const bold=Boolean(font.bold||font.b);
  const pattern=fill.patternType||fill.pattern||style.patternType||'';
  if(!fillRgb&&!fontRgb&&!bold)return null;
  return {fillRgb,fontRgb,bold,pattern};
}
async function extractDescriptionStylesWithExcelJs(file,sheetName,descriptionHeader){
  const styles=new Map();
  if(typeof ExcelJS==='undefined'||!file||!file.arrayBuffer)return styles;
  try{
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet=workbook.getWorksheet(sheetName);
    if(!worksheet)return styles;
    let headerRowNumber=0,descriptionColumn=0;
    const wanted=totalStockHeaderKey(descriptionHeader||'Description');
    for(let r=1;r<=Math.min(10,worksheet.rowCount);r++){
      const row=worksheet.getRow(r);
      row.eachCell((cell,c)=>{if(!descriptionColumn&&totalStockHeaderKey(cell.value)===wanted){headerRowNumber=r;descriptionColumn=c;}});
      if(descriptionColumn)break;
    }
    if(!descriptionColumn)return styles;
    for(let r=headerRowNumber+1;r<=worksheet.rowCount;r++){
      const cell=worksheet.getRow(r).getCell(descriptionColumn);
      const fill=cell.fill||{};
      const font=cell.font||{};
      const fg=fill.fgColor||{};
      const fc=font.color||{};
      const fillRgb=normalizeRgb(fg.argb||fg.rgb||'');
      const fontRgb=normalizeRgb(fc.argb||fc.rgb||'');
      const bold=Boolean(font.bold);
      if(fillRgb||fontRgb||bold)styles.set(r-headerRowNumber-1,{fillRgb,fontRgb,bold,pattern:fill.pattern||fill.type||''});
    }
  }catch(error){console.warn('ExcelJS description style read failed, using SheetJS fallback',error);}
  return styles;
}

async function uploadTotalStockFile(event){
  const file=event.target.files[0];
  if(!file)return;
  try{
    const result=await ExcelImport.importMapped(file,'total-stock-working',TOTAL_STOCK_REQUIRED_COLUMNS);
    const ws=result.workbook.Sheets[result.sheetName];
    const sourceRows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:true});
    const sourceHeaders=sourceRows.length?Object.keys(sourceRows[0]).filter(k=>k!=='__rowNum__'):[];
    const forecastHeader=sourceHeaders.find(h=>totalStockHeaderKey(h)==='forecast')||'';
    const descHeader=result.mapping.Description;
    const range=XLSX.utils.decode_range(ws['!ref']||'A1:A1');
    let descColumn=-1;
    for(let c=range.s.c;c<=range.e.c;c++){
      const cell=ws[XLSX.utils.encode_cell({r:range.s.r,c})];
      if(cell&&totalStockHeaderKey(cell.v)===totalStockHeaderKey(descHeader)){descColumn=c;break}
    }
    const excelJsStyles=await extractDescriptionStylesWithExcelJs(file,result.sheetName,descHeader);
    totalStockRows=result.rows.map((row,index)=>{
      const sourceRow=sourceRows[index]||{};
      const rowNumber=Number.isInteger(sourceRow.__rowNum__)?sourceRow.__rowNum__:index+1;
      let style=excelJsStyles.get(index)||null;
      if(!style&&descColumn>=0){const cell=ws[XLSX.utils.encode_cell({r:rowNumber,c:descColumn})];style=extractCellVisualStyle(cell,result.workbook)}
      return {...row,Forecast:forecastHeader?(sourceRow[forecastHeader]??''):'',_descriptionStyle:style,_sourceRow:rowNumber+1};
    });
    totalStockHeaders=[...TOTAL_STOCK_REQUIRED_COLUMNS,...(forecastHeader?['Forecast']:[])];
    totalStockSourceHasForecast=Boolean(forecastHeader);
    totalStockSourceSheet=result.sheetName;
    totalStockSourceFileName=file.name;
    totalStockPlanHoRows=[];totalStockPlanHoHeaders=[];
    validateTotalStockDuplicates();
    drawTotalStock();drawPlanHo();refreshTotalStockStatus();refresh();
    $('totalStockInfo').textContent=`${totalStockRows.length.toLocaleString('en-IN')} rows loaded from ${result.sheetName}.`;
    if(totalStockDuplicateRows.length)showDuplicatePopup();else toast('Total Stock data loaded');
    if(window.InventoryDashboard&&typeof window.InventoryDashboard.onTotalStockLoaded==='function')window.InventoryDashboard.onTotalStockLoaded();
  }catch(error){if(error.message!=='Upload cancelled')toast(error.message||'Total Stock file read nahi hui')}
  finally{$('totalStockFile').value=''}
}

function validateTotalStockDuplicates(){
  const groups=new Map();
  totalStockRows.forEach((row,index)=>{const key=totalStockKey(row);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index)});
  totalStockDuplicateRows=[];
  groups.forEach(indices=>{if(indices.length>1){const row=totalStockRows[indices[0]];totalStockDuplicateRows.push({Plant:row.Plant,Location:row.Location,'Material No.':row['Material No.'],Rows:indices.map(i=>totalStockRows[i]._sourceRow).join(', ')})}});
}

function showMessagePopup(title,message){
  $('mTitle').textContent=title;$('mBody').innerHTML='';const p=document.createElement('p');p.className='modal-help';p.textContent=message;$('mBody').appendChild(p);$('mCancel').classList.add('hidden');$('mSave').textContent='OK';$('mSave').onclick=()=>{$('mCancel').classList.remove('hidden');$('mSave').textContent='Save';closeM()};$('mX').onclick=$('mSave').onclick;openM();
}
function showDuplicatePopup(){
  $('mTitle').textContent='Duplicate Records Found';$('mBody').innerHTML='<p class="modal-help">Plant + Location + Material No. duplicate hai. Source file correct kiye bina report generate nahi hogi.</p>';
  const table=document.createElement('table');table.className='modal-data-table';table.innerHTML='<thead><tr><th>Plant</th><th>Location</th><th>Material No.</th><th>Excel Rows</th></tr></thead><tbody></tbody>';
  totalStockDuplicateRows.slice(0,20).forEach(r=>{const tr=document.createElement('tr');['Plant','Location','Material No.','Rows'].forEach(c=>{const td=document.createElement('td');td.textContent=r[c];tr.appendChild(td)});table.querySelector('tbody').appendChild(tr)});$('mBody').appendChild(table);if(totalStockDuplicateRows.length>20){const p=document.createElement('p');p.textContent=`Aur ${totalStockDuplicateRows.length-20} duplicates hain.`;$('mBody').appendChild(p)}
  $('mCancel').classList.add('hidden');$('mSave').textContent='OK';$('mSave').onclick=()=>{$('mCancel').classList.remove('hidden');$('mSave').textContent='Save';closeM()};$('mX').onclick=$('mSave').onclick;openM();
}

function findMainColumn(internalName){return mh.find(h=>totalStockHeaderKey(h)===totalStockHeaderKey(internalName))||''}
function buildPendingByMaterial(){
  const internalColumns=PLAN_HO_PENDING_COLUMNS.map(([output,internal])=>[output,findMainColumn(internal)]);
  if(internalColumns.some(x=>!x[1]))return null;
  const map=new Map();
  mr.filter(r=>r['Material Description']!=='Grand Total').forEach(r=>{const values={};internalColumns.forEach(([output,internal])=>values[output]=Q(r[internal]));map.set(NK(r.Material),values)});
  return map;
}
function buildPlanByKey(){
  const map=new Map();
  core.forEach(r=>{const key=totalStockKey(r);map.set(key,Q(map.get(key))+Q(r['STO Qty']))});
  return map;
}

function buildPlanHoReport(){
  if(!totalStockRows.length){toast('Pehle Total Stock file upload karein');return}
  validateTotalStockDuplicates();
  if(totalStockDuplicateRows.length){showDuplicatePopup();return}
  if(!totalStockMainReady()){
    showMessagePopup('HO Pending Required','Pehle HO Stock Report generate karein. Main Sheet pending data ke bina Plan & HO report nahi banegi.');return;
  }
  const pendingMap=buildPendingByMaterial();
  if(!pendingMap){showMessagePopup('HO Pending Incomplete','Main Sheet me required pending columns available nahi hain. Main Sheet Setup aur HO Report check karein.');return}
  const planAvailable=totalStockCoreBuilt();
  const planMap=planAvailable?buildPlanByKey():new Map();
  totalStockPlanHoHeaders=['Plant','Plant Name','Location','Material No.','Description','Net wt','Case Size','Stock (ps)','Transit(Ps)'];
  if(planAvailable)totalStockPlanHoHeaders.push('Plan');
  totalStockPlanHoHeaders.push('T.Stock (Ps)','Avg Sale','CFA.Stock %','HO.Blc Qty');
  if(totalStockSourceHasForecast)totalStockPlanHoHeaders.push('Forecast Pend.');
  totalStockPlanHoHeaders.push(...PLAN_HO_PENDING_COLUMNS.map(x=>x[0]));
  let missingPendingCount=0;
  totalStockPlanHoRows=totalStockRows.map(source=>{
    const planQty=planAvailable?(planMap.get(totalStockKey(source))||0):0;
    const stock=Q(source['Stock (ps)']),transit=Q(source['Transit(Ps)']),total=stock+transit+planQty,avg=Q(source['Avg Sale']);
    const pending=pendingMap.get(NK(source['Material No.']))||null;if(!pending)missingPendingCount++;
    const row={'Plant':source.Plant,'Plant Name':source['Plant Name'],'Location':source.Location,'Material No.':source['Material No.'],'Description':source.Description,'Net wt':source['Net wt'],'Case Size':source['Case Size'],'Stock (ps)':stock,'Transit(Ps)':transit};
    if(planAvailable)row.Plan=planQty;
    row['T.Stock (Ps)']=total;row['Avg Sale']=avg;row['CFA.Stock %']=avg>0?total/avg:0;row['HO.Blc Qty']=Q(source['HO.Blc Qty']);
    if(totalStockSourceHasForecast)row['Forecast Pend.']=Q(source.Forecast)-planQty;
    PLAN_HO_PENDING_COLUMNS.forEach(([output])=>row[output]=pending?Q(pending[output]):0);
    row._descriptionStyle=source._descriptionStyle;return row;
  });
  drawPlanHo();refreshTotalStockStatus();
  const notes=[];if(!planAvailable)notes.push('Plan source not built: Plan column hidden');if(missingPendingCount)notes.push(`${missingPendingCount.toLocaleString('en-IN')} materials Main Sheet me nahi mile: pending 0 used`);
  $('planHoInfo').textContent=`${totalStockPlanHoRows.length.toLocaleString('en-IN')} rows ready${notes.length?' • '+notes.join(' • '):''}`;
  toast('Plan & HO report ready');
}

function applyDescriptionStyleToCell(td,style){
  if(!style)return;
  if(style.fillRgb)td.style.backgroundColor='#'+style.fillRgb.slice(-6);
  if(style.fontRgb)td.style.color='#'+style.fontRgb.slice(-6);
  if(style.bold)td.style.fontWeight='700';
}
function displayPlanHoValue(header,value){if(header==='CFA.Stock %')return `${Math.round(Q(value)*100).toLocaleString('en-IN')}%`;if(TS_NUMBER_COLUMNS.has(header))return formatIndian(value);return value??''}
function drawTotalStock(){
  const t=$('totalStockTable'),h=t.querySelector('thead'),b=t.querySelector('tbody');h.innerHTML='';b.innerHTML='';const headers=totalStockHeaders;const hr=document.createElement('tr');headers.forEach(x=>{const th=document.createElement('th');th.textContent=x;hr.appendChild(th)});h.appendChild(hr);
  totalStockRows.slice(0,limitValue('totalStockLimit')).forEach(row=>{const tr=document.createElement('tr');headers.forEach(x=>{const td=document.createElement('td');const value=row[x];td.textContent=['Stock (ps)','Transit(Ps)','Avg Sale','HO.Blc Qty','Forecast'].includes(x)&&typeof value==='number'?formatIndian(value):(value??'');if(x==='Description')applyDescriptionStyleToCell(td,row._descriptionStyle);tr.appendChild(td)});b.appendChild(tr)});
}
function drawPlanHo(){
  const t=$('planHoTable'),h=t.querySelector('thead'),b=t.querySelector('tbody');h.innerHTML='';b.innerHTML='';const hr=document.createElement('tr');totalStockPlanHoHeaders.forEach(x=>{const th=document.createElement('th');th.textContent=x;hr.appendChild(th)});h.appendChild(hr);
  totalStockPlanHoRows.slice(0,limitValue('planHoLimit')).forEach(row=>{const tr=document.createElement('tr');totalStockPlanHoHeaders.forEach(x=>{const td=document.createElement('td');td.textContent=displayPlanHoValue(x,row[x]);if(x==='Description')applyDescriptionStyleToCell(td,row._descriptionStyle);tr.appendChild(td)});b.appendChild(tr)});
  const summary={Rows:totalStockPlanHoRows.length,'T.Stock (Ps)':totalStockPlanHoRows.reduce((s,r)=>s+Q(r['T.Stock (Ps)']),0)};if(totalStockPlanHoHeaders.includes('Plan'))summary.Plan=totalStockPlanHoRows.reduce((s,r)=>s+Q(r.Plan),0);renderDynamicSummary('planHoSummary',summary);
}
function refreshTotalStockStatus(){
  const put=(id,v)=>{if($(id))$(id).textContent=v};put('totalStockDuplicateCount',totalStockDuplicateRows.length);put('totalStockPlanStatus',totalStockCoreBuilt()?'Ready':'Hidden');put('totalStockPendingStatus',totalStockMainReady()?'Ready':'Required');
}

function buildPlanHoWorksheet(){
  const data=[totalStockPlanHoHeaders,...totalStockPlanHoRows.map(r=>totalStockPlanHoHeaders.map(h=>r[h]??''))];
  const ws=XLSX.utils.aoa_to_sheet(data);const border={top:{style:'thin',color:{rgb:'FFD9E1EA'}},bottom:{style:'thin',color:{rgb:'FFD9E1EA'}},left:{style:'thin',color:{rgb:'FFD9E1EA'}},right:{style:'thin',color:{rgb:'FFD9E1EA'}}};
  totalStockPlanHoHeaders.forEach((h,c)=>{const cell=ws[XLSX.utils.encode_cell({r:0,c})];cell.s={font:{bold:true,color:{rgb:'FFFFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'FF003366'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border};});
  totalStockPlanHoRows.forEach((row,rIndex)=>{totalStockPlanHoHeaders.forEach((h,c)=>{const cell=ws[XLSX.utils.encode_cell({r:rIndex+1,c})];if(!cell)return;cell.s={font:{color:{rgb:'FF000000'}},alignment:{horizontal:TS_NUMBER_COLUMNS.has(h)?'right':'center',vertical:'top',wrapText:true},border};if(TS_NUMBER_COLUMNS.has(h))cell.z=h==='CFA.Stock %'?'0%':'#,##,##0.##';if(h==='Description'&&row._descriptionStyle){const src=row._descriptionStyle;if(src.fillRgb)cell.s.fill={patternType:'solid',fgColor:{rgb:normalizeRgb(src.fillRgb)}};if(src.fontRgb||src.bold)cell.s.font={...cell.s.font,...(src.fontRgb?{color:{rgb:src.fontRgb}}:{}),...(src.bold?{bold:true}:{})};}})});
  ws['!cols']=totalStockPlanHoHeaders.map(h=>({wch:h==='Description'?36:h==='Plant Name'?22:Math.min(Math.max(h.length+3,12),22)}));ws['!rows']=[{hpt:28},...totalStockPlanHoRows.map(r=>({hpt:Math.max(20,Math.ceil(N(r.Description).length/40)*15)}))];return ws;
}
function downloadPlanHoReport(){
  if(!totalStockPlanHoRows.length){toast('Pehle Plan & HO report build karein');return}
  try{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,buildPlanHoWorksheet(),'Plan & HO');const bytes=XLSX.write(wb,{bookType:'xlsx',type:'array',compression:true});const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Total_Stock_Plan_and_HO.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);toast('Plan & HO download started')}catch(error){console.error(error);toast(`Download error: ${error.message||'Unknown error'}`)}
}
