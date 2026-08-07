$('buildCore').onclick=buildCore;
function parseIssueQty(v){if(typeof v==='number')return Number.isFinite(v)?v:0;let t=N(v);if(!t||t==='-'||t==='--')return 0;let neg=false;if(t.startsWith('(')&&t.endsWith(')')){neg=true;t=t.slice(1,-1)}if(t.endsWith('-')){neg=true;t=t.slice(0,-1)}t=t.replace(/,/g,'').replace(/\s/g,'').replace(/[₹$€£]/g,'').replace(/[^0-9.+-]/g,'');let n=Number(t);if(!Number.isFinite(n))return 1;return neg?-Math.abs(n):n}
function buildCore(){let allowed=new Set(allowedLocations.map(NK)),filtered=plan.filter(r=>allowed.has(NK(r.Location))),g=new Map();filtered.forEach(r=>{let s=N(r['STO Number']);if(!s)return;if(!g.has(s))g.set(s,[]);g.get(s).push(r)});let blocked=new Set(bsto.map(N)),p=[];for(let [s,rows] of g){if(rows.length&&rows.every(r=>parseIssueQty(r['Issue Qty'])===0)&&!blocked.has(s))p.push(...rows)}let u=[...new Set(p.map(r=>N(r['STO Number'])))].filter(s=>s&&!mpending.map(N).includes(s));if(u.length)return unknownModal(u,p);continueCore(p)}
function unknownModal(u,p){$('mTitle').textContent='Pending / Block Decision';$('mBody').innerHTML='';u.forEach(s=>{let d=document.createElement('div');d.className='mrow';d.innerHTML=`<label>${s}</label><select data-sto="${s}"><option>Pending</option><option>Block</option></select>`;$('mBody').appendChild(d)});$('mSave').onclick=()=>{document.querySelectorAll('#mBody select').forEach(s=>{if(s.value==='Block'){if(!bsto.includes(s.dataset.sto))bsto.push(s.dataset.sto)}else if(!mpending.includes(s.dataset.sto))mpending.push(s.dataset.sto)});closeM();drawBsto();save();continueCore(p.filter(r=>!bsto.includes(N(r['STO Number']))))};openM()}
function continueCore(p){if(raipur.length)raipurModal(p);else finalCore(p,[])}
function raipurModal(p){
 $('mTitle').textContent='Raipur Setup';
 $('mBody').innerHTML='<div class="mrow"><label>Raipur SPlt</label><input id="rsplt" placeholder="Type SPlt"></div><div class="mrow"><label>Raipur Dispatch?</label><select id="rdisp"><option value="">Select</option><option value="Yes">Yes - Ignore Raipur</option><option value="No">No - Include Raipur</option></select></div><div class="notice">Yes = Raipur dispatched, report me include nahi hoga.<br>No = Raipur pending, Core Pending aur Total Stock Plan me include hoga.</div>';
 $('mSave').onclick=()=>{
  const s=N($('rsplt').value),d=$('rdisp').value;
  if(!d)return toast('Raipur Dispatch Yes/No select karein');
  if(d==='No'&&!s)return toast('Raipur ke liye SPlt enter karein');
  let e=[];
  if(d==='No')e=raipur.map(r=>({SPlt:s,Plant:N(r.Plant),'Plant Name':'',Location:N(r.Location)||'MAIN','Material No.':N(r['Material No.']),Description:N(r.Description),'STO Qty':Q(r.Qty),'STO Number':''}));
  closeM();
  finalCore(p,e);
 };
 openM();
}
function finalCore(p,e){
 const normalRows=p.map(r=>({SPlt:r.SPlt,Plant:r.Plant,'Plant Name':r['Plant Name'],Location:r.Location,'Material No.':r['Material No.'],Description:r.Description,'STO Qty':Q(r['STO Qty']),'STO Number':r['STO Number']}));
 core=[...e,...normalRows];
 drawCore();
 const stoCount=new Set(core.map(r=>N(r['STO Number'])).filter(Boolean)).size;
 $('coreInfo').textContent=`${core.length.toLocaleString('en-IN')} rows • ${stoCount.toLocaleString('en-IN')} STO • ${e.length.toLocaleString('en-IN')} Raipur rows`;
 refresh();
 toast(e.length?`${e.length} Raipur rows included in Core Pending`:'Core Pending ready');
}
function drawCore(){drawPrev('coreTable',CC,core,limitValue('coreLimit'))}
$('coreLimit').onchange=drawCore;

