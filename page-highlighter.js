// Partial highlights live in fixed paper coordinates, clipped to original
// verse regions. The Quran artwork is never edited or re-typeset.
const WIDTH=720,HEIGHT=1080,MAX_MARKS=128,MAX_POINTS=512;
const validVerse=value=>typeof value==='string'&&/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(value)&&Number(value.split(':')[0])<=114&&Number(value.split(':')[1])<=286;
const validSpan=s=>s&&Number.isInteger(s.line)&&s.line>=0&&s.line<30&&Number.isFinite(s.from)&&Number.isFinite(s.to)&&s.from>=0&&s.to<=WIDTH&&s.from<s.to;
const validMarks=marks=>Array.isArray(marks)&&marks.length<=MAX_MARKS&&marks.every(mark=>mark&&(mark.verse!==undefined
  ? validVerse(mark.verse)&&(mark.spans===undefined||(Array.isArray(mark.spans)&&mark.spans.length<=MAX_POINTS&&mark.spans.every(validSpan)))
  : Array.isArray(mark.points)&&mark.points.length>0&&mark.points.length<=MAX_POINTS&&mark.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=WIDTH&&p[1]>=0&&p[1]<=HEIGHT)));
export function validPageHighlights(value){return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([page,marks])=>/^[1-9]\d*$/.test(page)&&Number(page)<=604&&validMarks(marks)));}
export function mergeRanges(ranges,from,to){
  const sorted=[...ranges,[from,to]].sort((a,b)=>a[0]-b[0]),result=[];
  for(const [a,b] of sorted){const last=result.at(-1);if(last&&a<=last[1]+.05)last[1]=Math.max(last[1],b);else result.push([a,b]);}return result;
}
export function subtractRange(ranges,from,to){return ranges.flatMap(([a,b])=>to<=a||from>=b?[[a,b]]:[...(a<from?[[a,from]]:[]),...(b>to?[[to,b]]:[])]);}
const matrixText=m=>'matrix('+['a','b','c','d','e','f'].map(k=>m[k]).join(' ')+')';
const rounded=n=>Math.round(n*100)/100;

// Find the quiet gaps between printed rows. Verse polygons alone can span
// several lines (page 48 is one whole verse), so their height is not a row.
async function printedLines(host,layer,regions,page,signal){
  const boxes=[...regions.values()].map(r=>r.bounds),top=Math.min(...boxes.map(b=>b.top)),bottom=Math.max(...boxes.map(b=>b.bottom));
  const first=regions.values().next().value,scale=Math.hypot(first.transform.c,first.transform.d);
  const count=page===1?7:page===2?6:Math.max(1,Math.min(15,Math.round((bottom-top)/(36.5*scale)))),pitch=(bottom-top)/count;
  const inverse=layer.getScreenCTM().inverse(),root=document.createElementNS('http://www.w3.org/2000/svg','svg');
  root.setAttribute('xmlns','http://www.w3.org/2000/svg');root.setAttribute('width',WIDTH);root.setAttribute('height',HEIGHT);
  const defs=document.createElementNS(root.namespaceURI,'defs'),clip=document.createElementNS(root.namespaceURI,'clipPath'),content=document.createElementNS(root.namespaceURI,'g');
  clip.id='rows';defs.append(clip);content.setAttribute('clip-path','url(#rows)');root.append(defs,content);
  const copy=(node,transform)=>{const path=document.createElementNS(root.namespaceURI,'path');path.setAttribute('d',node.getAttribute('d'));path.setAttribute('transform',matrixText(transform));return path;};
  for(const r of regions.values())clip.append(copy(r.node,r.transform));
  for(const node of host.querySelectorAll('#content path'))content.append(copy(node,inverse.multiply(node.getScreenCTM())));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'})),image=new Image();
  try{
    image.src=url;await image.decode();if(signal.aborted)return [];
    const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
    const pixels=context.getImageData(0,0,WIDTH,HEIGHT).data,weight=new Float64Array(HEIGHT);
    for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++)weight[y]+=pixels[(y*WIDTH+x)*4+3]/255;
    const edges=[top];
    for(let i=1;i<count;i++){
      const expected=top+i*pitch;let best=expected,score=Infinity;
      for(let y=Math.ceil(expected-pitch*.23);y<=Math.floor(expected+pitch*.23);y++){
        const value=(weight[y-1]||0)+(weight[y]||0)+(weight[y+1]||0)+Math.abs(y-expected)*.08;
        if(value<score){score=value;best=y+.5;}
      }
      edges.push(best);
    }
    edges.push(bottom);
    return edges.slice(0,-1).map((start,i)=>({top:rounded(start),bottom:rounded(edges[i+1]),ink:weight.slice(Math.max(0,Math.floor(start)),Math.min(HEIGHT,Math.ceil(edges[i+1]))).reduce((a,b)=>a+b,0)>30}));
  }finally{URL.revokeObjectURL(url);}
}

