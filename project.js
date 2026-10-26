/* Portable, versioned projects. Image bytes are embedded; no external URLs. */
'use strict';
const projectValues=['frameTime','size','format','ink','brush','textSize','imageSize','textContent'];
const projectChecks=['adaptCheckbox','glitchEdits','loopGif'];
async function saveProject(){
 if(busy)return;
 endGesture();const wasPlaying=playing;pause();lock(true);
 try{
  const assets=[],cache=new Map();let pixels=0;
  function asset(img){
   if(cache.has(img))return cache.get(img);
   pixels+=img.naturalWidth*img.naturalHeight;if(pixels>150e6)throw Error('As imagens excedem o limite de 150 milhões de pixels. Reduza a quantidade de imagens.');
   const c=canvas(img.naturalWidth,img.naturalHeight);c.getContext('2d').drawImage(img,0,0);
   const id=assets.length;assets.push(c.toDataURL('image/png'));cache.set(img,id);return id;
  }
  const saved=[];
  for(const f of frames){saved.push({name:f.name,seed:f.seed,effects:f.effects||null,placement:f.placement||null,image:asset(f.img),edits:f.edits.map(e=>e.type==='image'?{type:'image',image:asset(e.img),x:e.x,y:e.y,width:e.width,height:e.height}:{...e})});await yieldUI();}
  const data={type:'loopmatic-project',version:1,assets,frames:saved,globalEffects:{...globalEffects},currentIndex,selection:frames.map((f,i)=>selectedFrames.has(f)?i:-1).filter(i=>i>=0),settings:Object.fromEntries([...projectValues.map(id=>[id,$(id).value]),...projectChecks.map(id=>[id,$(id).checked])])};
  const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
  if(blob.size>250*1024*1024)throw Error('Projeto maior que o limite de 250 MB. Reduza a quantidade de imagens.');
  download(blob,'loopmatic-2.loopmatic');status('Projeto salvo · imagens, efeitos e objetos editáveis incluídos.');
 }catch(e){status('Não foi possível salvar: '+e.message);}
 finally{lock(false);if(wasPlaying)play();else render();}
}
async function decodeProject(data){
 const fail=()=>{throw Error('Arquivo de projeto inválido ou incompleto.');};
 const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;
 const integer=(x,max)=>Number.isInteger(x)&&x>=0&&x<max;
 const effects=x=>{if(!obj(x))fail();const out={};for(const [id,,min,max]of specs){if(!finite(x[id])||x[id]<min||x[id]>max)fail();out[id]=x[id];}return out;};
 if(!obj(data)||data.type!=='loopmatic-project')fail();
 if(data.version!==1)throw Error('Versão de projeto não suportada.');
 if(!Array.isArray(data.assets)||!Array.isArray(data.frames)||data.frames.length>10000||data.assets.length>20000||!obj(data.settings))fail();
 const globals=effects(data.globalEffects),settings={};
 for(const id of projectValues){const value=data.settings[id],el=$(id);if(typeof value!=='string')fail();
  if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===value))fail();
  if(['number','range'].includes(el.type)&&(!value.trim()||!Number.isFinite(+value)||+value<+el.min||+value>+el.max))fail();
  if(id==='ink'&&!/^#[\da-f]{6}$/i.test(value))fail();
  if(id==='textContent'&&value.length>100000)fail();settings[id]=value;
 }
 for(const id of projectChecks){if(typeof data.settings[id]!=='boolean')fail();settings[id]=data.settings[id];}
 const assets=[];let pixels=0;
 for(const src of data.assets){
  if(typeof src!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(src))fail();
  const img=new Image();img.src=src;try{await img.decode();}catch{fail();}
  pixels+=img.naturalWidth*img.naturalHeight;if(!img.naturalWidth||pixels>150e6)throw Error('As imagens excedem o limite de memória para abrir o projeto.');
  assets.push(img);
 }
 const image=i=>{if(!integer(i,assets.length))fail();return assets[i];};
 const restored=data.frames.map(f=>{
  if(!obj(f)||typeof f.name!=='string'||!Number.isSafeInteger(f.seed)||f.seed<0||!Array.isArray(f.edits)||f.edits.length>100000)fail();
  const edits=f.edits.map(e=>{
   if(!obj(e)||!['draw','text','image'].includes(e.type))fail();
   if(e.type!=='image'&&(!/^#[\da-f]{6}$/i.test(e.color)||!finite(e.size)||e.size<=0))fail();
   if(e.type==='draw'){if(!Array.isArray(e.points)||!e.points.length||e.points.length>1000000||e.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(finite)))fail();return {type:'draw',color:e.color,size:e.size,points:e.points.map(p=>p.slice())};}
   if(!finite(e.x)||!finite(e.y))fail();
   if(e.type==='text'){if(typeof e.text!=='string'||e.text.length>100000)fail();return {type:'text',text:e.text,color:e.color,size:e.size,x:e.x,y:e.y};}
   if(!finite(e.width)||!finite(e.height)||e.width<=0||e.height<=0)fail();return {type:'image',img:image(e.image),x:e.x,y:e.y,width:e.width,height:e.height};
  });
  let placement=null;if(f.placement!=null){const p=f.placement;if(!obj(p)||!finite(p.x)||!finite(p.y)||!finite(p.scale)||p.scale<.05||p.scale>20)fail();placement={type:'base',x:p.x,y:p.y,scale:p.scale};}
  return {placement,name:f.name,seed:f.seed,img:image(f.image),effects:f.effects===null?null:effects(f.effects),edits,history:[]};
 });
 if(!integer(data.currentIndex,Math.max(1,restored.length))||!Array.isArray(data.selection)||!data.selection.every(i=>integer(i,restored.length)))fail();
 return {frames:restored,globals,settings,index:data.currentIndex,selection:data.selection};
}
async function openProject(file){
 if(!file||busy)return;
 const wasPlaying=playing;pause();lock(true);let committed=false;
 try{
  if(file.size>250*1024*1024)throw Error('O limite para abrir um projeto é 250 MB.');
  status('Abrindo e validando projeto…');
  const loaded=await decodeProject(JSON.parse(await file.text()));
  if(frames.length&&!window.confirm('Abrir este projeto substituirá o trabalho atual. Salve-o antes se quiser continuar depois. Deseja abrir?')){status('Abertura cancelada. Projeto atual preservado.');return;}
  projectEpoch++;frames=loaded.frames;globalEffects=loaded.globals;currentIndex=loaded.index;anchorIndex=currentIndex;nextSeed=frames.reduce((n,f)=>Math.max(n,f.seed+1),0);frameSeed=0;
  selectedFrames=new Set(loaded.selection.map(i=>frames[i]));filmHistory.length=0;selectedObject=null;objectDrag=null;stroke=null;pendingImage=null;dragFrames=null;resumeAfterFrameScope=false;
  for(const id of projectValues)$(id).value=loaded.settings[id];for(const id of projectChecks)$(id).checked=loaded.settings[id];
  $('effectScope').value='global';$('progress').value=0;$('imageUpload').value='';$('overlayUpload').value='';$('frameTime').oninput();setTool('view');effectPreview=true;resize();film();committed=true;
  status(`Projeto aberto · ${frames.length} quadro(s). Textos e imagens continuam editáveis.`);
 }catch(e){status('Não foi possível abrir o projeto: '+e.message+' O trabalho atual foi preservado.');}
 finally{lock(false);$('projectUpload').value='';if(!committed&&wasPlaying)play();else render();}
}
$('saveProject').onclick=saveProject;
$('openProject').onclick=()=>$('projectUpload').click();
$('projectUpload').onchange=e=>openProject(e.target.files[0]);
