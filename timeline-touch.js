/* Swipe the strip to browse; use a dedicated handle to reorder on touch screens. */
'use strict';
(() => {
 const strip=$('filmstrip');let drag=null,raf=0;
 const clearMarks=()=>strip.querySelectorAll('.touch-moving,.touch-before,.touch-after').forEach(el=>el.classList.remove('touch-moving','touch-before','touch-after'));
 function mark(){
  if(!drag)return;
  clearMarks();const cards=[...strip.querySelectorAll('.frame-card')];
  let boundary=cards.length;
  for(let i=0;i<cards.length;i++){const r=cards[i].getBoundingClientRect();if(drag.x<r.left+r.width/2){boundary=i;break;}}
  drag.boundary=boundary;
  cards.forEach((el,i)=>{if(drag.moving.has(frames[i]))el.classList.add('touch-moving')});
  if(boundary<cards.length)cards[boundary].classList.add('touch-before');else cards.at(-1)?.classList.add('touch-after');
 }
 function scroll(){
  if(!drag)return;
  if(drag.moved){const r=strip.getBoundingClientRect();if(drag.x<r.left+35)strip.scrollLeft-=7;else if(drag.x>r.right-35)strip.scrollLeft+=7;mark();}
  raf=requestAnimationFrame(scroll);
 }
 strip.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('.touch-reorder');if(!handle||e.pointerType==='mouse'||busy||drag)return;
  e.preventDefault();pause();const card=handle.closest('.frame-card'),index=[...strip.children].indexOf(card),f=frames[index];if(!f)return;
  drag={id:e.pointerId,x:e.clientX,startX:e.clientX,startY:e.clientY,moved:false,boundary:index,active:frames[currentIndex],moving:selectedFrames.has(f)?new Set(selectedFrames):new Set([f])};
  strip.setPointerCapture(e.pointerId);raf=requestAnimationFrame(scroll);
 });
 strip.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();drag.x=e.clientX;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;if(drag.moved)mark();});
 function finish(e,cancel=false){
  if(!drag||e.pointerId!==drag.id)return;
  const done=drag;drag=null;cancelAnimationFrame(raf);clearMarks();if(strip.hasPointerCapture(done.id))strip.releasePointerCapture(done.id);
  if(cancel||!done.moved)return;
  const reordered=Timeline.moveTo(frames,done.moving,done.boundary);
  if(reordered.every((f,i)=>f===frames[i]))return;
  const offset=strip.scrollLeft;snapshotFilm();frames=reordered;selectedFrames=done.moving;afterFilm(done.active);strip.scrollLeft=offset;status('Ordem dos quadros atualizada. Use Desfazer para restaurar.');
 }
 strip.addEventListener('pointerup',e=>finish(e));strip.addEventListener('pointercancel',e=>finish(e,true));strip.addEventListener('lostpointercapture',e=>finish(e,true));
 strip.addEventListener('click',e=>{if(e.target.closest('.touch-reorder')){e.preventDefault();e.stopPropagation();}},true);
})();
