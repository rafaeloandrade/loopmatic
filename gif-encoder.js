/* Dependency-free GIF89a encoder. RGB332 palette; bounded 9-bit LZW
   literal runs with clear codes. Deliberately favors compatibility over size. */
class MotionGIF {
 constructor(w,h,delay,loop){this.parts=[];this.w=w;this.h=h;this.delay=Math.max(1,Math.round(delay/10));this.add([...new TextEncoder().encode('GIF89a'),...this.word(w),...this.word(h),247,0,0]);const palette=[];for(let i=0;i<256;i++)palette.push(Math.round((i>>5)*255/7),Math.round(((i>>2)&7)*255/7),Math.round((i&3)*255/3));this.add(palette);if(loop)this.add([33,255,11,...new TextEncoder().encode('NETSCAPE2.0'),3,1,0,0,0]);}
 word(v){return [v&255,v>>8&255]}
 add(a){this.parts.push(new Uint8Array(a))}
 frame(rgba){this.add([33,249,4,4,...this.word(this.delay),0,0,44,0,0,0,0,...this.word(this.w),...this.word(this.h),0,8]);let packed=[],bits=0,count=0,run=0;const code=v=>{bits|=v<<count;count+=9;while(count>=8){packed.push(bits&255);bits>>>=8;count-=8}};code(256);for(let i=0;i<rgba.length;i+=4){if(run===250){code(256);run=0}code((rgba[i]&224)|((rgba[i+1]>>3)&28)|(rgba[i+2]>>6));run++}code(257);if(count)packed.push(bits&255);for(let i=0;i<packed.length;i+=255){const a=packed.slice(i,i+255);this.add([a.length,...a])}this.add([0]);}
 blob(){return new Blob([...this.parts,new Uint8Array([59])],{type:'image/gif'})}

}
