// Highlights follow publisher-provided verse regions. Quran paths stay untouched.
const WIDTH=720,HEIGHT=1080,MAX_MARKS=128,MAX_POINTS=512;
const validVerse=value=>typeof value==='string'&&/^[1-9]\d{0,2}:[1-9]\d{0,2}$/.test(value)&&Number(value.split(':')[0])<=114&&Number(value.split(':')[1])<=286;
const validMarks=marks=>Array.isArray(marks)&&marks.length<=MAX_MARKS&&marks.every(mark=>
  mark&&(validVerse(mark.verse)||(Array.isArray(mark.points)&&mark.points.length>0&&mark.points.length<=MAX_POINTS&&mark.points.every(point=>
    Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)&&point[0]>=0&&point[0]<=WIDTH&&point[1]>=0&&point[1]<=HEIGHT))));
export function validPageHighlights(value){
  return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([page,marks])=>
    /^[1-9]\d*$/.test(page)&&Number(page)<=604&&validMarks(marks)));
}

export function mountPageHighlighter({shell,viewport,stage,host,signal,initial=[],save=()=>false,notify=()=>{},canDraw}){
  const toggle=shell.querySelector('[data-ink="toggle"]'),toolbar=shell.querySelector('.ink-toolbar');
  const undo=shell.querySelector('[data-ink="undo"]'),clear=shell.querySelector('[data-ink="clear"]'),status=shell.querySelector('.ink-status');
  const tools=[...shell.querySelectorAll('[data-ink-mode]')],originalLabel=viewport.getAttribute('aria-label'),history=[],down=new Set(),regions=new Map(),legacy=new WeakMap();
  let marks=validMarks(initial)?initial:[],enabled=false,ready=false,mode='mark',draft=null,pointer=null,lastPoint=null,suppressClickUntil=0;
  const svg=name=>document.createElementNS('http://www.w3.org/2000/svg',name),layer=svg('svg'),group=svg('g'),saved=svg('g');
  layer.classList.add('mushaf-ink');layer.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);layer.setAttribute('aria-hidden','true');
  group.append(saved);layer.append(group);stage.append(layer);
  const hint=()=>mode==='erase'?'Ketuk atau seret sorotan untuk menghapus':'Seret ayat untuk menandai';
  function hit(point){
    for(const [key,region] of regions){const b=region.bounds;if(point[0]<b.left||point[0]>b.right||point[1]<b.top||point[1]>b.bottom)continue;
      if(region.node.isPointInFill(new DOMPoint(...point).matrixTransform(region.inverse)))return key;
    }
    return null;
  }
  function walk(from,to,visit){const steps=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/4));for(let i=0;i<=steps;i++)visit([from[0]+(to[0]-from[0])*i/steps,from[1]+(to[1]-from[1])*i/steps]);}
  function selected(){
    const result=new Set();
    if(!ready)return result;
    for(const mark of marks){
      if(mark.verse){if(regions.has(mark.verse))result.add(mark.verse);continue;}
      // Keep old freehand data until the next edit, but display it snapped to
      // the actual verses it crossed. Never extend ink into paper margins.
      if(!legacy.has(mark)){const keys=new Set();let previous=mark.points[0];for(const point of mark.points){walk(previous,point,p=>{const key=hit(p);if(key)keys.add(key);});previous=point;}legacy.set(mark,keys);}
      for(const key of legacy.get(mark))result.add(key);
    }
    return result;
  }
  function render(){
    const selection=draft||selected();saved.replaceChildren(...[...selection].map(key=>{const region=regions.get(key),path=svg('path');path.setAttribute('d',region.node.getAttribute('d'));path.setAttribute('transform','matrix('+['a','b','c','d','e','f'].map(key=>region.transform[key]).join(' ')+')');path.dataset.inkVerse=key;return path;}));
    undo.disabled=!marks.length&&!history.length;clear.disabled=!marks.length;
    for(const button of tools)button.setAttribute('aria-pressed',String(button.dataset.inkMode===mode));
    viewport.classList.toggle('ink-erase',enabled&&mode==='erase');
  }
  function commit(next,message){if(!save(next)){render();return false;}history.push(marks);if(history.length>20)history.shift();marks=next;status.textContent=message;render();return true;}
  function finish(){
    if(!draft)return;
    const previous=selected(),next=draft;draft=null;pointer=null;lastPoint=null;
    if(next.size!==previous.size||[...next].some(key=>!previous.has(key)))commit([...next].map(verse=>({verse})),mode==='erase'?'Sorotan dihapus · bisa diurungkan':'Stabilo tersimpan');
    else render();
  }
  function discard(){draft=null;pointer=null;lastPoint=null;render();}
  function setEnabled(value){finish();enabled=Boolean(value&&ready);if(enabled)mode='mark';down.clear();suppressClickUntil=0;toolbar.hidden=!enabled;viewport.classList.toggle('ink-enabled',enabled);toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label',enabled?'Matikan stabilo':'Aktifkan stabilo');toggle.title=enabled?'Matikan stabilo':'Stabilo';status.textContent=hint();viewport.setAttribute('aria-label',enabled?'Stabilo aktif. Seret ayat untuk menandai. Pilih Penghapus untuk menghapus sorotan. Matikan pensil untuk kembali membaca.':originalLabel);render();}
  function point(e){const r=stage.getBoundingClientRect();return [(e.clientX-r.left)/r.width*WIDTH,(e.clientY-r.top)/r.height*HEIGHT];}
  function append(e){const p=point(e);walk(lastPoint||p,p,sample=>{const key=hit(sample);if(key){if(mode==='erase')draft.delete(key);else if(draft.size<MAX_MARKS)draft.add(key);}});lastPoint=p;}
  const stop=e=>{if(e.type==='click')e.preventDefault();e.stopImmediatePropagation();};
  viewport.addEventListener('pointerdown',e=>{
    if(!enabled||!canDraw()||(e.pointerType==='mouse'&&e.button!==0))return;
    stop(e);down.add(e.pointerId);viewport.setPointerCapture(e.pointerId);
    if(down.size>1){discard();return;}
    pointer=e.pointerId;draft=selected();lastPoint=null;append(e);render();
  },{capture:true,signal});
  viewport.addEventListener('pointermove',e=>{if(!down.has(e.pointerId))return;stop(e);if(pointer!==e.pointerId||!draft)return;const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e])append(sample);render();},{capture:true,signal});
  function end(e){if(!down.has(e.pointerId))return;stop(e);down.delete(e.pointerId);if(pointer===e.pointerId){if(e.type==='pointercancel')discard();else{append(e);finish();}}suppressClickUntil=Date.now()+500;}
  viewport.addEventListener('pointerup',end,{capture:true,signal});viewport.addEventListener('pointercancel',end,{capture:true,signal});
  viewport.addEventListener('click',e=>{if(enabled||Date.now()<suppressClickUntil)stop(e);},{capture:true,signal});
  toggle.addEventListener('click',()=>setEnabled(!enabled),{signal});
  for(const button of tools)button.addEventListener('click',()=>{finish();mode=button.dataset.inkMode;status.textContent=hint();render();},{signal});
  undo.addEventListener('click',()=>{finish();const next=history.at(-1)??marks.slice(0,-1);if(save(next)){marks=next;history.pop();status.textContent='Tindakan terakhir diurungkan';render();}},{signal});
  clear.addEventListener('click',()=>{finish();commit([],'Stabilo halaman ini dihapus · bisa diurungkan');},{signal});
  window.addEventListener('keydown',e=>{if(enabled&&e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();setEnabled(false);toggle.focus();}},{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},{signal});
  signal.addEventListener('abort',()=>{finish();layer.remove();},{once:true});
  toggle.disabled=true;render();
  return {setEnabled,setReady(){
    const inverse=layer.getScreenCTM().inverse();
    for(const node of host.querySelectorAll('.page-ayah')){
      const transform=inverse.multiply(node.getScreenCTM()),b=node.getBBox(),corners=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(p=>new DOMPoint(...p).matrixTransform(transform));
      regions.set(node.dataset.surah+':'+node.dataset.ayah,{node,transform,inverse:transform.inverse(),bounds:{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))}});
    }
    ready=true;toggle.disabled=false;render();
  }};
}
