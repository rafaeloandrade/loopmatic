/* Pure timeline operations. Selection refers to frame identities, not indices. */
const Timeline={
 cloneEdits(edits){return edits.map(e=>({...e,...(e.points?{points:e.points.map(p=>p.slice())}:{})}));},
 duplicate(frames,selected){const copies=frames.filter(f=>selected.has(f)).map(f=>({...f,effects:f.effects?{...f.effects}:null,edits:this.cloneEdits(f.edits),history:[]}));const at=frames.reduce((last,f,i)=>selected.has(f)?i+1:last,0);return {frames:[...frames.slice(0,at),...copies,...frames.slice(at)],copies};},
 reverse(frames,selected){const reversed=frames.filter(f=>selected.has(f)).reverse();let i=0;return frames.map(f=>selected.has(f)?reversed[i++]:f);},
 moveTo(frames,selected,boundary){const moving=frames.filter(f=>selected.has(f)),left=frames.slice(0,boundary).filter(f=>!selected.has(f)),right=frames.slice(boundary).filter(f=>!selected.has(f));return [...left,...moving,...right];},
 step(frames,selected,d){const out=frames.slice();if(d<0){for(let i=1;i<out.length;i++)if(selected.has(out[i])&&!selected.has(out[i-1]))[out[i-1],out[i]]=[out[i],out[i-1]];}else{for(let i=out.length-2;i>=0;i--)if(selected.has(out[i])&&!selected.has(out[i+1]))[out[i],out[i+1]]=[out[i+1],out[i]];}return out;}
};
