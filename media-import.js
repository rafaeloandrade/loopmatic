'use strict';
// Local decoding: no server upload. GIF frames share the project's fixed interval.
async function importMedia(files){
 if(busy)return;
 const list=[...files].filter(f=>isImageFile(f)||f.type.startsWith('video/')||/\.(mov|mp4|webm|m4v)$/i.test(f.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
 if(!list.length)return status('Escolha imagens, GIF ou vídeos MOV, MP4 ou WebM compatíveis.');
 pause();endGesture();lock(true);const abort=new AbortController(),signal=abort.signal,cancel=$('cancelImport');cancel.hidden=false;cancel.disabled=false;cancel.onclick=()=>abort.abort();
 let pixels=frames.reduce((sum,f)=>sum+f.img.naturalWidth*f.img.naturalHeight,0),staged=[],animated=false;
 const check=()=>{if(signal.aborted)throw new DOMException('Importação cancelada.','AbortError');};
 function target(w,h,long){if(!w||!h||w*h>16000000)throw Error('Imagem grande demais para importar (máximo 16 milhões de pixels).');const k=Math.min(1,long/Math.max(w,h));return canvas(Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k)));}
 async function capture(source,out,name){
  check();pixels+=out.width*out.height;if(pixels>96000000)throw Error('O projeto excederia o limite de memória da importação. Reduza a resolução ou use menos quadros.');
  out.getContext('2d').clearRect(0,0,out.width,out.height);out.getContext('2d').drawImage(source,0,0,out.width,out.height);
  const img=new Image();img.src=out.toDataURL('image/png');await img.decode();check();staged.push({img,name,edits:[],history:[]});await yieldUI();
 }
 function progress(file,i,n){$('progress').value=i/n;status(`Importando ${file.name}: ${i} / ${n} quadros…`);}
 function waitVideo(video,event,action){return new Promise((resolve,reject)=>{
  const done=(error)=>{clearTimeout(timeout);video.removeEventListener(event,ok);video.removeEventListener('error',bad);signal.removeEventListener('abort',cancelled);error?reject(error):resolve();};
  const ok=()=>done(),bad=()=>done(new Error('Vídeo não compatível com este navegador. Tente MP4 com H.264 ou WebM.')),cancelled=()=>done(new DOMException('Importação cancelada.','AbortError'));
  const timeout=setTimeout(()=>done(new Error('O vídeo demorou demais para responder. Tente um trecho menor ou outro formato.')),30000);
  video.addEventListener(event,ok,{once:true});video.addEventListener('error',bad,{once:true});signal.addEventListener('abort',cancelled,{once:true});
  if(signal.aborted){cancelled();return;}try{action();}catch(e){done(e);}
 });}
 async function gif(file){
  animated=true;const bytes=new Uint8Array(await file.arrayBuffer());check();const reader=new GifReader(bytes),count=reader.numFrames();
  if(!count||count>300)throw Error('O GIF deve ter entre 1 e 300 quadros. Use uma animação menor.');
  const out=target(reader.width,reader.height,+$('size').value),source=canvas(reader.width,reader.height),context=source.getContext('2d');
  const rgba=new Uint8ClampedArray(reader.width*reader.height*4);let previous=null,restore=null;
  // An opaque GIF uses the logical-screen background; transparent GIFs clear to alpha.
  const transparent=Array.from({length:count},(_,i)=>reader.frameInfo(i)).some(f=>f.transparent_index!==null);
  const bg=(bytes[10]&128)&&!transparent?Array.from(bytes.slice(13+bytes[11]*3,16+bytes[11]*3)).concat(255):[0,0,0,0];
  function clearRect(f){for(let y=f.y;y<f.y+f.height;y++)for(let x=f.x;x<f.x+f.width;x++)rgba.set(bg,(y*reader.width+x)*4);}
  clearRect({x:0,y:0,width:reader.width,height:reader.height});
  for(let i=0;i<count;i++){
   check();const info=reader.frameInfo(i);if(info.x+info.width>reader.width||info.y+info.height>reader.height||!info.width||!info.height)throw Error('Quadro GIF inválido.');
   if(previous?.disposal===2)clearRect(previous);else if(previous?.disposal===3&&restore)rgba.set(restore);
   restore=info.disposal===3?rgba.slice():null;reader.decodeAndBlitFrameRGBA(i,rgba);context.putImageData(new ImageData(rgba,reader.width,reader.height),0,0);
   await capture(source,out,`${file.name} · ${i+1}`);previous=info;progress(file,i+1,count);
  }
 }
 async function video(file){
  animated=true;
  if(/\.mov$/i.test(file.name)||file.type==='video/quicktime'){
   const buffer=await file.arrayBuffer();check();const samples=readPhotoJpegMOV(buffer);
   if(samples){
    for(let i=0;i<samples.length;i++){
     check();const sample=samples[i],img=await imageFrom(new Blob([new Uint8Array(buffer,sample.offset,sample.size)],{type:'image/jpeg'}));
     await capture(img,target(img.naturalWidth,img.naturalHeight,+$('size').value),`${file.name} · ${i+1}`);progress(file,i+1,samples.length);
    }
    return;
   }
  }
  const v=document.createElement('video'),url=URL.createObjectURL(file);v.muted=true;v.playsInline=true;v.preload='auto';v.setAttribute('playsinline','');v.className='import-video';v.setAttribute('aria-hidden','true');document.body.append(v);
  try{
   await waitVideo(v,'loadeddata',()=>{v.src=url;v.load();});check();
   const interval=+$('frameTime').value/1000,duration=v.duration;
   if(!Number.isFinite(duration)||duration<=0)throw Error('Não foi possível identificar a duração do vídeo.');
   const count=Math.ceil(duration/interval);if(count>300)throw Error(`Este vídeo geraria ${count} quadros. Aumente o intervalo ou use um trecho menor (limite: 300).`);
   const out=target(v.videoWidth,v.videoHeight,+$('size').value);
   for(let i=0;i<count;i++){check();const time=Math.min(i*interval,Math.max(0,duration-.001));if(Math.abs(v.currentTime-time)>.0001)await waitVideo(v,'seeked',()=>{v.currentTime=time;});await capture(v,out,`${file.name} · ${i+1}`);progress(file,i+1,count);}
  }finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);}
 }
 try{
  for(const f of list){check();status(`Lendo ${f.name}…`);if(f.size>150*1024*1024)throw Error('Arquivo maior que 150 MB. Use um arquivo menor.');
   if(f.type==='image/gif'||/\.gif$/i.test(f.name))await gif(f);
   else if(f.type.startsWith('video/')||/\.(mov|mp4|webm|m4v)$/i.test(f.name))await video(f);
   else{const img=await imageFrom(f);await capture(img,target(img.naturalWidth,img.naturalHeight,1280),f.name);}
  }
  check();snapshotFilm();const first=frames.length;for(const f of staged){f.seed=nextSeed++;frames.push(f);}currentIndex=first;anchorIndex=first;selectedFrames=new Set([frames[first]]);selectedObject=null;effectPreview=true;resize();film();
  status(`${staged.length} quadro(s) importado(s).${animated?' Reprodução no intervalo atual; áudio não é importado.':''}`);
 }catch(e){status((e.name==='AbortError'?'Importação cancelada.':'Falha na importação: '+e.message)+' Os quadros anteriores foram preservados.');}
 finally{staged=[];cancel.hidden=true;cancel.onclick=null;$('imageUpload').value='';lock(false);render();}
}

