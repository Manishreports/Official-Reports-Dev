function drawReport(){drawPivot();drawMain();drawSignature();drawFinal()}
function drawPivot(){renderRowsWithTotal('pivTable',ph,pr,limitValue('pivotLimit'))}
function drawSignature(){renderRowsWithTotal('sigTable',sh,sr,limitValue('signatureLimit'))}
function drawMain(){let t=$('mainTable'),a=t.querySelector('thead'),b=t.querySelector('tbody');a.innerHTML='';b.innerHTML='';let hr=document.createElement('tr');mh.forEach(x=>{let th=document.createElement('th');th.textContent=x;hr.appendChild(th)});a.appendChild(hr);let total=mr.find(r=>r['Material Description']==='Grand Total'),rows=mr.filter(r=>r!==total).slice(0,limitValue('mainLimit'));[...rows,...(total?[total]:[])].forEach(r=>{let tr=document.createElement('tr'),tot=r===total;if(tot)tr.className='total';mh.forEach(x=>{let td=document.createElement('td');td.textContent=r[x]??'';if(!tot&&x.endsWith('Pending')&&Q(r[x])<0)td.className='yellow';tr.appendChild(td)});b.appendChild(tr)})}
function drawFinal(){let t=$('finTable'),a=t.querySelector('thead'),b=t.querySelector('tbody');a.innerHTML='';b.innerHTML='';let hr=document.createElement('tr');fh.forEach(x=>{let th=document.createElement('th');th.textContent=x;hr.appendChild(th)});a.appendChild(hr);fr.slice(0,limitValue('finalLimit')).forEach(r=>{let tr=document.createElement('tr');fh.forEach(x=>{let td=document.createElement('td');td.textContent=r[x]??'';if(x==='Final Bakal'&&r._a)td.className=r._a;if(x==='Final Tolagaon'&&r._b)td.className=r._b;tr.appendChild(td)});b.appendChild(tr)})}
['pivotLimit','mainLimit','signatureLimit','finalLimit'].forEach(id=>$(id).onchange=()=>{if(pr.length)drawReport()});

function createReportSheet(headers,rows){
  const data=[headers,...rows.map(r=>headers.map(h=>r[h]??''))];
  const ws=XLSX.utils.aoa_to_sheet(data);
  ws['!cols']=headers.map((h,i)=>{
    let m=String(h).length;
    rows.forEach(r=>{m=Math.max(m,String(r[h]??'').length)});
    return {wch:Math.min(Math.max(m+2,12),42)};
  });
  return ws;
}

function downloadWorkbook(workbook,filename){
  const bytes=XLSX.write(workbook,{bookType:'xlsx',type:'array',compression:true});
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  a.style.display='none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function download(){
  if(!pr.length){toast('Pehle report generate karein');return}
  if(typeof XLSX==='undefined'||!XLSX.utils){toast('Excel library load nahi hui');return}
  try{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,createReportSheet(ph,pr),'Pivot Sheet');
    XLSX.utils.book_append_sheet(wb,createReportSheet(mh,mr),'Main Sheet');
    XLSX.utils.book_append_sheet(wb,createReportSheet(sh,sr),'Signature');
    XLSX.utils.book_append_sheet(wb,createReportSheet(fh,fr),'Final');
    downloadWorkbook(wb,'HO_Stock_Report_Manish_Pandey.xlsx');
    toast('Excel download started');
  }catch(e){
    console.error('Excel download failed:',e);
    toast(e&&e.message?`Download error: ${e.message}`:'Download error');
  }
}
function drawRO(id,cols,rows){let b=$(id).querySelector('tbody');b.innerHTML='';rows.forEach(r=>{let tr=document.createElement('tr');cols.forEach(c=>{let td=document.createElement('td');td.textContent=r[c]??'';tr.appendChild(td)});b.appendChild(tr)})}
