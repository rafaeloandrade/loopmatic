'use strict';
const $=id=>document.getElementById(id), preview=$('preview'),ctx=preview.getContext('2d',{willReadFrequently:true});
const specs=[['pixelate','Pixelate',1,20,1],['rgbSplit','RGB split',0,100,0],['noise','Noise',0,100,0],['shiftX','Shift X',-200,200,0],['shiftY','Shift Y',-200,200,0],['scanlines','Scanlines',0,100,0],['waves','Waves',0,100,0],['blocks','Blocks',0,100,0],['colorDistortion','Distortion',0,100,0],['brightness','Brightness',50,150,100],['saturation','Saturation',50,150,100],['hue','Hue',-180,180,0]];
const controls={};let frames=[],currentIndex=0,frameSeed=0,playing=false,timer=null,tool='view',stroke=null,pendingImage=null,busy=false;
let selectedFrames=new Set(),anchorIndex=0,selectedObject=null,objectDrag=null,dragFrames=null;const filmHistory=[];let nextSeed=0,projectEpoch=0;
const defaultEffects=()=>Object.fromEntries(specs.map(([id,,,,v])=>[id,v]));
let globalEffects=defaultEffects(),effectPreview=false,resumeAfterFrameScope=false;
function effectiveEffects(frame){return frame?.effects||globalEffects;}
function effectTarget(){return $('effectScope').value==='frame'&&frames.length?frames[currentIndex]:null;}
function syncEffectControls(){const frame=effectTarget(),values=frame?effectiveEffects(frame):globalEffects;for(const [id]of specs)controls[id].value=values[id];updateDials();$('inheritEffects').hidden=!frame?.effects;$('effectScopeHint').textContent=frame?`Quadro ${currentIndex+1} · ${frame.effects?'efeitos individuais':'herdando efeitos globais'}`:'Global · quadros com ajustes individuais preservam seus efeitos.';}
function changeEffect(id,value){const frame=effectTarget();if(frame)pause();if($('effectScope').value==='frame'&&!frame)return status('Carregue imagens para editar um quadro isolado.');if(frame){frame.effects={...effectiveEffects(frame),[id]:value};}else globalEffects[id]=value;effectPreview=true;selectedObject=null;render();}