// Read self-contained Photo-JPEG sample tables directly, without a video codec.
// This includes MOV files produced by MotionMOV; other codecs use native video.
function readPhotoJpegMOV(buffer){
 const view=new DataView(buffer),length=buffer.byteLength;
 const invalid=()=>{throw Error('Estrutura MOV Photo-JPEG inválida ou incompleta.');};
 const u32=p=>{if(p<0||p+4>length)invalid();return view.getUint32(p);};
 const text=p=>String.fromCharCode(...new Uint8Array(buffer,p,4));
 const u64=p=>{const n=u32(p)*4294967296+u32(p+4);if(!Number.isSafeInteger(n))invalid();return n;};
 function atoms(start,end){
  const out=[];for(let p=start;p<end;){if(p+8>end||out.length>=10000)invalid();let size=u32(p),header=8;const type=text(p+4);
   if(size===1){if(p+16>end)invalid();size=u64(p+8);header=16;}else if(size===0)size=end-p;
   if(size<header||size>end-p)invalid();out.push({type,start:p+header,end:p+size});p+=size;
  }return out;
 }
 const roots=atoms(0,length),moov=roots.find(a=>a.type==='moov'),data=roots.filter(a=>a.type==='mdat');if(!moov)return null;
 const child=(parent,type)=>parent?atoms(parent.start,parent.end).find(a=>a.type===type):null;
 const field=(a,offset)=>{if(!a||a.start+offset+4>a.end)invalid();return u32(a.start+offset);};
 for(const track of atoms(moov.start,moov.end).filter(a=>a.type==='trak')){
  const mdia=child(track,'mdia'),stbl=child(child(mdia,'minf'),'stbl');if(!stbl)continue;
  const stsd=child(stbl,'stsd');if(!stsd||field(stsd,4)!==1)continue;
  const entries=atoms(stsd.start+8,stsd.end);if(entries.length!==1||entries[0].type!=='jpeg')continue;
  const stsz=child(stbl,'stsz'),stsc=child(stbl,'stsc'),stco=child(stbl,'stco')||child(stbl,'co64');
  const fixed=field(stsz,4),count=field(stsz,8);if(!count||count>300)throw Error('O MOV Photo-JPEG deve ter entre 1 e 300 quadros. Use um trecho menor.');
  if(!fixed&&stsz.start+12+count*4>stsz.end)invalid();
  const chunkCount=field(stco,4),mapCount=field(stsc,4),stride=stco.type==='co64'?8:4;
  if(!chunkCount||chunkCount>count||!mapCount||mapCount>chunkCount||stco.start+8+chunkCount*stride>stco.end||stsc.start+8+mapCount*12>stsc.end)invalid();
  const map=[];for(let i=0;i<mapCount;i++){const first=field(stsc,8+i*12),perChunk=field(stsc,12+i*12),description=field(stsc,16+i*12);
   if(first<1||first>chunkCount||(i===0&&first!==1)||(i&&first<=map[i-1].first)||!perChunk||perChunk>count||description!==1)invalid();map.push({first,perChunk});
  }
  let sample=0,mapping=0;const samples=[];
  for(let chunk=1;chunk<=chunkCount;chunk++){
   if(mapping+1<map.length&&chunk>=map[mapping+1].first)mapping++;
   const p=stco.start+8+(chunk-1)*stride;let offset=stride===8?u64(p):u32(p);
   for(let j=0;j<map[mapping].perChunk;j++){
    if(sample>=count)invalid();const size=fixed||field(stsz,12+sample*4);
    if(size<2||!data.some(a=>offset>=a.start&&offset+size<=a.end)||view.getUint16(offset)!==0xffd8)invalid();
    samples.push({offset,size});offset+=size;sample++;
   }
  }
  if(sample!==count)invalid();return samples;
 }
 return null;
}
