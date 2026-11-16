// Fixed publisher-derived artwork. This module never typesets Quranic text.
let manifestPromise,cachePromise,cachedPages=new Set(),running=false,controller=null,lastError='';
const scope=encodeURIComponent(new URL('./',import.meta.url).pathname);
export const getMushafManifest=()=>manifestPromise??=fetch(new URL('./mushaf/manifest.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Data mushaf belum tersedia.');return r.json();}).catch(e=>{manifestPromise=null;throw e});
const assetURL=p=>new URL('./mushaf/'+p.file,import.meta.url).href;
async function cache(){
 if(!globalThis.caches)return null;
 return cachePromise??=(async()=>{const m=await getMushafManifest(),c=await caches.open('mushaf-'+scope+'-'+m.commit);for(const r of await c.keys()){const n=Number(new URL(r.url).pathname.match(/\/(\d+)\.svg\.gz$/)?.[1]);if(n>=1&&n<=604)cachedPages.add(n);}return c;})().catch(()=>{cachePromise=null;return null});
}
const changed=()=>dispatchEvent(new CustomEvent('mushaf-cache-change'));
async function checkedBytes(response,p){
 if(!response?.ok)throw Error('Halaman mushaf belum tersedia.');
 const bytes=await response.arrayBuffer();
 const sum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 if(sum!==p.sha256)throw Error('Berkas halaman tidak cocok dengan sumber. Coba lagi saat online.');
 return bytes;
}
async function pageBytes(p,signal,requireStorage=false){
 const store=await cache(),url=assetURL(p),saved=await store?.match(url);
 if(saved){try{return await checkedBytes(saved,p)}catch{await store.delete(url);cachedPages.delete(p.page);}}
 const response=await fetch(url,{signal}),bytes=await checkedBytes(response,p);
 try{if(!store)throw Error('Penyimpanan offline tidak tersedia.');await store.put(url,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));cachedPages.add(p.page);changed();}catch(e){if(requireStorage)throw Error('Penyimpanan penuh atau tidak tersedia. Bebaskan ruang lalu lanjutkan unduhan.');}
 return bytes;
}
export async function loadMushafSVG(page,signal){
 const m=await getMushafManifest(),p=m.pages[page-1];if(!p)throw Error('Halaman tidak ditemukan.');
 if(!globalThis.DecompressionStream)throw Error('Perbarui Safari atau Chrome untuk membuka halaman mushaf. Mode Per Ayat tetap tersedia.');
 const bytes=await pageBytes(p,signal);
 const svg=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
 return {svg,meta:p};
}
export async function mushafStatus(){const m=await getMushafManifest();await cache();return {count:cachedPages.size,total:m.pages.length,bytes:m.bytes,running,error:lastError};}
export function cancelMushafDownload(){controller?.abort();}
export async function downloadMushaf(){
 if(running)return;running=true;lastError='';controller=new AbortController();changed();
 const task=controller;
 try{const m=await getMushafManifest();await cache();if(!globalThis.caches)throw Error('Penyimpanan offline tidak tersedia.');
  navigator.storage?.persist?.().catch(()=>{});let index=0;
  const jobs=await Promise.allSettled(Array.from({length:3},async()=>{try{while(index<m.pages.length){const p=m.pages[index++];if(task.signal.aborted)throw new DOMException('Dibatalkan','AbortError');if(!cachedPages.has(p.page))await pageBytes(p,task.signal,true);}}catch(e){task.abort();throw e;}}));
  const failure=jobs.find(j=>j.status==='rejected'&&j.reason.name!=='AbortError')||jobs.find(j=>j.status==='rejected');if(failure)throw failure.reason;
 }catch(e){if(e.name!=='AbortError'){lastError=e.message||'Unduhan terhenti. Sambungkan internet lalu lanjutkan.';controller.abort();}}
 finally{running=false;controller=null;changed();}
}

export async function mountMushafArtwork(host,page,{signal,onReady,onError}){
 try{
  const {svg:source,meta}=await loadMushafSVG(page,signal);if(signal.aborted||!host.isConnected)return;
  const doc=new DOMParser().parseFromString(source,'image/svg+xml');
  if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Halaman mushaf tidak valid.');
  // The audited resource uses only SVG outlines. Reject executable/external content.
  for(const node of doc.querySelectorAll('*')){
   if(!['svg','g','path'].includes(node.localName))throw Error('Elemen mushaf tidak dikenali.');
   for(const a of node.attributes)if(/^on/i.test(a.name)||/href|src/i.test(a.name)||/url\(/i.test(a.value))throw Error('Atribut mushaf tidak dikenali.');
  }
  const svg=document.importNode(doc.documentElement,true);svg.classList.add('mushaf-artwork');svg.setAttribute('aria-label','Mushaf Madinah, halaman '+page);svg.setAttribute('role','group');
  const hits=[...svg.querySelectorAll('.ayahPolygon')];
  if(hits.length!==meta.verses.length)throw Error('Pemetaan ayat tidak lengkap.');
  hits.forEach((node,i)=>{const v=meta.verses[i];if(Number(node.getAttribute('surah'))!==v.surah||Number(node.getAttribute('ayah'))!==v.ayah)throw Error('Pemetaan ayat tidak cocok.');
   node.classList.add('page-ayah');node.id='page-ayah-'+v.surah+'-'+v.ayah;node.dataset.action='select-ayah';node.dataset.surah=v.surah;node.dataset.ayah=v.ayah;node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label','Surah '+v.surah+', ayat '+v.ayah);
  });
  host.replaceChildren(svg);
  // Trim unused source canvas, preserving every original path and its coordinates.
  const b=svg.getBBox();if(!b.width||!b.height)throw Error('Halaman kosong.');
  const pad=3;svg.setAttribute('viewBox',`${b.x-pad} ${b.y-pad} ${b.width+pad*2} ${b.height+pad*2}`);
  svg.dataset.sourceViewbox=doc.documentElement.getAttribute('viewBox');svg.dataset.svgSha256=meta.svgSha256;
  onReady(svg);
 }catch(e){if(!signal.aborted&&host.isConnected)onError(e);}
}