for(const [id,label,min,max,value] of specs){const el=document.createElement('label');el.className='dial-control';el.innerHTML=`<span class="dial"></span>${label}<output>${value}</output><input aria-label="${label}" id="${id}" type="range" min="${min}" max="${max}" value="${value}">`;$('effectsGrid').append(el);controls[id]=$(id);$(id).oninput=()=>changeEffect(id,+$(id).value)}
function updateDials(){for(const [id,,min,max]of specs){const e=controls[id];e.parentElement.style.setProperty('--rotation',`${-135+(+e.value-min)/(max-min)*270}deg`);e.previousElementSibling.textContent=e.value}}updateDials();
function status(s){$('status').textContent=s}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function dimensions(){let ratio=$('format').value==='original'?(frames[0]?.img.width/frames[0]?.img.height||16/9):+$('format').value;let long=+$('size').value;return ratio>=1?[long,Math.max(1,Math.round(long/ratio))]:[Math.max(1,Math.round(long*ratio)),long]}
function resize(){[preview.width,preview.height]=dimensions();$('resolution').textContent=`${preview.width} × ${preview.height}`;render()}
function drawEdits(c,frame,w,h){c.save();c.scale(w,h);for(const edit of frame.edits){c.fillStyle=edit.color||'#fff';c.strokeStyle=edit.color||'#fff';if(edit.type==='draw'){c.lineWidth=edit.size;c.lineCap='round';c.lineJoin='round';c.beginPath();edit.points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(edit.points.length===1)c.lineTo(edit.points[0][0]+.0001,edit.points[0][1]);c.stroke()}else if(edit.type==='text'){c.save();c.scale(1,w/h);c.font=`bold ${edit.size}px sans-serif`;c.fillText(edit.text,edit.x,edit.y*h/w);c.restore()}else if(edit.type==='image'){c.drawImage(edit.img,edit.x,edit.y,edit.width,edit.height)}}c.restore()}
function placement(frame){return frame.placement??={type:'base',x:0,y:0,scale:1};}
function baseBounds(frame,w,h){const p=frame.placement||{x:0,y:0,scale:1},factor=($('adaptCheckbox').checked?Math.max:Math.min)(w/frame.img.width,h/frame.img.height)*p.scale,bw=frame.img.width*factor/w,bh=frame.img.height*factor/h;return {x:(1-bw)/2+p.x,y:(1-bh)/2+p.y,w:bw,h:bh};}
function drawBase(c,frame,w,h){const b=baseBounds(frame,w,h);c.drawImage(frame.img,b.x*w,b.y*h,b.w*w,b.h*h);}
function renderFrame(index,target){const frame=frames[index];if(!frame)return;const c=target.getContext('2d',{willReadFrequently:true}),w=target.width,h=target.height;frameSeed=frame.seed??index;const base=canvas(w,h),bc=base.getContext('2d');bc.fillStyle='#101418';bc.fillRect(0,0,w,h);drawBase(bc,frame,w,h);if($('glitchEdits').checked)drawEdits(bc,frame,w,h);applyEffectsToContext(c,w,h,base,{values:effectiveEffects(frame)});if(!$('glitchEdits').checked)drawEdits(c,frame,w,h)}
function render(){
 syncEffectControls();
 $('empty').style.display=frames.length?'none':'flex';
 if(!frames.length){ctx.clearRect(0,0,preview.width,preview.height);$('counter').textContent='FRAME — / —';$('empty').style.display='flex';updateSelection();return;}
 const editing=tool==='view'&&!playing&&(frames[currentIndex].edits.length>0||selectedObject?.type==='base')&&!busy&&!effectPreview;
 if(editing){ctx.fillStyle='#101418';ctx.fillRect(0,0,preview.width,preview.height);drawBase(ctx,frames[currentIndex],preview.width,preview.height);drawEdits(ctx,frames[currentIndex],preview.width,preview.height);drawSelection();}else renderFrame(currentIndex,preview);
 $('viewMode').textContent=editing?'◇ OBJETOS · SEM EFEITOS':'● LIVE OUTPUT';
 $('counter').textContent=`FRAME ${String(currentIndex+1).padStart(2,'0')} / ${String(frames.length).padStart(2,'0')}`;
 updateSelection();
}
function pause(){playing=false;clearTimeout(timer);$('play').textContent='▶ Reproduzir'}
function tick(){if(!playing)return;currentIndex=(currentIndex+1)%frames.length;render();timer=setTimeout(tick,+$('frameTime').value)}
function play(){if(!frames.length||busy)return;if(playing){resumeAfterFrameScope=false;pause();render();return}setTool('view');playing=true;$('play').textContent='Ⅱ Pausar';render();timer=setTimeout(tick,+$('frameTime').value)}
function select(i,e={}){if(busy||!frames.length)return;pause();selectedObject=null;currentIndex=(i+frames.length)%frames.length;
 if(e.shiftKey){const lo=Math.min(anchorIndex,currentIndex),hi=Math.max(anchorIndex,currentIndex);selectedFrames=new Set(frames.slice(lo,hi+1));}
 else if(e.ctrlKey||e.metaKey){const f=frames[currentIndex];selectedFrames.has(f)?selectedFrames.delete(f):selectedFrames.add(f);anchorIndex=currentIndex;}
 else {selectedFrames=new Set([frames[currentIndex]]);anchorIndex=currentIndex;}render();}
