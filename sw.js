const CACHE_PREFIX=`ayat-${encodeURIComponent(new URL(self.registration.scope).pathname)}-`;
const CACHE=CACHE_PREFIX+'v35';
const SHELL=['./','./index.html','./style.css','./app.js','./core.js','./storage.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./fonts/AmiriQuran.ttf','./fonts/Jakarta.ttf','./data/quran.json','./data/indonesian.json','./licenses/Indonesian.txt','./licenses/Tanzil.txt','./licenses/Tajweed.txt','./licenses/Audio.txt','./licenses/amiriquran-OFL.txt','./licenses/plusjakartasans-OFL.txt'];
SHELL.push('./reader.js','./reader.css','./fonts/ScheherazadeNew.ttf','./licenses/scheherazade-OFL.txt');
SHELL.push('./page-viewer.js','./page-viewer.css','./page-highlighter.js');
SHELL.push('./app-refinements.css','./data/reciters.json');
SHELL.push('./mushaf.js','./mushaf.css','./mushaf/manifest.json','./install-guide.js','./install-guide.css','./guide/iphone-share.jpg','./guide/iphone-home-screen.jpg','./guide/android-install-menu.jpg','./guide/android-app-option.jpg','./licenses/Quran-SVG-NOTICE.txt','./licenses/Quran-SVG-LICENSE.txt','./licenses/Quran-SVG-PROVENANCE.txt');
SHELL.push('./icons/reading-page.png','./icons/reading-ayah.png','./icons/reading-surah.png');
// A version change must fetch fresh assets, even if the browser's HTTP cache
// still has a previous GitHub Pages response with a valid max-age.
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const u=new URL(event.request.url);
  if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),stored=await cache.match(event.request,{ignoreSearch:true});
    if(stored)return stored;
    try{return await fetch(event.request);}catch{if(event.request.mode==='navigate')return await cache.match('./index.html');return Response.error();}
  })());
});
