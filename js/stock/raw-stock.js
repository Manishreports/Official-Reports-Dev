$('stockBtn').onclick=()=>$('stockFile').click();
$('planBtn').onclick=()=>$('planFile').click();
$('stockFile').onchange=e=>readMappedFile(e.target.files[0],'s');
$('planFile').onchange=e=>readMappedFile(e.target.files[0],'p');

async function readMappedFile(file,type){
  if(!file)return;
  const prefix=type==='s'?'sp':'pp';
  const columns=type==='s'?SC:PC;
  const profile=type==='s'?'raw-stock':'plan-file';
  prog(prefix,5,'Reading workbook...',0,0);

  try{
    const result=await ExcelImport.importMapped(
      file,
      profile,
      columns,
      progress=>prog(prefix,progress,'Reading workbook...',0,0)
    );

    if(type==='s'){
      stock=result.rows;
      sync(false);
      drawStockPreview();
      log(`${result.rows.length} stock rows loaded from ${result.sheetName}`);
    }else{
      plan=result.rows;
      drawPlanPreview();
      log(`${result.rows.length} plan rows loaded from ${result.sheetName}`);
    }

    prog(prefix,100,`Loaded: ${result.sheetName}`,result.rows.length,result.rows.length);
    refresh();
    save();
  }catch(error){
    if(error.message!=='Upload cancelled'){
      console.error(error);
      toast(error.message||'File read nahi hui');
    }
    prog(prefix,0,'Upload failed',0,0);
  }finally{
    if(type==='s')$('stockFile').value='';
    else $('planFile').value='';
  }
}

$('clearStock').onclick=()=>{
  stock=[];
  drawStockPreview();
  refresh();
  toast('Raw cleared');
};

function drawPrev(id,cols,rows,limit=5){
  const table=$(id),thead=table.querySelector('thead'),tbody=table.querySelector('tbody');
  thead.innerHTML='';tbody.innerHTML='';
  const headerRow=document.createElement('tr');
  cols.forEach(column=>{const th=document.createElement('th');th.textContent=column;headerRow.appendChild(th)});
  thead.appendChild(headerRow);
  rows.slice(0,limit).forEach(row=>{
    const tr=document.createElement('tr');
    cols.forEach(column=>{const td=document.createElement('td');const value=row[column]??'';td.textContent=typeof value==='number'?value.toLocaleString('en-IN'):value;tr.appendChild(td)});
    tbody.appendChild(tr);
  });
}
function drawStockPreview(){drawPrev('stockTable',SC,stock,limitValue('stockPreviewLimit'))}
function drawPlanPreview(){drawPrev('planTable',PC,plan,limitValue('planPreviewLimit'))}
$('stockPreviewLimit').onchange=drawStockPreview;
$('planPreviewLimit').onchange=drawPlanPreview;