function updateSelection(){document.querySelectorAll('.frame-card').forEach((el,i)=>{if(!frames[i])return;el.classList.toggle('selected',i===currentIndex);el.classList.toggle('marked',selectedFrames.has(frames[i]));el.querySelector('small').textContent=`${String(i+1).padStart(2,'0')} / ${frames[i].effects?'FX':frames[i].edits.length?'EDIT':'RAW'}`;el.querySelector('input').checked=selectedFrames.has(frames[i]);el.querySelector('.frame-thumb').setAttribute('aria-pressed',i===currentIndex);});$('selectionCount').textContent=`${selectedFrames.size} selecionado(s)`;}
function snapshotFilm(){filmHistory.push({frames:frames.slice(),active:frames[currentIndex],selection:new Set(selectedFrames)});if(filmHistory.length>30)filmHistory.shift();}
function afterFilm(active){pause();selectedObject=null;currentIndex=Math.max(0,frames.indexOf(active));selectedFrames=new Set([...selectedFrames].filter(f=>frames.includes(f)));if(!selectedFrames.size&&frames.length)selectedFrames.add(frames[currentIndex]);anchorIndex=currentIndex;$('empty').style.display=frames.length?'none':'flex';film();}
function removeFrames(list){if(busy||!list.length)return;snapshotFilm();const active=frames[currentIndex],oldIndex=currentIndex;frames=frames.filter(f=>!list.includes(f));afterFilm(frames.includes(active)?active:frames[Math.min(oldIndex,frames.length-1)]);status(`${list.length} quadro(s) excluído(s). Use Desfazer para restaurar.`);}
function film(){const strip=$('filmstrip');strip.replaceChildren();frames.forEach((f,i)=>{
 const card=document.createElement('div');card.className='frame-card';card.draggable=true;
 const b=document.createElement('button'),im=document.createElement('img'),s=document.createElement('small');b.className='frame-thumb';im.src=f.img.src;im.alt=f.name;im.draggable=false;s.textContent=`${String(i+1).padStart(2,'0')} / ${f.edits.length?'EDIT':'RAW'}`;b.title=f.name;b.append(im,s);b.onclick=e=>select(i,e);
 const row=document.createElement('div');row.className='frame-tools';const check=document.createElement('input');check.type='checkbox';check.setAttribute('aria-label',`Selecionar quadro ${i+1}`);check.onchange=()=>{pause();check.checked?selectedFrames.add(f):selectedFrames.delete(f);updateSelection()};
 const del=document.createElement('button');del.className='trash';del.title=`Excluir quadro ${i+1}`;del.setAttribute('aria-label',del.title);del.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 9v9M14 9v9" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';del.onclick=()=>removeFrames([f]);const handle=document.createElement('button');handle.className='touch-reorder';handle.type='button';handle.textContent='↔';handle.title='Arraste para reordenar';handle.setAttribute('aria-label',`Arrastar quadro ${i+1} para reordenar`);row.append(check,handle,del);card.append(b,row);
 card.ondragstart=e=>{if(busy){e.preventDefault();return}pause();dragFrames=selectedFrames.has(f)?frames.filter(x=>selectedFrames.has(x)):[f];e.dataTransfer.setData('text/plain','motion-frames');e.dataTransfer.effectAllowed='move';};
 card.ondragover=e=>{if(!dragFrames)return;e.preventDefault();e.stopPropagation();card.classList.add('drop-target')};card.ondragleave=()=>card.classList.remove('drop-target');
 card.ondrop=e=>{if(!dragFrames)return;e.preventDefault();e.stopPropagation();const rect=card.getBoundingClientRect(),boundary=i+(e.clientX>rect.left+rect.width/2?1:0),active=frames[currentIndex];snapshotFilm();frames=Timeline.moveTo(frames,new Set(dragFrames),boundary);selectedFrames=new Set(dragFrames);dragFrames=null;afterFilm(active);};card.ondragend=()=>{dragFrames=null;document.querySelectorAll('.drop-target').forEach(x=>x.classList.remove('drop-target'))};strip.append(card);
 });if(!frames.length){const p=document.createElement('p');p.textContent='Arraste imagens aqui para iniciar uma sequência.';strip.append(p)}render();}