const CORE_EXCEL_BORDER={top:{style:'thin',color:{rgb:'B7C3D0'}},bottom:{style:'thin',color:{rgb:'B7C3D0'}},left:{style:'thin',color:{rgb:'B7C3D0'}},right:{style:'thin',color:{rgb:'B7C3D0'}}};
function coreExcelStyle(kind='body'){
 const base={font:{name:'Calibri',sz:10,color:{rgb:'000000'}},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:CORE_EXCEL_BORDER};
 if(kind==='header')return {...base,font:{name:'Calibri',sz:11,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'15803D'}}};
 if(kind==='total')return {...base,font:{name:'Calibri',sz:10,bold:true,color:{rgb:'FFFFFF'}},fill:{patternType:'solid',fgColor:{rgb:'15803D'}}};
 return base;
}
function coreCloneStyle(style){return JSON.parse(JSON.stringify(style))}
function coreColumnWidths(headers,rows){return headers.map(header=>{let max=String(header).length;rows.forEach(row=>{max=Math.max(max,String(row[header]??'').length)});return {wch:Math.min(Math.max(max+2,11),42)}})}
function coreRowHeight(headers,row,widths){let lines=1;headers.forEach((header,index)=>{const width=Math.max(widths[index]?.wch||12,8);lines=Math.max(lines,Math.ceil(String(row[header]??'').length/width))});return {hpt:Math.min(Math.max(18,lines*15),60)}}
function createCorePendingSheet(rows){
 const totalQty=rows.reduce((sum,row)=>sum+Q(row['STO Qty']),0);
 const exportRows=[...rows,{SPlt:'',Plant:'', 'Plant Name':'',Location:'', 'Material No.':'',Description:'Grand Total','STO Qty':totalQty,'STO Number':''}];
 const data=[CC,...exportRows.map(row=>CC.map(header=>row[header]??''))];
 const ws=XLSX.utils.aoa_to_sheet(data);
 const range=XLSX.utils.decode_range(ws['!ref']);
 for(let col=range.s.c;col<=range.e.c;col++){
  const cell=ws[XLSX.utils.encode_cell({r:0,c:col})];
  if(cell)cell.s=coreCloneStyle(coreExcelStyle('header'));
 }
 exportRows.forEach((row,rowIndex)=>{
  const excelRow=rowIndex+1;
  const isTotal=row.Description==='Grand Total';
  CC.forEach((header,colIndex)=>{
   const cell=ws[XLSX.utils.encode_cell({r:excelRow,c:colIndex})];
   if(!cell)return;
   cell.s=coreCloneStyle(coreExcelStyle(isTotal?'total':'body'));
   if(typeof cell.v==='number'&&Number.isFinite(cell.v)){
    cell.z='#,##,##0;[Red]-#,##,##0';
    cell.s.alignment.horizontal='right';
   }
  });
 });
 const widths=coreColumnWidths(CC,exportRows);
 ws['!cols']=widths;
 ws['!rows']=[{hpt:28},...exportRows.map(row=>coreRowHeight(CC,row,widths))];
 return ws;
}
function safeCoreSheetName(value,index){
 const cleaned=N(value).replace(/[\\/?*\[\]:]/g,'_').slice(0,31);
 return cleaned||`SPlt_${index+1}`;
}
function downloadCorePending(){
 if(!core.length){toast('Pehle Core Pending Report build karein');return}
 if(typeof XLSX==='undefined'||!XLSX.utils){toast('Excel library load nahi hui');return}
 try{
  const grouped=new Map();
  core.forEach(row=>{const splt=N(row.SPlt)||'Blank SPlt';if(!grouped.has(splt))grouped.set(splt,[]);grouped.get(splt).push(row)});
  const workbook=XLSX.utils.book_new();
  [...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).forEach(([splt,rows],index)=>{
   XLSX.utils.book_append_sheet(workbook,createCorePendingSheet(rows),safeCoreSheetName(splt,index));
  });
  downloadWorkbook(workbook,'Core_Pending_Report_Manish_Pandey.xlsx');
  toast('Core Pending Excel download started');
 }catch(error){console.error('Core Pending download failed:',error);toast(error&&error.message?`Download error: ${error.message}`:'Download error')}
}
$('downloadCore').onclick=downloadCorePending;

$('sendPlan').onclick=()=>{if(!core.length)return toast('Pehle Core Pending build karein');let ss=[...new Set(core.map(r=>N(r.SPlt)).filter(Boolean))];$('mTitle').textContent='Send Data to Plan';$('mBody').innerHTML='';ss.forEach(s=>{let d=document.createElement('div');d.className='mrow';d.innerHTML=`<label>${s}</label><input data-splt="${s}" value="${spltPlanMap[s]||''}" placeholder="Plan Name or Ignore">`;$('mBody').appendChild(d)});$('mSave').onclick=()=>{let m=new Map();document.querySelectorAll('#mBody input').forEach(i=>{m.set(i.dataset.splt,N(i.value));spltPlanMap[i.dataset.splt]=N(i.value)});let a=new Map();core.forEach(r=>{let pn=m.get(N(r.SPlt));if(!pn||NK(pn)==='ignore')return;pn=canonicalRemark(pn);let k=RK(pn)+'||'+NK(r['Material No.'])+'||'+NK(r.Description);if(!a.has(k))a.set(k,{'Plan Name':pn,'Material No.':N(r['Material No.']),Description:N(r.Description),Qty:0});a.get(k).Qty+=Q(r['STO Qty'])});planning=[...a.values()];closeM();drawPlanning();refresh();save();toast(planning.length+' planning records')};openM()};
