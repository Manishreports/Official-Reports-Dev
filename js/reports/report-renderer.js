function drawReport(){drawPivot();drawMain();drawSignature();drawFinal()}

function drawPivot(){
  renderRowsWithTotal('pivTable',ph,pr,limitValue('pivotLimit'));
}

function drawSignature(){
  renderRowsWithTotal('sigTable',sh,sr,limitValue('signatureLimit'));
}

function drawMain(){
  const t=$('mainTable');
  const a=t.querySelector('thead');
  const b=t.querySelector('tbody');

  a.innerHTML='';
  b.innerHTML='';

  const hr=document.createElement('tr');

  mh.forEach(x=>{
    const th=document.createElement('th');
    th.textContent=x;
    hr.appendChild(th);
  });

  a.appendChild(hr);

  const total=mr.find(
    r=>r['Material Description']==='Grand Total'
  );

  const rows=mr
    .filter(r=>r!==total)
    .slice(0,limitValue('mainLimit'));

  [...rows,...(total?[total]:[])].forEach(r=>{
    const tr=document.createElement('tr');
    const isTotal=r===total;

    if(isTotal)tr.className='total';

    mh.forEach(x=>{
      const td=document.createElement('td');
      td.textContent=r[x]??'';

      if(
        !isTotal &&
        x.endsWith('Pending') &&
        Q(r[x])<0
      ){
        td.className='yellow';
      }

      tr.appendChild(td);
    });

    b.appendChild(tr);
  });
}

function drawFinal(){
  const t=$('finTable');
  const a=t.querySelector('thead');
  const b=t.querySelector('tbody');

  a.innerHTML='';
  b.innerHTML='';

  const hr=document.createElement('tr');

  fh.forEach(x=>{
    const th=document.createElement('th');
    th.textContent=x;
    hr.appendChild(th);
  });

  a.appendChild(hr);

  fr.slice(0,limitValue('finalLimit')).forEach(r=>{
    const tr=document.createElement('tr');

    fh.forEach(x=>{
      const td=document.createElement('td');
      td.textContent=r[x]??'';

      if(x==='Final Bakal'&&r._a)td.className=r._a;
      if(x==='Final Tolagaon'&&r._b)td.className=r._b;

      tr.appendChild(td);
    });

    b.appendChild(tr);
  });
}

[
  'pivotLimit',
  'mainLimit',
  'signatureLimit',
  'finalLimit'
].forEach(id=>{
  $(id).onchange=()=>{
    if(pr.length)drawReport();
  };
});

function createReportSheet(headers,rows){
  const data=[
    headers,
    ...rows.map(r=>headers.map(h=>r[h]??''))
  ];

  const ws=XLSX.utils.aoa_to_sheet(data);

  ws['!cols']=headers.map(h=>{
    let maxLength=String(h).length;

    rows.forEach(r=>{
      maxLength=Math.max(
        maxLength,
        String(r[h]??'').length
      );
    });

    return {
      wch:Math.min(Math.max(maxLength+2,12),42)
    };
  });

  return ws;
}

function downloadWorkbook(workbook,filename){
  const bytes=XLSX.write(workbook,{
    bookType:'xlsx',
    type:'array',
    compression:true
  });

  const blob=new Blob(
    [bytes],
    {
      type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  );

  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');

  anchor.href=url;
  anchor.download=filename;
  anchor.style.display='none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  setTimeout(()=>{
    URL.revokeObjectURL(url);
  },3000);
}

function download(){
  if(!pr.length){
    toast('Pehle report generate karein');
    return;
  }

  if(typeof XLSX==='undefined'||!XLSX.utils){
    toast('Excel library load nahi hui');
    return;
  }

  try{
    const wb=XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      createReportSheet(ph,pr),
      'Pivot Sheet'
    );

    XLSX.utils.book_append_sheet(
      wb,
      createReportSheet(mh,mr),
      'Main Sheet'
    );

    XLSX.utils.book_append_sheet(
      wb,
      createReportSheet(sh,sr),
      'Signature'
    );

    XLSX.utils.book_append_sheet(
      wb,
      createReportSheet(fh,fr),
      'Final'
    );

    downloadWorkbook(
      wb,
      'HO_Stock_Report_Manish_Pandey.xlsx'
    );

    toast('Excel download started');
  }catch(error){
    console.error('Excel download failed:',error);

    toast(
      error&&error.message
        ? `Download error: ${error.message}`
        : 'Download error'
    );
  }
}

function drawRO(id,cols,rows){
  const b=$(id).querySelector('tbody');
  b.innerHTML='';

  rows.forEach(r=>{
    const tr=document.createElement('tr');

    cols.forEach(c=>{
      const td=document.createElement('td');
      td.textContent=r[c]??'';
      tr.appendChild(td);
    });

    b.appendChild(tr);
  });
}

/*
  IMPORTANT:
  Event binding is placed here because both genHo() and download()
  are already defined by the time this file runs.
*/
$('genHo').onclick=genHo;
$('downHo').onclick=download;