$('selectAll').onclick=()=>{selectedFrames=selectedFrames.size===frames.length?new Set():new Set(frames);updateSelection()};
$('deleteFrames').onclick=()=>removeFrames([...selectedFrames]);
$('duplicateFrames').onclick=()=>{if(!selectedFrames.size)return;snapshotFilm();const result=Timeline.duplicate(frames,selectedFrames);frames=result.frames;selectedFrames=new Set(result.copies);afterFilm(result.copies[0]);status(`${result.copies.length} quadro(s) duplicado(s), com intervenções independentes.`)};
$('reverseFrames').onclick=()=>{if(selectedFrames.size<2)return status('Selecione pelo menos dois quadros para inverter a ordem.');snapshotFilm();const active=frames[currentIndex];frames=Timeline.reverse(frames,selectedFrames);afterFilm(active)};
for(const [id,d]of [['moveLeft',-1],['moveRight',1]])$(id).onclick=()=>{if(!selectedFrames.size)return;snapshotFilm();const active=frames[currentIndex];frames=Timeline.step(frames,selectedFrames,d);afterFilm(active)};
$('undoFilm').onclick=()=>{const h=filmHistory.pop();if(!h)return;frames=h.frames;selectedFrames=h.selection;afterFilm(h.active)};
async function imageFrom(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Imagem inválida: '+file.name))};img.src=url})}
function isImageFile(f){return f.type.startsWith('image/')||/\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(f.name||'');}
async function load(files){return importMedia(files);}

function newProject(){
 if(busy)return;
 if(frames.length&&!window.confirm('Criar um novo projeto? Os quadros e as edições atuais serão descartados.'))return;
 pause();resumeAfterFrameScope=false;globalEffects=defaultEffects();effectPreview=false;$('effectScope').value='global';projectEpoch++;frames=[];currentIndex=0;frameSeed=0;nextSeed=0;selectedFrames.clear();anchorIndex=0;selectedObject=null;objectDrag=null;stroke=null;pendingImage=null;dragFrames=null;filmHistory.length=0;
 for(const [id,,,,v]of specs)controls[id].value=v;
 for(const [id,value]of [['frameTime','200'],['size','640'],['format','original'],['ink','#f0b75e'],['brush','6'],['textSize','40'],['imageSize','40'],['textContent',''],['imageUpload',''],['overlayUpload','']])$(id).value=value;
 $('adaptCheckbox').checked=true;$('glitchEdits').checked=true;$('loopGif').checked=true;$('progress').value=0;$('viewMode').textContent='● LIVE OUTPUT';$('frameTime').oninput();updateDials();setTool('view');resize();film();status('Novo projeto pronto. Arraste suas imagens para começar.');
}
$('newProject').onclick=newProject;
let fileDragDepth=0;
function hasFiles(e){return Array.from(e.dataTransfer?.types||[]).includes('Files');}
function clearFileDrag(){fileDragDepth=0;document.body.classList.remove('file-drop-active');}
document.addEventListener('dragenter',e=>{if(!hasFiles(e))return;e.preventDefault();fileDragDepth++;if(!busy)document.body.classList.add('file-drop-active');},true);
document.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy';},true);
document.addEventListener('dragleave',e=>{if(!hasFiles(e))return;fileDragDepth=Math.max(0,fileDragDepth-1);if(!fileDragDepth)clearFileDrag();},true);
document.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();e.stopPropagation();clearFileDrag();if(!busy)load(e.dataTransfer.files);},true);
window.addEventListener('blur',clearFileDrag);window.addEventListener('dragend',clearFileDrag);
$('upload').onclick=$('loadEmpty').onclick=()=>$('imageUpload').click();$('imageUpload').onchange=e=>load(e.target.files);
$('filmstrip').ondragover=e=>e.preventDefault();$('filmstrip').ondrop=e=>{e.preventDefault();if(dragFrames){const active=frames[currentIndex];snapshotFilm();frames=Timeline.moveTo(frames,new Set(dragFrames),frames.length);selectedFrames=new Set(dragFrames);dragFrames=null;afterFilm(active)}else load(e.dataTransfer.files)};
$('play').onclick=play;$('prev').onclick=()=>frames.length&&select(currentIndex-1);$('next').onclick=()=>frames.length&&select(currentIndex+1);
$('frameTime').oninput=()=>{$('frameTimeValue').textContent=$('frameTime').value+' ms';$('fps').textContent=(1000/+$('frameTime').value).toFixed(1)+' FPS'};
for(const id of ['size','format'])$(id).onchange=resize;for(const id of ['adaptCheckbox','glitchEdits'])$(id).onchange=render;
$('effectScope').onchange=()=>{
 selectedObject=null;effectPreview=true;
 if($('effectScope').value==='frame'){resumeAfterFrameScope=playing;pause();render();}
 else{const resume=resumeAfterFrameScope;resumeAfterFrameScope=false;if(resume&&!playing)play();else render();}
};
$('inheritEffects').onclick=()=>{const frame=effectTarget();if(!frame)return;pause();frame.effects=null;effectPreview=true;render()};
$('reset').onclick=()=>{const frame=effectTarget();if(frame)pause();if($('effectScope').value==='frame'&&!frame)return;if(frame)frame.effects=defaultEffects();else globalEffects=defaultEffects();effectPreview=true;selectedObject=null;render()};
function setTool(t){effectPreview=false;tool=t;pause();document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));preview.style.cursor=t==='view'?'default':'crosshair';$('toolHint').textContent=t==='draw'?'Arraste sobre o quadro para desenhar.':t==='text'?'Escreva no campo acima e clique no quadro para inserir o texto.':t==='image'?'Clique no quadro para posicionar a imagem. Ajuste o tamanho antes de clicar.':'Seta: arraste o conteúdo para mover e os cantos para redimensionar. Clique fora dos textos e imagens adicionados para selecionar a imagem principal. Edição sem efeitos; reprodução e exportação com efeitos.';selectedObject=null;render()}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
function position(e){const r=preview.getBoundingClientRect();return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))]}
const number=(id,min,max)=>Math.min(max,Math.max(min,Number($(id).value)||min));
function rememberEdits(){const f=frames[currentIndex];f.history??=[];f.history.push({edits:Timeline.cloneEdits(f.edits),placement:f.placement?{...f.placement}:null});if(f.history.length>40)f.history.shift();}
function objectBounds(edit){if(edit.type==='base')return baseBounds(frames[currentIndex],preview.width,preview.height);if(edit.type==='image')return {x:edit.x,y:edit.y,w:edit.width,h:edit.height};if(edit.type!=='text')return null;ctx.save();ctx.font=`bold ${edit.size*preview.width}px sans-serif`;const m=ctx.measureText(edit.text);ctx.restore();const ascent=m.actualBoundingBoxAscent||edit.size*preview.width*.8,descent=m.actualBoundingBoxDescent||edit.size*preview.width*.2;return {x:edit.x,y:edit.y-ascent/preview.height,w:m.width/preview.width,h:(ascent+descent)/preview.height};}
function hitObject(x,y){return [...frames[currentIndex].edits].reverse().find(edit=>{const b=objectBounds(edit);return b&&x>=b.x-.008&&x<=b.x+b.w+.008&&y>=b.y-.008&&y<=b.y+b.h+.008})||placement(frames[currentIndex]);}
function imageHandles(edit){if(!edit||!['image','text','base'].includes(edit.type))return [];const b={...objectBounds(edit)};if(edit.type==='base'){const x=Math.max(.02,Math.min(.94,b.x)),y=Math.max(.02,Math.min(.94,b.y));b.w=Math.max(.04,Math.min(.98,b.x+b.w)-x);b.h=Math.max(.04,Math.min(.98,b.y+b.h)-y);b.x=x;b.y=y;}return [{corner:'nw',x:b.x,y:b.y},{corner:'ne',x:b.x+b.w,y:b.y},{corner:'sw',x:b.x,y:b.y+b.h},{corner:'se',x:b.x+b.w,y:b.y+b.h}];}
function hitHandle(x,y){const r=preview.getBoundingClientRect();return imageHandles(selectedObject).find(h=>Math.abs(x-h.x)<=10/r.width&&Math.abs(y-h.y)<=10/r.height);}
function drawSelection(){if(!selectedObject||(selectedObject.type!=='base'&&!frames[currentIndex].edits.includes(selectedObject)))return;const b=objectBounds(selectedObject);if(!b)return;const r=preview.getBoundingClientRect(),sx=8*preview.width/r.width,sy=8*preview.height/r.height;ctx.save();ctx.strokeStyle='#f0b75e';ctx.lineWidth=1.5;ctx.setLineDash([5,3]);ctx.strokeRect(b.x*preview.width,b.y*preview.height,b.w*preview.width,b.h*preview.height);ctx.setLineDash([]);ctx.fillStyle='#f0b75e';for(const h of imageHandles(selectedObject)){ctx.fillRect(h.x*preview.width-sx/2,h.y*preview.height-sy/2,sx,sy);}ctx.restore();}
function resizeObject(drag,x,y){
 const o=drag.original,b=drag.bounds,c=drag.corner,right=c.endsWith('e'),bottom=c.startsWith('s');
 const ax=right?b.x:b.x+b.w,ay=bottom?b.y:b.y+b.h;
 if(o.type==='base'){x=(right?b.x+b.w:b.x)+(x-drag.x);y=(bottom?b.y+b.h:b.y)+(y-drag.y);}
 const dx=(x-ax)*(right?1:-1),dy=(y-ay)*(bottom?1:-1),w=preview.width,h=preview.height;
 let scale=(dx*b.w*w*w+dy*b.h*h*h)/(b.w*b.w*w*w+b.h*b.h*h*h);
 if(o.type==='base'){
  scale=Math.max(.05/o.scale,Math.min(20/o.scale,scale));drag.object.scale=o.scale*scale;
  const bw=b.w*scale,bh=b.h*scale;drag.object.x=(right?ax:ax-bw)-(1-bw)/2;drag.object.y=(bottom?ay:ay-bh)-(1-bh)/2;
 }else if(o.type==='text'){
  scale=Math.max(8/(o.size*w),Math.min(2048/(o.size*w),scale));
  drag.object.size=o.size*scale;
  const resized=objectBounds(drag.object),baseline=drag.object.y-resized.y;
  drag.object.x=right?ax:ax-resized.w;
  drag.object.y=(bottom?ay:ay-resized.h)+baseline;
 }else{
  scale=Math.max(Math.max(10/(b.w*w),10/(b.h*h)),Math.min(20,scale));
  const width=o.width*scale,height=o.height*scale;
  Object.assign(drag.object,{width,height,x:right?ax:ax-width,y:bottom?ay:ay-height});
 }
}
preview.onpointerdown=e=>{if(!frames.length||busy)return;pause();const [x,y]=position(e),f=frames[currentIndex];if(tool==='view'){effectPreview=false;const handle=hitHandle(x,y);if(!handle)selectedObject=hitObject(x,y);if(selectedObject){rememberEdits();objectDrag={object:selectedObject,x,y,originX:selectedObject.x,originY:selectedObject.y,original:{...selectedObject},bounds:objectBounds(selectedObject),corner:handle?.corner};preview.setPointerCapture(e.pointerId);}render();return;}
 if(tool==='draw'){rememberEdits();stroke={type:'draw',color:$('ink').value,size:number('brush',1,80)/preview.width,points:[[x,y]]};f.edits.push(stroke);preview.setPointerCapture(e.pointerId)}
 else if(tool==='text'&&$('textContent').value.trim()){rememberEdits();f.edits.push({type:'text',text:$('textContent').value,color:$('ink').value,size:number('textSize',8,200)/preview.width,x,y})}
 else if(tool==='image'&&pendingImage){rememberEdits();const width=number('imageSize',5,100)/100,height=width*preview.width/preview.height*pendingImage.height/pendingImage.width;f.edits.push({type:'image',img:pendingImage,width,height,x:x-width/2,y:y-height/2})}render();if(tool!=='draw')film();};
