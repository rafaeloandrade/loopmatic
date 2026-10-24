'use strict';
(() => {
 const dialog=$('cameraDialog'),video=$('cameraVideo'),message=$('cameraStatus'),shutter=$('takePhoto'),switcher=$('switchCamera');
 let stream=null,generation=0,facing='environment',devices=[],activeDevice='',capturing=false;
 function stop(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;}
 function close(){generation++;stop();capturing=false;if(dialog.open)dialog.close();lock(false);render();$('captureImage').focus();}
 function errorText(e){
  if(e.name==='NotAllowedError'||e.name==='SecurityError')return 'Acesso à câmera não autorizado. Permita o acesso nas configurações do navegador e abra a câmera novamente.';
  if(e.name==='NotFoundError')return 'Nenhuma câmera encontrada neste dispositivo.';
  if(e.name==='NotReadableError')return 'Não foi possível usar a câmera. Feche outros aplicativos que possam estar usando-a e tente novamente.';
  return 'Não foi possível iniciar a câmera. Feche esta janela e tente novamente.';
 }
 async function start(deviceId){
  const request=++generation;stop();shutter.disabled=true;switcher.disabled=true;message.textContent='Abrindo câmera…';
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{...(deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:facing}}),width:{ideal:1280},height:{ideal:720}}});
   if(request!==generation||!dialog.open){media.getTracks().forEach(t=>t.stop());return;}
   stream=media;video.srcObject=media;await video.play();
   if(request!==generation||!dialog.open)return;
   const track=media.getVideoTracks()[0];activeDevice=track.getSettings().deviceId||'';facing=track.getSettings().facingMode||facing;
   try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');}catch{devices=[];}
   if(request!==generation||!dialog.open)return;
   shutter.disabled=false;switcher.disabled=devices.length<2;message.textContent='Câmera pronta. Enquadre e capture.';
   track.onended=()=>{if(request!==generation||!dialog.open)return;stop();shutter.disabled=true;switcher.disabled=true;message.textContent='A câmera foi desconectada. Feche e abra novamente para reconectar.';};
  }catch(e){if(request!==generation||!dialog.open)return;stop();message.textContent=errorText(e);}
 }
 $('captureImage').onclick=()=>{
  if(busy)return;
  if(!navigator.mediaDevices?.getUserMedia){status('A câmera precisa de um navegador compatível e acesso por HTTPS. Abra o endereço HTTPS do projeto.');return;}
  pause();endGesture();lock(true);dialog.showModal();$('closeCamera').disabled=false;start();
 };
 $('closeCamera').onclick=close;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 switcher.onclick=()=>{if(capturing||devices.length<2)return;const index=devices.findIndex(d=>d.deviceId===activeDevice);facing=facing==='environment'?'user':'environment';start(devices[(index+1)%devices.length].deviceId);};
 shutter.onclick=async()=>{
  if(capturing||!stream||!video.videoWidth||video.readyState<2)return;
  capturing=true;shutter.disabled=true;switcher.disabled=true;const request=generation;
  try{
   const scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight)),c=canvas(Math.max(1,Math.round(video.videoWidth*scale)),Math.max(1,Math.round(video.videoHeight*scale)));
   c.getContext('2d').drawImage(video,0,0,c.width,c.height);
   const img=new Image();img.src=c.toDataURL('image/png');await img.decode();
   if(request!==generation||!dialog.open)return;
   snapshotFilm();const f={img,name:`camera-${new Date().toISOString().replace(/[:.]/g,'-')}.png`,edits:[],history:[],seed:nextSeed++};
   frames.push(f);currentIndex=frames.length-1;anchorIndex=currentIndex;selectedFrames=new Set([f]);selectedObject=null;effectPreview=true;
   $('empty').style.display='none';resize();film();message.textContent=`Quadro ${frames.length} adicionado. Capture outro ou feche para editar.`;status('Captura adicionada ao film strip.');
  }catch{message.textContent='Não foi possível capturar. Tente novamente.';}
  finally{if(request===generation&&dialog.open){capturing=false;shutter.disabled=!stream;switcher.disabled=devices.length<2;}}
 };
 window.addEventListener('pagehide',()=>{if(dialog.open)close();else{generation++;stop();}});
})();
