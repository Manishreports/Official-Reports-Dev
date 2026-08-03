function coreSummaryData(){let a={};core.forEach(r=>{let pn=canonicalRemark(spltPlanMap[N(r.SPlt)]||'');if(!pn||NK(pn)==='ignore')return;a[pn]=(a[pn]||0)+Q(r['STO Qty'])});if(!Object.keys(a).length){a.Bakal=0;a.Tolagaon=0}return a}
function coreSpltSummaryData(){
 const data={};
 core.forEach(row=>{const splt=N(row.SPlt)||'Blank SPlt';data[`SPlt ${splt}`]=(data[`SPlt ${splt}`]||0)+Q(row['STO Qty'])});
 if(!Object.keys(data).length)data['Core Pending Qty']=0;
 return data;
}
function refresh(){let rm=new Map(remarks.map(r=>[K(r),N(r.Remarks)])),seen=new Set(),rp=0;[...stock,...manual].forEach(r=>{let k=K(r);if(!seen.has(k)){seen.add(k);if(!rm.get(k))rp++}});let sto=new Set(core.map(r=>N(r['STO Number'])).filter(Boolean)).size,put=(id,v)=>{if($(id))$(id).textContent=typeof v==='number'?v.toLocaleString('en-IN'):v};[['dStock',stock.length],['dPlan',plan.length],['dSto',sto],['dPlanning',planning.length],['dRem',rp],['dBlock',bsto.length],['sRaw',stock.length],['sManual',manual.length],['sWork',stock.length+manual.length],['sRem',rp],['remCount',remarks.length],['remPend',rp],['catCount',cats.length],['manCount',manual.length],['mbCount',mblocks.length],['setupCount',setup.length],['planDbCount',planning.length],['pRows',plan.length],['cRows',core.length],['cSto',sto],['rCount',raipur.length],['mpCount',mpending.length],['bsCount',bsto.length],['rRecords',raipur.length],['mpRecords',mpending.length],['bsRecords',bsto.length],['allowedLocationCount',allowedLocations.length],['totalStockCount',totalStockRows.length],['totalStockColumns',totalStockHeaders.length],['totalStockDuplicateCount',totalStockDuplicateRows.length]].forEach(x=>put(...x));$('stockStatus').textContent=rp?rp+' Remarks Pending':'Ready';renderDynamicSummary('coreSummary',coreSummaryData());renderDynamicSummary('coreSpltOverviewSummary',coreSpltSummaryData());renderDynamicSummary('planningSummary',typeof planSummary==='function'?planSummary():{})}
function save(){localStorage.setItem('official_reports_dev_v2',JSON.stringify({manual,remarks,cats,mblocks,setup,planning,raipur,bsto,allowedLocations,spltPlanMap}))}
function load(){try{let s=JSON.parse(localStorage.getItem('official_reports_dev_v2')||'{}');manual=s.manual||[];remarks=s.remarks||[];cats=s.cats||[];mblocks=s.mblocks||[];setup=s.setup||setup;planning=s.planning||[];raipur=s.raipur||[];bsto=s.bsto||[];allowedLocations=s.allowedLocations||allowedLocations;spltPlanMap=s.spltPlanMap||{}}catch(e){}drawRem();drawEdit('manTable',SC,manual,()=>{drawEdit('manTable',SC,manual,()=>{});refresh();save()});drawEdit('mbTable',['Material','Material Description'],mblocks,()=>{drawEdit('mbTable',['Material','Material Description'],mblocks,()=>{});refresh();save()});drawSetup();drawPlanning();drawRO('rTable',['Plant','Material No.','Description','Qty'],raipur);drawBsto();drawAllowedLocations();drawStockPreview();drawPlanPreview();drawTotalStock();drawPlanHo();drawCore();refreshTotalStockStatus();refresh()}
load();

// V3.0 preflight: load the Excel engine before the first upload.
ExcelLibrary.ensure()
  .then(() => {
    if (typeof log === 'function') log('Excel engine ready');
  })
  .catch(error => {
    console.error(error);
    if (typeof log === 'function') log(`Excel engine error: ${error.message}`);
    const status = document.getElementById('stockStatus');
    if (status) {
      status.textContent = 'Excel Engine Offline';
      status.style.background = '#fee2e2';
      status.style.color = '#991b1b';
    }
  });