preview.onpointermove=e=>{const [x,y]=position(e);if(objectDrag){if(objectDrag.corner)resizeObject(objectDrag,x,y);else{objectDrag.object.x=objectDrag.originX+x-objectDrag.x;objectDrag.object.y=objectDrag.originY+y-objectDrag.y;}render()}else if(stroke){stroke.points.push([x,y]);render()}else if(tool==='view'&&frames.length){const handle=hitHandle(x,y);preview.style.cursor=handle?(handle.corner==='nw'||handle.corner==='se'?'nwse-resize':'nesw-resize'):hitObject(x,y)?'move':'default'}};
function endGesture(e){if(stroke||objectDrag){if(objectDrag&&objectDrag.object.x===objectDrag.originX&&objectDrag.object.y===objectDrag.originY&&objectDrag.object.width===objectDrag.original.width&&objectDrag.object.height===objectDrag.original.height&&objectDrag.object.size===objectDrag.original.size&&objectDrag.object.scale===objectDrag.original.scale)frames[currentIndex].history.pop();stroke=null;objectDrag=null;if(e&&preview.hasPointerCapture(e.pointerId))preview.releasePointerCapture(e.pointerId);film();}}
preview.onpointerup=endGesture;preview.onpointercancel=endGesture;
$('undo').onclick=()=>{if(!frames.length)return;pause();const f=frames[currentIndex],old=f.history?.pop();if(old){f.edits=Array.isArray(old)?old:old.edits;if(!Array.isArray(old))f.placement=old.placement;}selectedObject=null;film()};
function deleteObject(){if(!frames.length||!selectedObject)return;if(selectedObject.type==='base')return status('Para excluir a imagem principal, exclua o quadro no film strip.');rememberEdits();const f=frames[currentIndex];f.edits=f.edits.filter(e=>e!==selectedObject);selectedObject=null;film()}
$('deleteObject').onclick=deleteObject;
async function overlay(file){if(!file||busy)return;try{const epoch=projectEpoch,img=await imageFrom(file);if(epoch!==projectEpoch)return;pendingImage=img;setTool('image');status('Imagem pronta. Clique no quadro para posicionar.')}catch(e){status(e.message)}}
$('pasteImage').onclick=()=>$('overlayUpload').click();$('overlayUpload').onchange=e=>{overlay(e.target.files[0]);e.target.value=''};
document.addEventListener('paste',e=>{if(busy||/INPUT|TEXTAREA/.test(e.target.tagName))return;const item=[...e.clipboardData.items].find(x=>x.type.startsWith('image/'));if(item){e.preventDefault();overlay(item.getAsFile())}});
document.addEventListener('keydown',e=>{if(busy||/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName))return;if(e.key.toLowerCase()==='v'){setTool('view');return}if((e.key==='Delete'||e.key==='Backspace')&&selectedObject){e.preventDefault();deleteObject();return}if(e.code==='Space'){e.preventDefault();play()}if(frames.length&&e.key==='ArrowLeft')select(currentIndex-1);if(frames.length&&e.key==='ArrowRight')select(currentIndex+1)});

