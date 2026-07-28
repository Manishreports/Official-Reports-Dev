$('totalStockBtn').onclick=()=>$('totalStockFile').click();
$('totalStockFile').onchange=async event=>{
  const file=event.target.files[0];
  if(!file)return;
  try{
    const result=await ExcelImport.importAnySheet(file);
    totalStockRows=result.rows;
    totalStockHeaders=result.headers;
    $('totalStockInfo').textContent=`${totalStockRows.length} rows pulled from ${result.sheetName}. Processing logic under development.`;
    drawTotalStock();refresh();toast('Total Stock data loaded');
  }catch(error){
    if(error.message!=='Upload cancelled')toast(error.message||'Total Stock file read nahi hui');
  }finally{
    $('totalStockFile').value='';
  }
};
function drawTotalStock(){drawPrev('totalStockTable',totalStockHeaders,totalStockRows,limitValue('totalStockLimit'))}
$('totalStockLimit').onchange=drawTotalStock;
