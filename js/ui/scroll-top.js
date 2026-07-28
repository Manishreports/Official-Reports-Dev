const scrollTopButton=$('scrollTopButton');
const mainScrollArea=document.querySelector('.main');
function updateScrollTopButton(){
  if(!scrollTopButton||!mainScrollArea)return;
  scrollTopButton.classList.toggle('visible',mainScrollArea.scrollTop>260);
}
if(mainScrollArea&&scrollTopButton){
  mainScrollArea.addEventListener('scroll',updateScrollTopButton,{passive:true});
  scrollTopButton.onclick=()=>mainScrollArea.scrollTo({top:0,behavior:'smooth'});
}