function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function lock(v){busy=v;document.body.classList.toggle('busy',v);document.querySelectorAll('button,input,select').forEach(e=>e.disabled=v)}
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
$('saveFrame').onclick=()=>{if(!frames.length)return status('Carregue imagens primeiro.');pause();const output=canvas(preview.width,preview.height);renderFrame(currentIndex,output);output.toBlob(b=>{if(b){download(b,`loopmatic-2-frame-${String(currentIndex+1).padStart(3,'0')}.png`);status('Quadro PNG exportado.')}})};
$('downloadGIF').onclick=async()=>{if(!frames.length)return status('Carregue imagens primeiro.');pause();lock(true);try{const out=canvas(preview.width,preview.height),gif=new MotionGIF(out.width,out.height,+$('frameTime').value,$('loopGif').checked);for(let i=0;i<frames.length;i++){renderFrame(i,out);gif.frame(out.getContext('2d').getImageData(0,0,out.width,out.height).data);$('progress').value=(i+1)/frames.length;status(`Codificando GIF: ${i+1} / ${frames.length}`);await yieldUI()}download(gif.blob(),'loopmatic-2.gif');status('GIF exportado. Paleta de 256 cores.')}catch(e){status('Falha ao exportar GIF: '+e.message)}finally{lock(false)}};
$('downloadWebM').onclick=async()=>{if(!frames.length)return status('Carregue imagens primeiro.');if(!window.MediaRecorder||!preview.captureStream)return status('WebM indisponível neste navegador. Use GIF ou PNG.');const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime)return status('Este navegador não grava WebM. Use GIF ou PNG.');pause();lock(true);let stream;try{const out=canvas(preview.width,preview.height);renderFrame(0,out);stream=out.captureStream(30);const rec=new MediaRecorder(stream,{mimeType:mime}),parts=[];const done=new Promise((resolve,reject)=>{rec.ondataavailable=e=>{if(e.data.size)parts.push(e.data)};rec.onstop=resolve;rec.onerror=e=>reject(e.error||new Error('Falha na gravação'))});rec.start();for(let i=0;i<frames.length;i++){renderFrame(i,out);$('progress').value=(i+1)/frames.length;status(`Gravando WebM: ${i+1} / ${frames.length} — mantenha esta aba ativa.`);await new Promise(r=>setTimeout(r,+$('frameTime').value))}rec.stop();await done;download(new Blob(parts,{type:mime}),'loopmatic-2.webm');status('WebM exportado.')}catch(e){status('Falha no WebM: '+e.message)}finally{stream?.getTracks().forEach(t=>t.stop());lock(false)}};

