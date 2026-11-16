// Publisher-derived outlines keep every line and verse in its printed position.
import {mountMushafArtwork} from './mushaf.js';
const PAGE_WIDTH=720,PAGE_HEIGHT=1080,MAX_ZOOM=4;
let session={page:null,zoom:1,x:0,y:0,lastTap:0},clearDisplay=false,cleanup=()=>{},focusVerse=()=>{};
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function disposePageViewer(){cleanup();cleanup=()=>{};focusVerse=()=>{};document.body.classList.remove('page-clear');}
export function followPageVerse(node){focusVerse(node)}

export function mountPageViewer(page,onTurn,onReady=()=>{}){
  const viewport=document.querySelector('.mushaf-viewport'),stage=document.querySelector('.mushaf-stage'),shell=document.querySelector('.mode-page');
  if(!viewport||!stage)return;
  viewport.dataset.page=String(page);
  if(session.page!==page)session={page,zoom:1,x:0,y:0,lastTap:0};
  const abort=new AbortController(),signal=abort.signal,pointers=new Map();
  let width=0,height=0,pageHeight=PAGE_HEIGHT,fit=1,frame=0,tapTimer,disposed=false,suppressClickUntil=0,gesture=null,pinch=null,fontReady=false;
  const host=stage.querySelector('.mushaf-artwork-host'),zoomBar=shell.querySelector('.page-zoom');
  const focusEnter=shell.querySelector('[data-page-focus="enter"]'),focusExit=shell.querySelector('[data-page-focus="exit"]');
  function syncClearDisplay(){document.body.classList.toggle('page-clear',clearDisplay);focusExit.hidden=!clearDisplay;}
  function setClearDisplay(value){clearDisplay=value;session.zoom=1;session.x=0;session.y=0;session.lastTap=0;syncClearDisplay();layout();(value?focusExit:focusEnter).focus({preventScroll:true});}
  syncClearDisplay();
  focusEnter.addEventListener('click',()=>setClearDisplay(true),{signal});
  focusExit.addEventListener('click',()=>setClearDisplay(false),{signal});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&clearDisplay&&!document.querySelector('dialog[open]')){e.preventDefault();setClearDisplay(false);}},{signal});
  function transform(){
    const scale=fit*session.zoom,limitX=Math.max(0,(PAGE_WIDTH*scale-width)/2),limitY=Math.max(0,(pageHeight*scale-height)/2);
    session.x=clamp(session.x,-limitX,limitX);session.y=clamp(session.y,-limitY,limitY);
    stage.style.transform=`translate(${(width-PAGE_WIDTH*scale)/2+session.x}px, ${(height-pageHeight*scale)/2+session.y}px) scale(${scale})`;
    viewport.dataset.zoom=session.zoom.toFixed(3);viewport.classList.toggle('zoomed',session.zoom>1.01);
    zoomBar.querySelector('[data-zoom="reset"]').textContent=session.zoom<=1.01?'Pas layar':Math.round(session.zoom*100)+'%';
    zoomBar.querySelector('[data-zoom="out"]').disabled=session.zoom<=1.01;
    zoomBar.querySelector('[data-zoom="in"]').disabled=session.zoom>=MAX_ZOOM;
  }
  function setZoom(value,anchor={x:width/2,y:height/2}){
    const old=fit*session.zoom,tx=(width-PAGE_WIDTH*old)/2+session.x,ty=(height-pageHeight*old)/2+session.y;
    const point={x:(anchor.x-tx)/old,y:(anchor.y-ty)/old};
    session.zoom=clamp(value,1,MAX_ZOOM);const scale=fit*session.zoom;
    session.x=anchor.x-point.x*scale-(width-PAGE_WIDTH*scale)/2;session.y=anchor.y-point.y*scale-(height-pageHeight*scale)/2;
    transform();
  }
  function layout(){
    if(disposed)return;
    // Keep the original artwork intact; remove only the app's frame and labels.
    const box=host.querySelector('.mushaf-artwork')?.viewBox.baseVal,gap=clearDisplay?8:20;
    pageHeight=clearDisplay&&box?.width&&box?.height?PAGE_WIDTH*box.height/box.width:PAGE_HEIGHT;
    shell.style.setProperty('--mushaf-height',pageHeight+'px');
    const oldFit=fit;width=viewport.clientWidth;height=viewport.clientHeight;
    fit=Math.max(.01,Math.min((width-gap)/PAGE_WIDTH,(height-gap)/pageHeight));
    if(oldFit&&fontReady){session.x*=fit/oldFit;session.y*=fit/oldFit;}
    transform();
    viewport.dataset.size=width+'x'+height;
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(layout)}
  const resize=new ResizeObserver(schedule);resize.observe(viewport);
  mountMushafArtwork(host,page,{signal,onReady:()=>{if(disposed)return;fontReady=true;host.setAttribute('aria-busy','false');layout();viewport.dataset.ready='true';onReady();},onError:error=>{
    host.setAttribute('aria-busy','false');viewport.dataset.error='true';
    const box=document.createElement('div');box.className='mushaf-error';
    const title=document.createElement('strong');title.textContent=navigator.onLine?'Halaman belum dapat dibuka':'Halaman ini belum tersimpan';
    const message=document.createElement('p');message.textContent=navigator.onLine?error.message:'Sambungkan internet untuk membuka lembar ini, atau lanjutkan membaca di mode Per Ayat.';
    const retry=document.createElement('button');retry.className='primary';retry.dataset.action='mushaf-retry';retry.textContent='Coba lagi';
    const fallback=document.createElement('button');fallback.className='pill';fallback.dataset.action='reading-mode';fallback.dataset.mode='ayah';fallback.textContent='Baca Per Ayat';
    box.append(title,message,retry,fallback);host.replaceChildren(box);
  }});
  layout();window.addEventListener('resize',schedule,{signal});window.visualViewport?.addEventListener('resize',schedule,{signal});
  zoomBar.addEventListener('click',e=>{const action=e.target.closest('[data-zoom]')?.dataset.zoom;if(action)setZoom(action==='reset'?1:session.zoom+(action==='in'?.5:-.5));},{signal});
  const local=e=>{const r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};
  const pinchInfo=()=>{const [a,b]=[...pointers.values()];return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(a.x-b.x,a.y-b.y)}};
  viewport.addEventListener('pointerdown',e=>{
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
      if(!gesture.multiple&&gesture.zoom<=1.01&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){session.lastTap=0;onTurn(page+(dx<0?1:-1));}
      else if(!gesture.multiple&&!gesture.moved){const now=Date.now();if(now-session.lastTap<300&&Math.hypot(point.x-(session.tapX||0),point.y-(session.tapY||0))<35){suppressClickUntil=now+800;setZoom(session.zoom>1.01?1:2,point);session.lastTap=0;}else{session.lastTap=now;session.tapX=point.x;session.tapY=point.y;}}
    }
    gesture=null;pinch=null;
  }
  viewport.addEventListener('pointerup',pointerEnd,{signal});viewport.addEventListener('pointercancel',pointerEnd,{signal});
  viewport.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();return;}const verse=e.target.closest('.page-ayah');if(verse&&e.detail>0){e.preventDefault();e.stopImmediatePropagation();clearTimeout(tapTimer);tapTimer=setTimeout(()=>{if(!disposed&&verse.isConnected)verse.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:0}));},310);}},{capture:true,signal});
  viewport.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();setZoom(session.zoom*Math.exp(-e.deltaY*.005),local(e));}else if(session.zoom>1.01){e.preventDefault();session.x-=e.deltaX;session.y-=e.deltaY;transform();}},{passive:false,signal});
  viewport.addEventListener('keydown',e=>{
    if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();
      if(e.key==='0')setZoom(1);else if(e.key==='+'||e.key==='=')setZoom(session.zoom+.5);else if(e.key==='-')setZoom(session.zoom-.5);
      else if(session.zoom>1.01){session.x+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;session.y+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;transform();}
      else if(e.key==='ArrowLeft'||e.key==='ArrowRight')onTurn(page+(e.key==='ArrowRight'?1:-1));
    }
  },{signal});
  // In zoom mode, following audio pans the page instead of scrolling the body.
  focusVerse=node=>{if(!node||session.zoom<=1.01)return;const r=node.getBoundingClientRect(),v=viewport.getBoundingClientRect();if(r.top<v.top||r.bottom>v.bottom){session.y+=v.top+height/2-(r.top+r.bottom)/2;transform();}};
  cleanup=()=>{disposed=true;abort.abort();resize.disconnect();cancelAnimationFrame(frame);clearTimeout(tapTimer)};
}
