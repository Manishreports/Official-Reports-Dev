function drawReport(){drawPivot();drawMain();drawSignature();drawFinal()}
function drawPivot(){renderRowsWithTotal('pivTable',ph,pr,limitValue('pivotLimit'))}
function drawSignature(){renderRowsWithTotal('sigTable',sh,sr,limitValue('signatureLimit'))}
function drawMain(){let t=$('mainTable'),a=t.querySelector('thead'),b=t.querySelector('tbody');a.innerHTML='';b.innerHTML='';let hr=document.createElement('tr');mh.forEach(x=>{let th=document.createElement('th');th.textContent=x;hr.appendChild(th)});a.appendChild(hr);let total=mr.find(r=>r['Material Description']==='Grand Total'),rows=mr.filter(r=>r!==total).slice(0,limitValue('mainLimit'));[...rows,...(total?[total]:[])].forEach(r=>{let tr=document.createElement('tr'),tot=r===total;if(tot)tr.className='total';mh.forEach(x=>{let td=document.createElement('td');td.textContent=r[x]??'';if(!tot&&x.endsWith('Pending')&&Q(r[x])<0)td.className='yellow';tr.appendChild(td)});b.appendChild(tr)})}
function drawFinal(){let t=$('finTable'),a=t.querySelector('thead'),b=t.querySelector('tbody');a.innerHTML='';b.innerHTML='';let hr=document.createElement('tr');fh.forEach(x=>{let th=document.createElement('th');th.textContent=x;hr.appendChild(th)});a.appendChild(hr);fr.slice(0,limitValue('finalLimit')).forEach(r=>{let tr=document.createElement('tr');fh.forEach(x=>{let td=document.createElement('td');td.textContent=r[x]??'';if(x==='Final Bakal'&&r._a)td.className=r._a;if(x==='Final Tolagaon'&&r._b)td.className=r._b;tr.appendChild(td)});b.appendChild(tr)})}
['pivotLimit','mainLimit','signatureLimit','finalLimit'].forEach(id=>$(id).onchange=()=>{if(pr.length)drawReport()});

const EXCEL_STYLE={
  header:{
    font:{bold:true,color:{rgb:'FFFFFF'},name:'Calibri',sz:11},
    fill:{patternType:'solid',fgColor:{rgb:'15803D'}},
    alignment:{horizontal:'center',vertical:'center',wrapText:true},
    border:{bottom:{style:'thin',color:{rgb:'0F5132'}}}
  },
  body:{
    font:{name:'Calibri',sz:10,color:{rgb:'000000'}},
    alignment:{horizontal:'center',vertical:'center',wrapText:true}
  },
  total:{
    font:{bold:true,color:{rgb:'FFFFFF'},name:'Calibri',sz:10},
    fill:{patternType:'solid',fgColor:{rgb:'15803D'}},
    alignment:{horizontal:'center',vertical:'center',wrapText:true},
    border:{top:{style:'thin',color:{rgb:'0F5132'}}}
  },
  yellow:{
    font:{name:'Calibri',sz:10,color:{rgb:'000000'}},
    fill:{patternType:'solid',fgColor:{rgb:'FEF08A'}},
    alignment:{horizontal:'center',vertical:'center',wrapText:true}
  },
  red:{
    font:{bold:true,name:'Calibri',sz:10,color:{rgb:'991B1B'}},
    fill:{patternType:'solid',fgColor:{rgb:'FECACA'}},
    alignment:{horizontal:'center',vertical:'center',wrapText:true}
  }
};

function cloneStyle(style){return JSON.parse(JSON.stringify(style))}
function isNumericValue(value){return typeof value==='number'&&Number.isFinite(value)}
function excelColumnWidth(header,rows){let max=String(header).length;rows.forEach(r=>{max=Math.max(max,String(r[header]??'').length)});return {wch:Math.min(Math.max(max+2,12),42)}}

function createStyledSheet(headers,rows,sheetType){
  const data=[headers,...rows.map(r=>headers.map(h=>r[h]??''))];
  const ws=XLSX.utils.aoa_to_sheet(data);
  const range=XLSX.utils.decode_range(ws['!ref']);

  for(let col=range.s.c;col<=range.e.c;col++){
    const cell=ws[XLSX.utils.encode_cell({r:0,c:col})];
    if(cell)cell.s=cloneStyle(EXCEL_STYLE.header);
  }

  rows.forEach((row,rowIndex)=>{
    const excelRow=rowIndex+1;
    const isGrandTotal=row['Material Description']==='Grand Total';

    headers.forEach((header,colIndex)=>{
      const address=XLSX.utils.encode_cell({r:excelRow,c:colIndex});
      const cell=ws[address];
      if(!cell)return;

      let style=isGrandTotal?EXCEL_STYLE.total:EXCEL_STYLE.body;

      if(!isGrandTotal&&sheetType==='main'&&header.endsWith('Pending')&&Q(row[header])<0){
        style=EXCEL_STYLE.yellow;
      }

      if(!isGrandTotal&&sheetType==='final'){
        if(header==='Final Bakal'&&row._a==='yellow')style=EXCEL_STYLE.yellow;
        if(header==='Final Bakal'&&row._a==='red')style=EXCEL_STYLE.red;
        if(header==='Final Tolagaon'&&row._b==='yellow')style=EXCEL_STYLE.yellow;
        if(header==='Final Tolagaon'&&row._b==='red')style=EXCEL_STYLE.red;
      }

      cell.s=cloneStyle(style);
      if(isNumericValue(cell.v))cell.z='#,##0;[Red]-#,##0';
    });
  });

  ws['!cols']=headers.map(h=>excelColumnWidth(h,rows));
  ws['!rows']=[{hpt:30},...rows.map(()=>({hpt:20}))];
  ws['!autofilter']={ref:`A1:${XLSX.utils.encode_col(headers.length-1)}1`};

  return ws;
}

function downloadWorkbook(workbook,filename){
  const bytes=XLSX.write(workbook,{bookType:'xlsx',type:'array',compression:true,cellStyles:true});
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;a.style.display='none';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}

function download(){
  if(!pr.length){toast('Pehle report generate karein');return}
  if(typeof XLSX==='undefined'||!XLSX.utils){toast('Excel library load nahi hui');return}
  try{
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,createStyledSheet(ph,pr,'pivot'),'Pivot Sheet');
    XLSX.utils.book_append_sheet(wb,createStyledSheet(mh,mr,'main'),'Main Sheet');
    XLSX.utils.book_append_sheet(wb,createStyledSheet(sh,sr,'signature'),'Signature');
    XLSX.utils.book_append_sheet(wb,createStyledSheet(fh,fr,'final'),'Final');
    downloadWorkbook(wb,'HO_Stock_Report_Manish_Pandey.xlsx');
    toast('Formatted Excel download started');
  }catch(e){console.error('Styled Excel download failed:',e);toast(e&&e.message?`Download error: ${e.message}`:'Download error')}
}

function drawRO(id,cols,rows){let b=$(id).querySelector('tbody');b.innerHTML='';rows.forEach(r=>{let tr=document.createElement('tr');cols.forEach(c=>{let td=document.createElement('td');td.textContent=r[c]??'';tr.appendChild(td)});b.appendChild(tr)})}

$('genHo').onclick=genHo;
$('downHo').onclick=download;
