/* Safari gesture fallback; single-finger scrolling and canvas editing remain available. */
'use strict';
(() => {
 const preventZoom=e=>{if(e.cancelable)e.preventDefault();};
 for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,preventZoom,{passive:false});
 for(const type of ['touchstart','touchmove'])document.addEventListener(type,e=>{
  if(e.touches.length>1)preventZoom(e);
 },{passive:false,capture:true});
})();
