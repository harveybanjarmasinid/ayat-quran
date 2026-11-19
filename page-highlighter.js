// User-drawn ink is a separate layer in fixed paper coordinates.
// Quran artwork, verse outlines, and text are never edited.
const WIDTH=720,HEIGHT=1080,MAX_STROKES=128,MAX_POINTS=512;
const validStrokes=strokes=>Array.isArray(strokes)&&strokes.length<=MAX_STROKES&&strokes.every(s=>
  s&&Array.isArray(s.points)&&s.points.length>0&&s.points.length<=MAX_POINTS&&s.points.every(p=>
    Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=0&&p[0]<=WIDTH&&p[1]>=0&&p[1]<=HEIGHT));
export function validPageHighlights(value){
  return Boolean(value&&typeof value==='object'&&!Array.isArray(value)&&Object.entries(value).every(([page,strokes])=>
    /^[1-9]\d*$/.test(page)&&Number(page)<=604&&validStrokes(strokes)));
}

export function mountPageHighlighter({shell,viewport,stage,host,signal,initial=[],save=()=>false,notify=()=>{},canDraw}){
  const toggle=shell.querySelector('[data-ink="toggle"]'),toolbar=shell.querySelector('.ink-toolbar');
  const undo=shell.querySelector('[data-ink="undo"]'),clear=shell.querySelector('[data-ink="clear"]'),status=shell.querySelector('.ink-status');
  const originalLabel=viewport.getAttribute('aria-label'),history=[],down=new Set();
  let strokes=validStrokes(initial)?initial:[],enabled=false,ready=false,draft=null,pointer=null,suppressClickUntil=0;
  const svg=name=>document.createElementNS('http://www.w3.org/2000/svg',name),layer=svg('svg'),defs=svg('defs'),clip=svg('clipPath'),rect=svg('rect'),group=svg('g'),preview=svg('path'),saved=svg('g');
  layer.classList.add('mushaf-ink');layer.setAttribute('viewBox',`0 0 ${WIDTH} ${HEIGHT}`);layer.setAttribute('aria-hidden','true');
  clip.id='mushaf-ink-clip';clip.append(rect);defs.append(clip);group.setAttribute('clip-path','url(#mushaf-ink-clip)');group.append(saved,preview);layer.append(defs,group);stage.append(layer);
  const pathData=stroke=>stroke.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ')+(stroke.points.length===1?' l.01 0':'');
  const drawPreview=()=>{preview.style.display=draft?'':'none';if(draft)preview.setAttribute('d',pathData(draft));};
  function render(){saved.replaceChildren(...strokes.map(stroke=>{const p=svg('path');p.setAttribute('d',pathData(stroke));return p;}));undo.disabled=!strokes.length&&!history.length;clear.disabled=!strokes.length;drawPreview();}
  function commit(next){if(!save(next))return false;history.push(strokes);if(history.length>20)history.shift();strokes=next;status.textContent='Stabilo tersimpan';render();return true;}
  function finish(){if(draft){const next={points:draft.points.slice()};draft=null;pointer=null;commit([...strokes,next]);drawPreview();}}
  function discard(){draft=null;pointer=null;drawPreview();}
  function setEnabled(value){finish();enabled=Boolean(value&&ready);down.clear();suppressClickUntil=0;toolbar.hidden=!enabled;viewport.classList.toggle('ink-enabled',enabled);toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label',enabled?'Matikan stabilo':'Aktifkan stabilo');toggle.title=enabled?'Matikan stabilo':'Stabilo';status.textContent='Seret untuk menandai';viewport.setAttribute('aria-label',enabled?'Stabilo aktif. Seret dengan satu jari atau pena di atas ayat. Matikan pensil untuk kembali membaca.':originalLabel);}
  function point(e){const r=stage.getBoundingClientRect();return [Math.round(Math.max(0,Math.min(WIDTH,(e.clientX-r.left)/r.width*WIDTH))*10)/10,Math.round(Math.max(0,Math.min(HEIGHT,(e.clientY-r.top)/r.height*HEIGHT))*10)/10];}
  function append(e){const p=point(e),last=draft.points.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])<2)return;if(draft.points.length>=MAX_POINTS)draft.points=draft.points.filter((_,i)=>i%2===0);draft.points.push(p);}
  // touch-action:none prevents scrolling; only drawing clicks are cancelled.
  const stop=e=>{if(e.type==='click')e.preventDefault();e.stopImmediatePropagation();};
  viewport.addEventListener('pointerdown',e=>{
    if(!enabled||!canDraw()||(e.pointerType==='mouse'&&e.button!==0))return;
    stop(e);down.add(e.pointerId);viewport.setPointerCapture(e.pointerId);
    if(down.size>1){discard();return;}
    const r=host.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)return;
    if(strokes.length>=MAX_STROKES){notify('Stabilo halaman ini penuh. Urungkan atau hapus coretan sebelum menambah lagi.');return;}
    pointer=e.pointerId;draft={points:[point(e)]};drawPreview();
  },{capture:true,signal});
  viewport.addEventListener('pointermove',e=>{if(!down.has(e.pointerId))return;stop(e);if(pointer!==e.pointerId||!draft)return;const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e])append(sample);drawPreview();},{capture:true,signal});
  function end(e){if(!down.has(e.pointerId))return;stop(e);down.delete(e.pointerId);if(pointer===e.pointerId){if(e.type==='pointercancel')discard();else{append(e);finish();}}suppressClickUntil=Date.now()+500;}
  viewport.addEventListener('pointerup',end,{capture:true,signal});viewport.addEventListener('pointercancel',end,{capture:true,signal});
  viewport.addEventListener('click',e=>{if(enabled||Date.now()<suppressClickUntil)stop(e);},{capture:true,signal});
  toggle.addEventListener('click',()=>setEnabled(!enabled),{signal});
  undo.addEventListener('click',()=>{finish();const next=history.at(-1)??strokes.slice(0,-1);if(save(next)){strokes=next;history.pop();status.textContent='Coretan diurungkan';render();}},{signal});
  clear.addEventListener('click',()=>{finish();if(commit([]))status.textContent='Stabilo halaman dihapus';},{signal});
  window.addEventListener('keydown',e=>{if(enabled&&e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();setEnabled(false);toggle.focus();}},{signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();},{signal});
  signal.addEventListener('abort',()=>{finish();layer.remove();},{once:true});
  toggle.disabled=true;render();
  return {setEnabled,setReady(){ready=true;toggle.disabled=false;const r=stage.getBoundingClientRect(),h=host.getBoundingClientRect();rect.setAttribute('x',(h.left-r.left)/r.width*WIDTH);rect.setAttribute('y',(h.top-r.top)/r.height*HEIGHT);rect.setAttribute('width',h.width/r.width*WIDTH);rect.setAttribute('height',h.height/r.height*HEIGHT);}};
}