export function mountPageHighlighter({shell,viewport,stage,host,signal,initial=[],save=()=>false,notify=()=>{},canDraw}){
  const toggle=shell.querySelector('[data-ink="toggle"]'),toolbar=shell.querySelector('.ink-toolbar'),undo=shell.querySelector('[data-ink="undo"]'),clear=shell.querySelector('[data-ink="clear"]'),status=shell.querySelector('.ink-status');
  const tools=[...shell.querySelectorAll('[data-ink-mode]')],originalLabel=viewport.getAttribute('aria-label'),history=[],down=new Set(),regions=new Map();
  let marks=validMarks(initial)?initial:[],enabled=false,ready=false,mode='mark',draft=null,pointer=null,lastPoint=null,suppressClickUntil=0,lines=[],cachedSelection=null;
  const svg=name=>document.createElementNS('http://www.w3.org/2000/svg',name),layer=svg('svg'),defs=svg('defs'),saved=svg('g');
  layer.classList.add('mushaf-ink');layer.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);layer.setAttribute('aria-hidden','true');layer.append(defs,saved);stage.append(layer);
  const hint=()=>mode==='erase'?'Seret bagian sorotan yang ingin dihapus':'Seret bagian teks yang ingin ditandai';
  function hit(point){for(const [key,r] of regions){const b=r.bounds;if(point[0]>=b.left&&point[0]<=b.right&&point[1]>=b.top&&point[1]<=b.bottom&&r.node.isPointInFill(new DOMPoint(...point).matrixTransform(r.inverse)))return key;}return null;}
  const rowAt=y=>lines.findIndex(l=>l.ink&&y>=l.top&&y<=l.bottom);
  function walk(from,to,visit){const steps=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/3));for(let i=0;i<=steps;i++)visit([from[0]+(to[0]-from[0])*i/steps,from[1]+(to[1]-from[1])*i/steps]);}
  function apply(selection,point,erase=false,radius=1.5){
    const key=hit(point),line=rowAt(point[1]);if(!key||line<0)return;
    const rows=selection.get(key)||new Map(),ranges=rows.get(line)||[],from=rounded(Math.max(0,point[0]-radius)),to=rounded(Math.min(WIDTH,point[0]+radius));
    const next=erase?subtractRange(ranges,from,to):mergeRanges(ranges,from,to);
    if(next.length)rows.set(line,next);else rows.delete(line);
    if(rows.size)selection.set(key,rows);else selection.delete(key);
  }
  function selected(){
    if(!ready)return new Map();if(cachedSelection)return cachedSelection;
    const selection=new Map();
    for(const mark of marks){
      if(mark.verse){const region=regions.get(mark.verse);if(!region)continue;const rows=selection.get(mark.verse)||new Map();
        const spans=mark.spans||lines.flatMap((l,line)=>l.ink&&l.bottom>region.bounds.top&&l.top<region.bounds.bottom?[{line,from:region.bounds.left,to:region.bounds.right}]:[]);
        for(const span of spans)if(lines[span.line]?.ink)rows.set(span.line,mergeRanges(rows.get(span.line)||[],span.from,span.to));
        selection.set(mark.verse,rows);
      }else{let previous=mark.points[0];for(const point of mark.points){walk(previous,point,p=>apply(selection,p,false,6));previous=point;}}
    }
    cachedSelection=selection;return selection;
  }
  const clone=selection=>new Map([...selection].map(([key,rows])=>[key,new Map([...rows].map(([line,ranges])=>[line,ranges.map(r=>r.slice())]))]));
  const serialize=selection=>[...selection].sort(([a],[b])=>a.localeCompare(b)).map(([verse,rows])=>({verse,spans:[...rows].sort(([a],[b])=>a-b).flatMap(([line,ranges])=>ranges.map(([from,to])=>({line,from:rounded(from),to:rounded(to)}))).filter(s=>s.from<s.to)})).filter(mark=>mark.spans.length);
  function render(){
    const nodes=[];for(const [key,rows] of draft||selected()){
      const group=svg('g');group.dataset.inkVerse=key;group.setAttribute('clip-path','url(#'+regions.get(key).clipId+')');
      for(const [line,ranges] of rows){const band=lines[line];for(const [from,to] of ranges){const rect=svg('rect');rect.dataset.inkLine=String(line);rect.setAttribute('x',from);rect.setAttribute('y',band.top);rect.setAttribute('width',to-from);rect.setAttribute('height',band.bottom-band.top);group.append(rect);}}
      nodes.push(group);
    }
    saved.replaceChildren(...nodes);undo.disabled=!history.length;clear.disabled=!marks.length;
    for(const button of tools)button.setAttribute('aria-pressed',String(button.dataset.inkMode===mode));viewport.classList.toggle('ink-erase',enabled&&mode==='erase');
  }
  function commit(next,message){if(!validMarks(next)){notify('Terlalu banyak bagian stabilo di halaman ini. Hapus sebagian sebelum menambah lagi.');render();return false;}if(!save(next)){render();return false;}history.push(marks);if(history.length>20)history.shift();marks=next;cachedSelection=null;status.textContent=message;render();return true;}
  function finish(){if(!draft)return;const previous=serialize(selected()),next=serialize(draft);draft=null;pointer=null;lastPoint=null;if(JSON.stringify(next)!==JSON.stringify(previous))commit(next,mode==='erase'?'Bagian sorotan dihapus · bisa diurungkan':'Stabilo tersimpan');else render();}
  function discard(){draft=null;pointer=null;lastPoint=null;render();}
  function setEnabled(value){finish();enabled=Boolean(value&&ready);if(enabled)mode='mark';down.clear();suppressClickUntil=0;toolbar.hidden=!enabled;viewport.classList.toggle('ink-enabled',enabled);toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label',enabled?'Matikan stabilo':'Aktifkan stabilo');toggle.title=enabled?'Matikan stabilo':'Stabilo';status.textContent=hint();viewport.setAttribute('aria-label',enabled?'Stabilo aktif. Seret bagian teks untuk menandai. Pilih Penghapus untuk menghapus sebagian sorotan. Matikan pensil untuk kembali membaca.':originalLabel);render();}
  function point(e){const r=stage.getBoundingClientRect();return [(e.clientX-r.left)/r.width*WIDTH,(e.clientY-r.top)/r.height*HEIGHT];}
  function append(e){const p=point(e);walk(lastPoint||p,p,sample=>apply(draft,sample,mode==='erase',mode==='erase'?9:1.5));lastPoint=p;}
  const stop=e=>{if(e.type==='click')e.preventDefault();e.stopImmediatePropagation();};
  viewport.addEventListener('pointerdown',e=>{if(!enabled||!canDraw()||(e.pointerType==='mouse'&&e.button!==0))return;stop(e);down.add(e.pointerId);viewport.setPointerCapture(e.pointerId);if(down.size>1){discard();return;}pointer=e.pointerId;draft=clone(selected());lastPoint=null;append(e);render();},{capture:true,signal});
  viewport.addEventListener('pointermove',e=>{if(!down.has(e.pointerId))return;stop(e);if(pointer!==e.pointerId||!draft)return;const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e])append(sample);render();},{capture:true,signal});
  function end(e){if(!down.has(e.pointerId))return;stop(e);down.delete(e.pointerId);if(pointer===e.pointerId){if(e.type==='pointercancel')discard();else{append(e);finish();}}suppressClickUntil=Date.now()+500;}
  viewport.addEventListener('pointerup',end,{capture:true,signal});viewport.addEventListener('pointercancel',end,{capture:true,signal});viewport.addEventListener('click',e=>{if(enabled||Date.now()<suppressClickUntil)stop(e);},{capture:true,signal});
  toggle.addEventListener('click',()=>setEnabled(!enabled),{signal});for(const button of tools)button.addEventListener('click',()=>{finish();mode=button.dataset.inkMode;status.textContent=hint();render();},{signal});
  undo.addEventListener('click',()=>{finish();const next=history.at(-1);if(!next)return;if(save(next)){marks=next;cachedSelection=null;history.pop();status.textContent='Tindakan terakhir diurungkan';render();}},{signal});
  clear.addEventListener('click',()=>{finish();commit([],'Stabilo halaman ini dihapus · bisa diurungkan');},{signal});
  window.addEventListener('keydown',e=>{if(enabled&&e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();setEnabled(false);toggle.focus();}},{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},{signal});signal.addEventListener('abort',()=>{finish();layer.remove();},{once:true});
  toggle.disabled=true;render();
  return {setEnabled,async setReady(){
    try{const inverse=layer.getScreenCTM().inverse();let index=0;
      for(const node of host.querySelectorAll('.page-ayah')){const transform=inverse.multiply(node.getScreenCTM()),b=node.getBBox(),corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(p=>new DOMPoint(...p).matrixTransform(transform)),clipId='ink-verse-'+index++;
        regions.set(node.dataset.surah+':'+node.dataset.ayah,{node,transform,inverse:transform.inverse(),clipId,bounds:{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))}});
        const clip=svg('clipPath'),path=svg('path');clip.id=clipId;path.setAttribute('d',node.getAttribute('d'));path.setAttribute('transform',matrixText(transform));clip.append(path);defs.append(clip);
      }
      lines=await printedLines(host,layer,regions,Number(viewport.dataset.page),signal);if(signal.aborted)return;
      ready=true;toggle.disabled=false;layer.dataset.lines=JSON.stringify(lines);render();
    }catch{if(!signal.aborted)notify('Stabilo belum dapat disiapkan. Buka ulang halaman untuk mencoba lagi.');}
  }};
}
