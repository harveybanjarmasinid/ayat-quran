// Publisher-derived outlines keep every line and verse in its printed position.
import {mountMushafArtwork,loadMushafSVG} from './mushaf.js';
const PAGE_WIDTH=720,PAGE_HEIGHT=1080,MAX_ZOOM=4;
let session={page:null,zoom:1,x:0,y:0,lastTap:0},clearDisplay=false,cleanup=()=>{},focusVerse=()=>{},pendingTurn=null;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function disposePageViewer(nextPage=null){cleanup();cleanup=()=>{};focusVerse=()=>{};if(pendingTurn?.to!==nextPage)pendingTurn=null;document.body.classList.remove('page-clear');}
export function followPageVerse(node){focusVerse(node)}

export function mountPageViewer(page,onTurn,onReady=()=>{}){
  const viewport=document.querySelector('.mushaf-viewport'),stage=document.querySelector('.mushaf-stage'),shell=document.querySelector('.mode-page');
  if(!viewport||!stage)return;
  const transition=pendingTurn?.to===page?pendingTurn:null;pendingTurn=null;
  viewport.dataset.page=String(page);
  if(session.page!==page)session={page,zoom:1,x:0,y:0,lastTap:0};
  const abort=new AbortController(),signal=abort.signal,pointers=new Map();
  let width=0,height=0,fit=1,frame=0,tapTimer,disposed=false,suppressClickUntil=0,gesture=null,pinch=null,fontReady=false,turning=Boolean(transition);
  const edges=[{offset:1,label:'Halaman berikutnya — ketuk tepi kiri'},{offset:-1,label:'Halaman sebelumnya — ketuk tepi kanan'}].map(({offset,label})=>{
    const button=document.createElement('button');button.type='button';button.className='mushaf-edge';button.dataset.pageTurn=String(offset);button.setAttribute('aria-label',label);button.title=label;viewport.insertBefore(button,stage);return button;
  });
  const host=stage.querySelector('.mushaf-artwork-host'),zoomBar=shell.querySelector('.page-zoom');
  const focusToggle=shell.querySelector('[data-page-focus="toggle"]');
  function syncClearDisplay(){document.body.classList.toggle('page-clear',clearDisplay);focusToggle.setAttribute('aria-pressed',String(clearDisplay));focusToggle.setAttribute('aria-label',clearDisplay?'Keluar layar bersih':'Aktifkan layar bersih');focusToggle.title=clearDisplay?'Tampilkan header':'Layar bersih';}
  function setClearDisplay(value){if(turning)return;clearDisplay=value;session.zoom=1;session.x=0;session.y=0;session.lastTap=0;syncClearDisplay();layout();focusToggle.focus({preventScroll:true});}
  syncClearDisplay();
  focusToggle.addEventListener('click',()=>setClearDisplay(!clearDisplay),{signal});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&clearDisplay&&!document.querySelector('dialog[open]')){e.preventDefault();setClearDisplay(false);}},{signal});
  function transform(){
    const scale=fit*session.zoom,limitX=Math.max(0,(PAGE_WIDTH*scale-width)/2),limitY=Math.max(0,(PAGE_HEIGHT*scale-height)/2);
    session.x=clamp(session.x,-limitX,limitX);session.y=clamp(session.y,-limitY,limitY);
    stage.style.transform=`translate(${(width-PAGE_WIDTH*scale)/2+session.x}px, ${(height-PAGE_HEIGHT*scale)/2+session.y}px) scale(${scale})`;
    viewport.dataset.zoom=session.zoom.toFixed(3);viewport.classList.toggle('zoomed',session.zoom>1.01);
    zoomBar.querySelector('[data-zoom="reset"]').textContent=session.zoom<=1.01?'Pas layar':Math.round(session.zoom*100)+'%';
    zoomBar.querySelector('[data-zoom="out"]').disabled=session.zoom<=1.01;
    zoomBar.querySelector('[data-zoom="in"]').disabled=session.zoom>=MAX_ZOOM;
    const sheetWidth=PAGE_WIDTH*scale,sheetHeight=PAGE_HEIGHT*scale,left=(width-sheetWidth)/2+session.x,top=(height-sheetHeight)/2+session.y,edgeWidth=clamp(sheetWidth*.16,24,72);
    for(const edge of edges){const next=Number(edge.dataset.pageTurn);edge.hidden=session.zoom>1.01||!fontReady;edge.disabled=turning||page+next<1||page+next>604;Object.assign(edge.style,{left:(next===1?left:left+sheetWidth-edgeWidth)+'px',top:top+'px',width:edgeWidth+'px',height:sheetHeight+'px'});}
  }
  function setZoom(value,anchor={x:width/2,y:height/2}){
    const old=fit*session.zoom,tx=(width-PAGE_WIDTH*old)/2+session.x,ty=(height-PAGE_HEIGHT*old)/2+session.y;
    const point={x:(anchor.x-tx)/old,y:(anchor.y-ty)/old};
    session.zoom=clamp(value,1,MAX_ZOOM);const scale=fit*session.zoom;
    session.x=anchor.x-point.x*scale-(width-PAGE_WIDTH*scale)/2;session.y=anchor.y-point.y*scale-(height-PAGE_HEIGHT*scale)/2;
    transform();
  }
  function layout(){
    if(disposed)return;
    // Both display modes retain the same framed sheet and printed proportions.
    const oldFit=fit;width=viewport.clientWidth;height=viewport.clientHeight;
    fit=Math.max(.01,Math.min((width-20)/PAGE_WIDTH,(height-20)/PAGE_HEIGHT));
    if(oldFit&&fontReady){session.x*=fit/oldFit;session.y*=fit/oldFit;}
    transform();
    viewport.dataset.size=width+'x'+height;
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(layout)}
  function finishTurn(){
    turning=false;delete viewport.dataset.turning;viewport.removeAttribute('aria-busy');
    if(!disposed){layout();viewport.dataset.ready='true';if(transition?.restoreFocus)viewport.focus({preventScroll:true});}
  }
  const resize=new ResizeObserver(schedule);resize.observe(viewport);
  mountMushafArtwork(host,page,{signal,prepared:transition?.artwork,onReady:()=>{if(disposed)return;fontReady=true;host.setAttribute('aria-busy','false');layout();onReady();finishTurn();},onError:error=>{
    turning=false;delete viewport.dataset.turning;viewport.removeAttribute('aria-busy');transform();
    host.setAttribute('aria-busy','false');viewport.dataset.error='true';
    const box=document.createElement('div');box.className='mushaf-error';
    const title=document.createElement('strong');title.textContent=navigator.onLine?'Halaman belum dapat dibuka':'Halaman ini belum tersimpan';
    const message=document.createElement('p');message.textContent=navigator.onLine?error.message:'Sambungkan internet untuk membuka lembar ini, atau lanjutkan membaca di mode Per Ayat.';
    const retry=document.createElement('button');retry.className='primary';retry.dataset.action='mushaf-retry';retry.textContent='Coba lagi';
    const fallback=document.createElement('button');fallback.className='pill';fallback.dataset.action='reading-mode';fallback.dataset.mode='ayah';fallback.textContent='Baca Per Ayat';
    box.append(title,message,retry,fallback);host.replaceChildren(box);
  }});
  layout();window.addEventListener('resize',schedule,{signal});window.visualViewport?.addEventListener('resize',schedule,{signal});
  zoomBar.addEventListener('click',e=>{if(turning)return;const action=e.target.closest('[data-zoom]')?.dataset.zoom;if(action)setZoom(action==='reset'?1:session.zoom+(action==='in'?.5:-.5));},{signal});
  const local=e=>{const r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
  // The next mushaf page is to the left: swipe right to reveal it.
  async function turnPage(offset){
    const next=page+offset;if(turning||session.zoom>1.01||next<1||next>604||disposed)return;
    turning=true;clearTimeout(tapTimer);session.lastTap=0;viewport.dataset.turning='true';viewport.setAttribute('aria-busy','true');transform();
    try{
      const artwork=await loadMushafSVG(next,signal);if(disposed)return;
      pendingTurn={to:next,artwork,restoreFocus:viewport.contains(document.activeElement)};onTurn(next);
    }catch(error){if(!disposed&&error.name!=='AbortError'){pendingTurn=null;onTurn(next);}}
  }
  const pinchInfo=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}};
  viewport.addEventListener('pointerdown',e=>{
    if(turning)return;
    if(e.target.closest('.mushaf-error'))return;
    clearTimeout(tapTimer);
    if(e.pointerType==='mouse'&&e.button!==0)return;
    const point=local(e);pointers.set(e.pointerId,point);e.target.setPointerCapture(e.pointerId);
    if(pointers.size===1)gesture={start:point,previous:point,moved:false,multiple:false,zoom:session.zoom};
    if(pointers.size===2){pinch=pinchInfo();gesture.multiple=true;suppressClickUntil=Date.now()+800;}
  },{signal});
  viewport.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId)||!gesture)return;
    const point=local(e);pointers.set(e.pointerId,point);
    if(pointers.size>=2){const next=pinchInfo();if(pinch?.distance){setZoom(session.zoom*next.distance/pinch.distance,pinch);session.x+=next.x-pinch.x;session.y+=next.y-pinch.y;transform();}pinch=next;gesture.moved=true;suppressClickUntil=Date.now()+800;return;}
    if(Math.hypot(point.x-gesture.start.x,point.y-gesture.start.y)>8)gesture.moved=true;
    if(gesture.moved){suppressClickUntil=Date.now()+800;if(session.zoom>1.01){session.x+=point.x-gesture.previous.x;session.y+=point.y-gesture.previous.y;transform();}}
    gesture.previous=point;
  },{signal});
  function pointerEnd(e){
    if(!pointers.has(e.pointerId))return;
    const point=local(e);pointers.delete(e.pointerId);
    if(e.type==='pointercancel'){suppressClickUntil=Date.now()+800;gesture=null;pinch=null;pointers.clear();return;}
    if(pointers.size){if(gesture){gesture.multiple=true;gesture.previous=[...pointers.values()][0];}pinch=null;return;}
    if(gesture){
      const dx=point.x-gesture.start.x,dy=point.y-gesture.start.y;
      if(gesture.multiple||gesture.moved)suppressClickUntil=Date.now()+800;
      if(!gesture.multiple&&gesture.zoom<=1.01&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){session.lastTap=0;turnPage(dx>0?1:-1);}
      else if(!gesture.multiple&&!gesture.moved){const now=Date.now();if(now-session.lastTap<300&&Math.hypot(point.x-(session.tapX||0),point.y-(session.tapY||0))<35){suppressClickUntil=now+800;setZoom(session.zoom>1.01?1:2,point);session.lastTap=0;}else{session.lastTap=now;session.tapX=point.x;session.tapY=point.y;}}
    }
    gesture=null;pinch=null;
  }
  viewport.addEventListener('pointerup',pointerEnd,{signal});viewport.addEventListener('pointercancel',pointerEnd,{signal});
  viewport.addEventListener('click',e=>{
    if(turning||Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();return;}
    const edge=e.target.closest('[data-page-turn]');
    if(edge){e.preventDefault();e.stopImmediatePropagation();if(edge.disabled||session.zoom>1.01)return;clearTimeout(tapTimer);if(e.detail===0)turnPage(Number(edge.dataset.pageTurn));else tapTimer=setTimeout(()=>turnPage(Number(edge.dataset.pageTurn)),310);return;}
    const verse=e.target.closest('.page-ayah');if(verse&&e.detail>0){e.preventDefault();e.stopImmediatePropagation();clearTimeout(tapTimer);tapTimer=setTimeout(()=>{if(!disposed&&verse.isConnected)verse.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));},310);}
  },{capture:true,signal});
  viewport.addEventListener('wheel',e=>{if(turning){e.preventDefault();return;}if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(session.zoom*Math.exp(-e.deltaY*.005),local(e));}else if(session.zoom>1.01){e.preventDefault();session.x-=e.deltaX;session.y-=e.deltaY;transform();}},{passive:false,signal});
  viewport.addEventListener('keydown',e=>{
    if(turning)return;
    if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();
      if(e.key==='0')setZoom(1);else if(e.key==='+'||e.key==='=')setZoom(session.zoom+.5);else if(e.key==='-')setZoom(session.zoom-.5);
      else if(session.zoom>1.01){session.x+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;session.y+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;transform();}
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight')turnPage(e.key==='ArrowLeft'?1:-1);
    }
  },{signal});
  // In zoom mode, following audio pans the page instead of scrolling the body.
  focusVerse=node=>{if(!node||session.zoom<=1.01)return;const r=node.getBoundingClientRect(),v=viewport.getBoundingClientRect();if(r.top<v.top||r.bottom>v.bottom){session.y+=v.top+height/2-(r.top+r.bottom)/2;transform();}};
  cleanup=()=>{disposed=true;abort.abort();resize.disconnect();cancelAnimationFrame(frame);clearTimeout(tapTimer);edges.forEach(edge=>edge.remove());};
}
