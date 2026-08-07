$('rBtn').onclick=()=>{
  raipur=[];
  const text=$('rPaste').value.trim();
  if(text){
    text.split(/\r?\n/).forEach((line,index)=>{
      if(!line.trim())return;
      const p=line.split(/\t|,/);
      const plant=N(p[0]);
      const location=N(p[1])||'MAIN';
      const material=N(p[2]);
      const description=N(p[3]);
      const qty=Q(p[4]);
      if(!plant&&!material&&!description&&!qty)return;
      raipur.push({Plant:plant,Location:location,'Material No.':material,Description:description,Qty:qty});
    });
  }
  $('rPaste').value='';
  drawRO('rTable',['Plant','Location','Material No.','Description','Qty'],raipur);
  refresh();
  save();
  toast(raipur.length+' Raipur rows');
};
