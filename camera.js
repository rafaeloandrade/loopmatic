'use strict';
(() => {
 const dialog=$('cameraDialog'),video=$('cameraVideo'),message=$('cameraStatus'),shutter=$('takePhoto'),switcher=$('switchCamera');
 let stream=null,generation=0,facing='environment',devices=[],activeDevice='',capturing=false,mirrored=false;
 function cameraDimensions(){if($('format').value==='original'&&!frames.length){const k=Math.min(1,+$('size').value/Math.max(video.videoWidth,video.videoHeight));return [Math.max(1,Math.round(video.videoWidth*k)),Math.max(1,Math.round(video.videoHeight*k))];}return dimensions();}
 function fitCamera(){if(!video.videoWidth)return;const [w,h]=cameraDimensions();video.style.width=`min(100%, ${55*w/h}dvh)`;video.style.height='auto';video.style.aspectRatio=`${w} / ${h}`;video.style.objectFit=$('adaptCheckbox').checked?'cover':'contain';}
 video.addEventListener('resize',fitCamera);
 function stop(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;mirrored=false;video.style.transform='none';}
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
   const track=media.getVideoTracks()[0],settings=track.getSettings();activeDevice=settings.deviceId||'';
   // Mirror only a confirmed front camera; cycling device IDs can select another rear lens.
   const front=settings.facingMode==='user'||(!settings.facingMode&&/front|frontal|user|facetime/i.test(track.label));
   mirrored=front;facing=front?'user':(settings.facingMode||'environment');video.style.transform=mirrored?'scaleX(-1)':'none';
   try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');}catch{devices=[];}
   if(request!==generation||!dialog.open)return;
   fitCamera();shutter.disabled=false;switcher.disabled=devices.length<2;message.textContent='Câmera pronta. Enquadre e capture.';
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
 switcher.onclick=()=>{if(capturing||devices.length<2)return;const index=devices.findIndex(d=>d.deviceId===activeDevice);start(devices[(index+1)%devices.length].deviceId);};
 shutter.onclick=async()=>{
  if(capturing||!stream||!video.videoWidth||video.readyState<2)return;
  capturing=true;shutter.disabled=true;switcher.disabled=true;const request=generation;
  try{
   const [w,h]=cameraDimensions(),c=canvas(w,h);
   const captureContext=c.getContext('2d');
   if(mirrored){captureContext.translate(c.width,0);captureContext.scale(-1,1);}
   captureContext.fillStyle='#101418';captureContext.fillRect(0,0,c.width,c.height);
   const k=($('adaptCheckbox').checked?Math.max:Math.min)(c.width/video.videoWidth,c.height/video.videoHeight),dw=video.videoWidth*k,dh=video.videoHeight*k;captureContext.drawImage(video,(c.width-dw)/2,(c.height-dh)/2,dw,dh);
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