$('downloadMOV').onclick=async()=>{
 if(busy)return;if(!frames.length)return status('Carregue imagens primeiro.');
 pause();lock(true);$('progress').value=0;
 try{
  const out=canvas(preview.width,preview.height),mov=new MotionMOV(out.width,out.height,+$('frameTime').value);
  for(let i=0;i<frames.length;i++){
   renderFrame(i,out);
   const jpeg=await new Promise((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível codificar o quadro.')),'image/jpeg',0.95));
   mov.addFrame(jpeg);$('progress').value=(i+1)/frames.length;
   status(`Codificando MOV: ${i+1} / ${frames.length}`);await yieldUI();
  }
  download(mov.blob(),'loopmatic-2.mov');status('MOV exportado · Photo-JPEG de alta qualidade.');
 }catch(e){status('Falha ao exportar MOV: '+e.message);}
 finally{lock(false);render();}
};

/* Fullscreen is bundled here to avoid an optional script dependency. */
'use strict';
(() => {
 const fullscreenStyles=document.createElement('style');fullscreenStyles.textContent='.fullscreen-controls{display:none}\nbody.expanded-view{overflow:hidden}\n#screen.expanded-screen{position:fixed;inset:0;z-index:2000;width:100%;height:100vh;height:100dvh;min-height:0;border:0;border-radius:0;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));background:#090c0b}\n#screen.expanded-screen .fullscreen-controls{display:flex;justify-content:flex-end;gap:8px;flex-shrink:0;width:100%;z-index:3;margin-bottom:6px}\n#screen.expanded-screen .fullscreen-controls button{min-height:40px;padding:9px 12px;font-size:12px}\n#screen.expanded-screen canvas{flex-shrink:1;min-height:0;width:auto;height:auto;max-width:100%;max-height:calc(100dvh - 140px);object-fit:contain}\n#screen.expanded-screen .screen-info,#screen.expanded-screen .screen-bottom{flex-shrink:0}\n#screen.expanded-screen #empty{top:90px;bottom:40px}\n';document.head.append(fullscreenStyles);
 const screen=$('screen'),exit=$('exitFullscreen'),toggle=$('fullscreen');let marker=null,scrollYBefore=0,nativeActive=false,entering=false,inert=[];
 function restore(){
  if(!marker)return;screen.classList.remove('expanded-screen');document.body.classList.remove('expanded-view');marker.replaceWith(screen);marker=null;
  for(const [el,value]of inert)el.inert=value;inert=[];nativeActive=false;toggle.textContent='⛶ Tela cheia';window.scrollTo(0,scrollYBefore);toggle.focus({preventScroll:true});
 }
 async function leave(){
  if(document.fullscreenElement===screen){try{await document.exitFullscreen();}catch{status('Use a opção de sair da tela cheia do navegador.');return;}}
  restore();
 }
 toggle.onclick=async()=>{
  if(marker)return leave();if(entering)return;entering=true;scrollYBefore=window.scrollY;marker=document.createComment('screen-position');screen.before(marker);document.body.append(screen);
  screen.classList.add('expanded-screen');document.body.classList.add('expanded-view');toggle.textContent='✕ Sair da tela cheia';$('fullscreenPlay').textContent=playing?'Ⅱ Pausar':'▶ Reproduzir';
  inert=[...document.body.children].filter(el=>el!==screen).map(el=>[el,el.inert]);for(const [el]of inert)el.inert=true;exit.focus();
  try{if(screen.requestFullscreen&&document.fullscreenEnabled){await screen.requestFullscreen();nativeActive=document.fullscreenElement===screen;if(!marker&&nativeActive)await document.exitFullscreen();}}catch{/* Fixed viewport fallback stays usable on iPhone and denied requests. */}finally{entering=false;}
 };
 exit.onclick=leave;$('fullscreenPlay').onclick=()=>{play();$('fullscreenPlay').textContent=playing?'Ⅱ Pausar':'▶ Reproduzir';};
 document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===screen)nativeActive=true;else if(nativeActive)restore();});
 document.addEventListener('keydown',e=>{if(marker&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();leave();}if(marker&&e.key==='Tab'){e.preventDefault();(document.activeElement===exit?$('fullscreenPlay'):exit).focus();}},true);
})();

$('resetPlacement').onclick=()=>{if(!frames.length||busy)return;pause();rememberEdits();frames[currentIndex].placement=null;selectedObject=null;effectPreview=true;render();status('Enquadramento do quadro restaurado.');};
