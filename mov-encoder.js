/* Self-contained QuickTime MOV muxer, Photo-JPEG video, one sample per frame.
 * Format reference: https://developer.apple.com/documentation/quicktime-file-format
 * Timescale: milliseconds. All samples are independent/keyframes. No audio.
 */
class MotionMOV {
 constructor(width,height,delay){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>65535||height>65535)throw new Error('Resolução MOV inválida.');
  this.width=width;this.height=height;this.delay=Math.max(1,Math.round(delay));this.samples=[];this.bytes=0;
 }
 addFrame(jpeg){
  if(!(jpeg instanceof Blob)||jpeg.type!=='image/jpeg')throw new Error('O navegador não gerou o quadro JPEG.');
  if(this.bytes+jpeg.size>1024*1024*1024)throw new Error('MOV excedeu 1 GB. Reduza a resolução ou a quantidade de quadros.');
  this.samples.push(jpeg);this.bytes+=jpeg.size;
 }
 blob(){
  if(!this.samples.length)throw new Error('Nenhum quadro para exportar.');
  const u16=n=>new Uint8Array([n>>>8&255,n&255]);
  const u32=n=>new Uint8Array([n>>>24&255,n>>>16&255,n>>>8&255,n&255]);
  const text=s=>new Uint8Array([...s].map(c=>c.charCodeAt(0)));
  const zero=n=>new Uint8Array(n);
  const join=(...parts)=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let offset=0;for(const p of parts){out.set(p,offset);offset+=p.length;}return out;};
  const atom=(type,...parts)=>{const data=join(...parts);return join(u32(data.length+8),text(type),data);};
  const full=(type,flags,...parts)=>atom(type,u32(flags),...parts);
  const matrix=join(u32(65536),u32(0),u32(0),u32(0),u32(65536),u32(0),u32(0),u32(0),u32(1073741824));
  const duration=this.samples.length*this.delay;if(duration>0xffffffff)throw new Error('Duração MOV excedida.');
  const ftyp=atom('ftyp',text('qt  '),u32(0),text('qt  '));
  let position=ftyp.length+8;const offsets=[];for(const sample of this.samples){offsets.push(u32(position));position+=sample.size;}
  const mvhd=full('mvhd',0,u32(0),u32(0),u32(1000),u32(duration),u32(65536),u16(256),zero(10),matrix,zero(24),u32(2));
  const tkhd=full('tkhd',7,u32(0),u32(0),u32(1),u32(0),u32(duration),zero(8),u16(0),u16(0),u16(0),u16(0),matrix,u32(this.width*65536),u32(this.height*65536));
  const mdhd=full('mdhd',0,u32(0),u32(0),u32(1000),u32(duration),u16(0),u16(0));
  const name=text('LOOPMATIC Video');
  const hdlr=full('hdlr',0,text('mhlr'),text('vide'),text('appl'),u32(0),u32(0),new Uint8Array([name.length]),name);
  const compressor=new Uint8Array(32),label=text('Photo - JPEG');compressor[0]=label.length;compressor.set(label,1);
  const sampleEntry=atom('jpeg',zero(6),u16(1),u16(0),u16(0),text('appl'),u32(0),u32(512),u16(this.width),u16(this.height),u32(72*65536),u32(72*65536),u32(0),u16(1),compressor,u16(24),u16(65535));
  const stsd=full('stsd',0,u32(1),sampleEntry);
  const stts=full('stts',0,u32(1),u32(this.samples.length),u32(this.delay));
  const stsc=full('stsc',0,u32(1),u32(1),u32(1),u32(1));
  const stsz=full('stsz',0,u32(0),u32(this.samples.length),...this.samples.map(s=>u32(s.size)));
  const stco=full('stco',0,u32(this.samples.length),...offsets);
  const stbl=atom('stbl',stsd,stts,stsc,stsz,stco);
  const vmhd=full('vmhd',1,u16(0),zero(6));
  const dinf=atom('dinf',full('dref',0,u32(1),full('url ',1)));
  const minf=atom('minf',vmhd,dinf,stbl);
  const moov=atom('moov',mvhd,atom('trak',tkhd,atom('mdia',mdhd,hdlr,minf)));
  return new Blob([ftyp,u32(this.bytes+8),text('mdat'),...this.samples,moov],{type:'video/quicktime'});
 }
}
